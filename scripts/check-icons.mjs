/**
 * Fails the build when a JSX file references an icon class the bundled icon
 * fonts do not define.
 *
 * WHY: an undefined icon class is invisible. The element still occupies its
 * slot but renders zero-width, so you get an empty box rather than a broken
 * image, nothing logs, and nothing fails. Two shipped that way - the dashboard
 * asked for ri-money-rupee-circle-line and the login logs for
 * ri-prohibited-line, neither of which existed in the pinned remixicon 2.5.0.
 * Both reached production and were spotted by eye.
 *
 * This compares every statically-resolvable icon class in src/ against the
 * classes the icon stylesheets actually declare, so a typo or an icon that only
 * exists in a newer font release fails CI instead of the user's dashboard.
 *
 * Usage: node scripts/check-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ICON_STYLESHEETS = [
  "src/assets/scss/plugins/icons/_remixicon.scss",
  "src/assets/scss/plugins/icons/_boxicons.scss",
  "src/assets/scss/plugins/icons/_materialdesignicons.scss",
];


/**
 * Sizing/utility classes that share the icon prefix but declare no glyph, so
 * they never appear with a ::before rule.
 */
const UTILITY = /^(ri|bx|mdi)-(\d+x|fw|lg|sm|md|xs|xxs|xl|xss|rotate-\d+|flip-\w+|spin|tada|border|pull-\w+)$/;

const collectDefined = () => {
  const defined = new Set();
  for (const file of ICON_STYLESHEETS) {
    if (!fs.existsSync(file)) {
      console.error(`check-icons: stylesheet missing: ${file}`);
      process.exit(1);
    }
    const css = fs.readFileSync(file, "utf8");
    // remixicon/boxicons use :before, materialdesignicons uses ::before.
    for (const m of css.matchAll(/\.((?:ri|bx|bxs|bxl|mdi)-[a-z0-9-]+)::?before/g)) {
      defined.add(m[1]);
    }
  }
  return defined;
};

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

const defined = collectDefined();
// Literal regex, not new RegExp(`...`): inside a template literal a word-boundary
// escape is parsed as a backspace character, which silently matched nothing.
// Lookbehind avoids needing an escape at all.
const classPattern =
  /(?<![a-zA-Z0-9-])((?:ri|bx|bxs|bxl|mdi)-[a-z0-9-]+)/g;

const unknown = new Map();   // class -> [ "file:line", ... ]
let dynamic = 0;
let checked = 0;

for (const file of walk("src")) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(classPattern)) {
      const cls = m[1];
      // `ri-eye${showPassword ? "" : "-off"}-line` - the real class is assembled
      // at runtime, so the static prefix is not a class and must not be flagged.
      if (line[m.index + cls.length] === "$") { dynamic++; continue; }
      if (UTILITY.test(cls)) continue;
      checked++;
      if (defined.has(cls)) continue;
      const where = file.split(path.sep).join("/") + ":" + (i + 1);
      if (!unknown.has(cls)) unknown.set(cls, []);
      if (!unknown.get(cls).includes(where)) unknown.get(cls).push(where);
    }
  });
}

console.log(
  `check-icons: ${defined.size} classes defined by the icon fonts; ` +
  `${checked} static references checked (${dynamic} assembled at runtime, skipped).`,
);

if (unknown.size === 0) {
  console.log("check-icons: OK - every icon class resolves.");
  process.exit(0);
}

console.error(`\ncheck-icons: ${unknown.size} icon class(es) are not defined by any bundled font.`);
console.error("These render as an empty, zero-width element - no error, just a blank slot.\n");
for (const [cls, where] of [...unknown].sort()) {
  console.error(`  ${cls}`);
  for (const w of where.slice(0, 4)) console.error(`      ${w}`);
  if (where.length > 4) console.error(`      ...and ${where.length - 4} more`);
}
console.error("\nFix the class name, or upgrade the icon font if the icon only exists in a newer release.");
process.exit(1);

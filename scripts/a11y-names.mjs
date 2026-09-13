#!/usr/bin/env node
/**
 * Static accessible-name audit for the admin panel's JSX.
 *
 * Mirrors the rules the browser gate (scripts/e2e/gate.mjs) applies at runtime,
 * but statically, because the gate only sweeps the handful of routes it is
 * handed — it has been green while most of the panel went unaudited.
 *
 * The one rule that matters most: `placeholder` is NOT an accessible name.
 * Screen readers announce it inconsistently and it disappears the moment the
 * user types, so the gate rejects it and so does this.
 *
 * Parser note: @babel/parser and @babel/traverse are not direct devDependencies
 * — they arrive via @vitejs/plugin-react. A regex pass was tried first and was
 * unusable: multi-line JSX attributes and nested ternaries made it report both
 * false positives and false negatives, which is exactly what "measured, not
 * estimated" rules out.
 *
 * Usage:
 *   node scripts/a11y-names.mjs                 # in-scope paths only
 *   node scripts/a11y-names.mjs --all           # every JSX file under src/
 *   node scripts/a11y-names.mjs --json          # machine-readable
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default ?? _traverse;

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

const args = process.argv.slice(2);
const SCAN_ALL = args.includes("--all");
const AS_JSON = args.includes("--json");

/**
 * Scope of this pass. Website/ is owned by a separate effort and Routes/ is
 * routing config with no controls in it; both are excluded so two concurrent
 * passes cannot collide in the same files.
 */
const IN_SCOPE = [join("src", "pages"), join("src", "Components")];
const OUT_OF_SCOPE = [join("src", "pages", "Website")];

// Tags that put a real form control in the DOM. `Select` covers both
// react-select and reactstrap; both end up rendering an <input>/<select> the
// browser gate would flag.
const CONTROL_TAGS = new Set([
  "input",
  "select",
  "textarea",
  "Input",
  "Select",
  "AsyncSelect",
  "CreatableSelect",
  "AsyncCreatableSelect",
]);

const BUTTON_TAGS = new Set(["button", "Button", "DropdownToggle"]);

// -------------------------------------------------------------- file walking

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, out);
    } else if (/\.(jsx|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function inScope(file) {
  const rel = relative(ROOT, file);
  if (OUT_OF_SCOPE.some((p) => rel.startsWith(p + sep))) return false;
  if (SCAN_ALL) return true;
  return IN_SCOPE.some((p) => rel.startsWith(p + sep));
}

// ------------------------------------------------------------- attr helpers

const nameOf = (node) => {
  const n = node.name;
  if (!n) return "";
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") return `${n.object.name}.${n.property.name}`;
  return "";
};

function attr(el, attrName) {
  for (const a of el.openingElement.attributes) {
    if (a.type === "JSXAttribute" && a.name.name === attrName) return a;
  }
  return null;
}

const hasSpread = (el) =>
  el.openingElement.attributes.some((a) => a.type === "JSXSpreadAttribute");

/**
 * The attribute's value as a comparable string. Expressions are keyed by their
 * source text so `id={`x-${i}`}` and `htmlFor={`x-${i}`}` still match.
 */
function attrValue(a, code) {
  if (!a || a.value == null) return a ? "true" : null;
  if (a.value.type === "StringLiteral") return a.value.value;
  if (a.value.type === "JSXExpressionContainer") {
    const e = a.value.expression;
    if (e.type === "StringLiteral") return e.value;
    return `@expr:${code.slice(e.start, e.end).replace(/\s+/g, "")}`;
  }
  return null;
}

/** Truthy if the attribute carries something that could be a name. */
function nonEmpty(a, code) {
  const v = attrValue(a, code);
  return typeof v === "string" && v.trim() !== "" && v !== "true";
}

/** Any literal text (or interpolation) inside an element's children. */
function hasText(el) {
  let found = false;
  const visit = (n) => {
    if (found || !n) return;
    for (const c of n.children ?? []) {
      if (c.type === "JSXText" && c.value.trim()) found = true;
      else if (c.type === "JSXExpressionContainer") {
        // {t("Name")} / {label} / {"Save"} all resolve to text at runtime.
        if (c.expression.type !== "JSXEmptyExpression") found = true;
      } else if (c.type === "JSXElement") {
        const tag = nameOf(c.openingElement);
        // An icon element contributes no text; an <img alt> does.
        if (tag === "img") {
          const alt = attr(c, "alt");
          if (alt && nonEmpty(alt, "")) found = true;
        } else if (tag !== "i" && tag !== "svg") {
          visit(c);
        }
      }
      if (found) return;
    }
  };
  visit(el);
  return found;
}

// ------------------------------------------------------------------ auditing

function auditFile(file) {
  const code = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "classProperties", "objectRestSpread", "optionalChaining"],
    });
  } catch (err) {
    return { parseError: `${relative(ROOT, file)}: ${err.message}`, findings: [] };
  }

  // Pass 1: every label target declared anywhere in the file, and whether that
  // label actually carries text (an empty <Label for="x" /> names nothing).
  const labelTargets = new Set();
  traverse(ast, {
    JSXElement(path) {
      const tag = nameOf(path.node.openingElement);
      if (tag !== "label" && tag !== "Label") return;
      const target = attr(path.node, "htmlFor") || attr(path.node, "for");
      if (!target) return;
      const v = attrValue(target, code);
      if (v && hasText(path.node)) labelTargets.add(v);
    },
  });

  // Pass 2: ids of elements that carry text, for aria-labelledby resolution.
  const textIds = new Set();
  traverse(ast, {
    JSXElement(path) {
      const id = attr(path.node, "id");
      if (id && hasText(path.node)) {
        const v = attrValue(id, code);
        if (v) textIds.add(v);
      }
    },
  });

  const findings = [];
  const rel = relative(ROOT, file);

  traverse(ast, {
    JSXElement(path) {
      const el = path.node;
      const tag = nameOf(el.openingElement);
      const line = el.loc.start.line;

      const isControl = CONTROL_TAGS.has(tag);
      const isButton = BUTTON_TAGS.has(tag);
      if (!isControl && !isButton) return;

      // Spread props can carry id/aria-label from a parent (formik getFieldProps,
      // register(), ...). Unknowable statically; not counted either way.
      if (hasSpread(el)) return;

      const type = attrValue(attr(el, "type"), code);
      if (isControl && (type === "hidden" || type === "submit" || type === "reset")) {
        // submit/reset are named by their value, and are handled as buttons.
        if (type === "hidden") return;
      }

      const ariaHidden = attrValue(attr(el, "aria-hidden"), code);
      if (ariaHidden === "true") return;

      const byAria = nonEmpty(attr(el, "aria-label"), code);
      const byTitleAttr = nonEmpty(attr(el, "title"), code);
      const lbId = attrValue(attr(el, "aria-labelledby"), code);
      const byLabelledBy = lbId != null && (textIds.has(lbId) || lbId.startsWith("@expr:"));

      if (byAria || byTitleAttr || byLabelledBy) return;

      if (isControl) {
        // reactstrap <Input type="select"> is a <select>; its <option>s are not
        // a name. react-select names its inner input via inputId, not id.
        const idAttr = attr(el, "inputId") || attr(el, "id");
        const idVal = attrValue(idAttr, code);
        if (idVal && labelTargets.has(idVal)) return;

        // Wrapped directly by a <label> that has its own text.
        let wrapped = false;
        for (let p = path.parentPath; p; p = p.parentPath) {
          if (p.node.type !== "JSXElement") continue;
          const t = nameOf(p.node.openingElement);
          if (t === "label" || t === "Label") {
            wrapped = hasText(p.node);
            break;
          }
        }
        if (wrapped) return;

        findings.push({
          file: rel,
          line,
          kind: "control",
          tag,
          detail: `<${tag}${type ? ` type=${type}` : ""}>`,
        });
        return;
      }

      // Buttons: text content, an <img alt>, or a value attribute names them.
      if (hasText(el)) return;
      if (nonEmpty(attr(el, "value"), code)) return;
      findings.push({ file: rel, line, kind: "button", tag, detail: `<${tag}>` });
    },
  });

  return { parseError: null, findings };
}

// ---------------------------------------------------------------------- main

const files = walk(SRC).filter(inScope).sort();
const all = [];
const parseErrors = [];

for (const f of files) {
  const { parseError, findings } = auditFile(f);
  if (parseError) parseErrors.push(parseError);
  all.push(...findings);
}

if (AS_JSON) {
  console.log(JSON.stringify({ files: files.length, findings: all, parseErrors }, null, 2));
} else {
  const byFile = new Map();
  for (const f of all) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, items] of [...byFile].sort()) {
    console.log(`\n${file}  (${items.length})`);
    for (const i of items.sort((a, b) => a.line - b.line)) {
      console.log(`  ${file}:${i.line}  ${i.kind.padEnd(7)} ${i.detail}`);
    }
  }
  const controls = all.filter((f) => f.kind === "control").length;
  const buttons = all.filter((f) => f.kind === "button").length;
  console.log(`\n${"-".repeat(60)}`);
  console.log(`scope       : ${SCAN_ALL ? "ALL of src/" : IN_SCOPE.join(", ")} (minus ${OUT_OF_SCOPE.join(", ")})`);
  console.log(`files       : ${files.length}`);
  console.log(`unnamed     : ${all.length}  (${controls} form controls, ${buttons} buttons)`);
  console.log(`affected    : ${byFile.size} files`);
  if (parseErrors.length) {
    console.log(`parse errors: ${parseErrors.length}`);
    for (const e of parseErrors) console.log(`  ${e}`);
  }
}

process.exit(all.length === 0 ? 0 : 1);

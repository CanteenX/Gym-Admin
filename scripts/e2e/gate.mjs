/**
 * Browser verification gate.
 *
 * Every phase in docs/plan.md ends with "code review + browser testing", and
 * this is the browser half. It is a GATE, not a report: every check either
 * passes or sets a non-zero exit code.
 *
 * That distinction is the whole reason this file exists. The predecessor of
 * this harness was ~30 throwaway scripts that printed a tick or a cross and
 * always exited 0, so CI could never have used them and a regression could
 * only be caught by a human reading the log. Anything added here must be able
 * to fail, or it is decoration - and two checks in the first version of THIS
 * file were already decoration, so the bar is easy to miss:
 *
 *   - the overflow check was gated on documentElement.scrollWidth, which
 *     `html, body { overflow-x: hidden !important }` in themes.scss pins to
 *     clientWidth forever. It could never fail. See OVERFLOW.
 *   - the SPA-mount phase collected page errors and threw the buffer away.
 *
 * Run:
 *   node scripts/e2e/gate.mjs --base https://mid-city-gym.vercel.app
 *   node scripts/e2e/gate.mjs --base http://localhost:3000 --out .e2e-out
 *
 * Credentials come from the environment, never from a flag (a flag lands in
 * shell history and CI logs):
 *   SA_EMAIL, SA_PASS
 *
 * Uses the installed Chrome via `channel`, so no ~400MB browser download.
 * Override with --channel msedge, or --channel "" to use bundled Chromium.
 *
 * IMPORTANT: the API locks an account for 24h after 3 failed logins, so this
 * script deliberately does NOT retry a failed login.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const BASE = arg("base", "https://mid-city-gym.vercel.app").replace(/\/+$/, "");
const ADMIN = `${BASE}/admin`;
const OUT = path.resolve(arg("out", ".e2e-out"));
const CHANNEL = arg("channel", "chrome");
const EMAIL = process.env.SA_EMAIL;
const PASS = process.env.SA_PASS;

/**
 * Contrast is measured but REPORT-ONLY by default, and that is a deliberate
 * hole in the gate: the Velzon template ships many low-contrast muted greys
 * that predate this project, so enforcing repo-wide would fail every run for
 * reasons no phase introduced. Pass --enforce-contrast to make it bite; read
 * the notes otherwise to confirm a phase added nothing new.
 */
const ENFORCE_CONTRAST = has("enforce-contrast");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/**
 * Admin routes worth sweeping. One list, so checks cannot drift apart.
 *
 * `--routes a,b,c` appends to this rather than replacing it, so a phase can
 * gate its own new screens without anyone editing (and accidentally shrinking)
 * the shared list.
 */
const ADMIN_ROUTES = [
  "dashboard",
  "members",
  "trainers",
  "membership-plans",
  "transactions",
  "employee",
  "employee-roles",
  "cash-flow",
  "profile",
  ...arg("routes", "")
    .split(",")
    .map((r) => r.trim().replace(/^\/+/, ""))
    .filter(Boolean),
];

// ------------------------------------------------------------------ results

const failures = [];
const notes = [];
const fail = (what, detail) => {
  console.log(`  FAIL  ${what}: ${detail}`);
  failures.push(`${what}: ${detail}`);
};
const ok = (what, detail = "") =>
  console.log(`  ok    ${what}${detail ? ` (${detail})` : ""}`);
const note = (what, detail) => notes.push(`${what}: ${detail}`);

// ------------------------------------------------------------ page watchers

/**
 * Every page event is tagged with the route that was active when it FIRED, and
 * nothing is judged until the end of the run.
 *
 * The obvious design - drain the buffer once per route - has a hole: the drain
 * happens as soon as the page settles, but the accessibility queries and the
 * full-page screenshot run after it, and the loop idles between routes. Any
 * console error or late response in that window lands in the next route's
 * bucket and gets blamed on the wrong page. Tagging at capture time removes
 * the window entirely and cannot lose an event.
 */
const events = [];
const where = { label: "startup" };

/**
 * Severity split, and the reasoning matters because getting it wrong makes the
 * gate useless in one of two ways.
 *
 * FATAL - cannot be correct behaviour:
 *   pageerror       an uncaught exception is always a defect
 *   5xx             the server failing is always a defect
 *   requestfailed   a request that never completed (aborts excluded)
 *
 * SOFT - routinely correct, so failing on these would make the gate red for
 * right behaviour and nobody would trust it again:
 *   401/403         the admin panel probes authenticated endpoints before
 *                   login; `/companies/getCompanyDetails` answers 401 to an
 *                   anonymous visitor by design. `checkPermission` also 403s
 *                   when a MenuMaster row is unseeded - a real configuration
 *                   problem, but not a code regression and not this gate's job.
 *   404             an optional asset, or the known soft-404 behaviour.
 *
 * `src/api/index.jsx` console.errors on 403 and on 5xx, so those arrive twice
 * (once from the console listener, once from the response listener). The 403
 * echo is filtered to keep the soft bucket honest; the 5xx echo is left alone
 * because it is fatal either way.
 */
/**
 * Dropped entirely, not merely downgraded: the browser emits its own
 * console.error for every failed request ("Failed to load resource: the server
 * responded with a status of 401"), which the `response` listener below already
 * records WITH the status code and therefore with the correct severity. Keeping
 * both counts the same event twice and, worse, the console copy has no status
 * to judge by - so a routine anonymous 401 on /auth/verify-session arrives
 * looking fatal.
 */
const IGNORE_CONSOLE = [/^Failed to load resource\b/];

/** Downgraded to a note: the app's own interceptor echo of a 403. */
const SOFT_CONSOLE = [/^Access denied$/];

function watch(page) {
  const push = (kind, fatal, msg) =>
    events.push({ label: where.label, kind, fatal, msg });

  page.on("pageerror", (e) => push("pageerror", true, e.message));

  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text().trim();
    if (IGNORE_CONSOLE.some((re) => re.test(text))) return;
    const soft = SOFT_CONSOLE.some((re) => re.test(text));
    push("console.error", !soft, text);
  });

  page.on("requestfailed", (r) => {
    // Aborted requests are normal during client-side navigation.
    const why = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED/i.test(why)) return;
    push("requestfailed", true, `${r.url()} ${why}`);
  });

  page.on("response", (r) => {
    const s = r.status();
    if (s < 400) return;
    push(`http ${s}`, s >= 500, `${s} ${r.url()}`);
  });
}

// -------------------------------------------------------- in-page collectors

/** Form controls with no accessible name. placeholder is NOT a valid name. */
const UNNAMED_CONTROLS = () => {
  const out = [];
  const sel = "input:not([type=hidden]), select, textarea";
  for (const el of document.querySelectorAll(sel)) {
    if (el.offsetParent === null) continue;
    if (el.closest("[aria-hidden=true]")) continue;

    const id = el.getAttribute("id");
    const byFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
    const byWrap = el.closest("label");
    const byAria = (el.getAttribute("aria-label") || "").trim();
    // An aria-labelledby target that exists but is empty names nothing.
    const lbId = el.getAttribute("aria-labelledby");
    const byLbl = lbId && (document.getElementById(lbId)?.textContent || "").trim();
    // title is a last-resort mechanism per HTML-AAM, but it is a name.
    const byTitle = (el.getAttribute("title") || "").trim();
    // A radio/checkbox group can be named by its fieldset legend.
    const byLegend =
      (el.type === "radio" || el.type === "checkbox") &&
      (el.closest("fieldset")?.querySelector("legend")?.textContent || "").trim();

    const named =
      (byFor && byFor.textContent.trim()) ||
      (byWrap && byWrap.textContent.trim()) ||
      byAria ||
      byLbl ||
      byTitle ||
      byLegend;

    if (!named) {
      out.push(
        `<${el.tagName.toLowerCase()}${el.type ? ` type=${el.type}` : ""}${
          el.name ? ` name=${el.name}` : ""
        }>`,
      );
    }
  }
  return out;
};

/**
 * Buttons with no accessible name, including icon-only ones.
 *
 * Deliberately does not exclude buttons containing <i>/<svg>/<img>: an
 * icon-only button with no aria-label is exactly the case this must catch, and
 * excluding them is how the previous version of this check reported zero
 * while real nameless icon buttons shipped.
 */
const UNNAMED_BUTTONS = () => {
  const out = [];
  const sel = "button, a[role=button], [role=button], input[type=submit]";
  for (const el of document.querySelectorAll(sel)) {
    if (el.offsetParent === null) continue;
    if (el.closest("[aria-hidden=true]")) continue;

    const lbId = el.getAttribute("aria-labelledby");
    const name =
      (el.textContent || "").trim() ||
      (el.getAttribute("aria-label") || "").trim() ||
      (el.getAttribute("title") || "").trim() ||
      (lbId && (document.getElementById(lbId)?.textContent || "").trim()) ||
      (el.value || "").trim() ||
      (el.querySelector("img[alt]:not([alt=''])")?.alt || "").trim();

    if (!name) out.push(el.outerHTML.slice(0, 120));
  }
  return out;
};

/** Icon glyphs the font does not define render zero-width: no error, no log. */
const EMPTY_ICONS = () => {
  const out = [];
  const sel = 'i[class*="ri-"], i[class*="bx-"], i[class*="mdi-"]';
  for (const el of document.querySelectorAll(sel)) {
    if (el.offsetParent === null) continue;
    if (el.getBoundingClientRect().width >= 1) continue;
    out.push([...el.classList].find((c) => /^(ri|bx|mdi)-/.test(c)) || "?");
  }
  return [...new Set(out)];
};

/**
 * Content pushed past the right edge of the viewport.
 *
 * Deliberately NOT "does the page scroll sideways". `themes.scss` sets
 * `html, body { overflow-x: hidden !important }`, which pins
 * documentElement.scrollWidth to clientWidth - so a check gated on that can
 * never fail, and the first version of this function silently passed on every
 * admin page while reporting "no overflow". Clipping does not change layout
 * geometry, so getBoundingClientRect still reveals the truth.
 *
 * That rule also makes overflow WORSE than a scrollbar rather than better: the
 * content is not merely awkward to reach, it is cut off with no way to scroll
 * to it.
 *
 * An element inside a deliberately scrollable ancestor (a wide table in
 * `.table-responsive`, which is `overflow-x: auto`) is fine and must not be
 * reported - only elements whose sole clipper is the page itself.
 */
const OVERFLOW = () => {
  const vw = document.documentElement.clientWidth;
  const TOL = 4; // sub-pixel rounding otherwise reports false positives
  const offenders = [];

  for (const el of document.querySelectorAll("body *")) {
    if (el.offsetParent === null) continue;
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    if (b.right <= vw + TOL) continue;

    let contained = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") {
        contained = true;
        break;
      }
    }
    if (contained) continue;

    offenders.push({
      right: Math.round(b.right),
      width: Math.round(b.width),
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 60),
    });
  }

  if (!offenders.length) return null;
  // The furthest-right element is usually the cause rather than a child that
  // merely inherits the problem.
  offenders.sort((a, b) => b.right - a.right);
  return { vw, count: offenders.length, worst: offenders[0] };
};

/** WCAG 2.1 relative luminance and contrast ratio over real text nodes. */
const LOW_CONTRAST = () => {
  const lum = (r, g, b) => {
    const c = [r, g, b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const parse = (s) => {
    const m = (s || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  /**
   * First opaque background walking up - the effective one. Includes <html>:
   * a page that paints its ground on <html> rather than <body> would otherwise
   * be measured against an assumed white.
   */
  const effectiveBg = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.95) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length < 2) continue;
    const el = node.parentElement;
    if (!el || el.offsetParent === null) continue;
    if (el.closest("[aria-hidden=true]")) continue;

    const st = getComputedStyle(el);
    const fg = parse(st.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = effectiveBg(el);
    const L1 = lum(fg.r, fg.g, fg.b);
    const L2 = lum(bg.r, bg.g, bg.b);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

    const px = parseFloat(st.fontSize);
    const bold = parseInt(st.fontWeight, 10) >= 700;
    // WCAG AA: large text (>=24px, or >=18.66px bold) needs only 3:1.
    const threshold = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    if (ratio >= threshold) continue;

    const key = `${st.color}|${st.fontSize}|${text.slice(0, 24)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: text.slice(0, 40),
      ratio: Math.round(ratio * 100) / 100,
      needs: threshold,
      color: st.color,
    });
  }
  return out.slice(0, 25);
};

/** The React.lazy Suspense fallback, so checks do not read a spinner. */
const STILL_LOADING = () =>
  [...document.querySelectorAll(".spinner-border")].some(
    (el) => el.offsetParent !== null,
  );

// --------------------------------------------------------------------- main

/**
 * Navigates and waits for the route to actually be ready.
 *
 * networkidle alone is not readiness here: routes are React.lazy, so the shell
 * settles while the real content - and therefore the whole accessibility
 * surface being measured - is still a spinner. Measuring then reports zero
 * unnamed controls because nothing has mounted, not because the page is clean.
 */
async function land(page, label, url) {
  where.label = label;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (res && res.status() >= 400) fail(`${label} status`, `HTTP ${res.status()}`);
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});

  // Passed as a real function, NOT a string: waitForFunction evaluates a
  // string as an expression, so a stringified arrow function yields a truthy
  // function object and the wait resolves instantly - another check that
  // cannot fail.
  const spinning = await page
    .waitForFunction(
      () =>
        ![...document.querySelectorAll(".spinner-border")].some(
          (el) => el.offsetParent !== null,
        ),
      { timeout: 30000, polling: 250 },
    )
    .then(() => false)
    .catch(() => true);
  if (spinning) fail(`${label} readiness`, "route spinner still visible after 30s");

  await page.evaluate(() => document.fonts.ready).catch(() => {});
  return res;
}

async function sweep(page, label, url, { mobile = false } = {}) {
  await land(page, label, url);

  const controls = await page.evaluate(UNNAMED_CONTROLS);
  if (controls.length)
    fail(`${label} unnamed form controls`, `${controls.length} -> ${controls.slice(0, 4).join(", ")}`);

  const buttons = await page.evaluate(UNNAMED_BUTTONS);
  if (buttons.length) fail(`${label} nameless buttons`, `${buttons.length} -> ${buttons[0]}`);

  const icons = await page.evaluate(EMPTY_ICONS);
  if (icons.length) fail(`${label} zero-width icons`, icons.join(", "));

  if (mobile) {
    const of = await page.evaluate(OVERFLOW);
    if (of)
      fail(
        `${label} content clipped past viewport @390`,
        `${of.count} element(s) beyond ${of.vw}px; furthest <${of.worst.tag} class="${of.worst.cls}"> reaches ${of.worst.right}px (width ${of.worst.width}px)`,
      );
    else ok(`${label} nothing clipped @390`);
  }

  const low = await page.evaluate(LOW_CONTRAST);
  if (low.length) {
    const msg =
      `${low.length} -> ` +
      low.slice(0, 3).map((x) => `"${x.text}" ${x.ratio}:1 needs ${x.needs}`).join(" | ");
    if (ENFORCE_CONTRAST) fail(`${label} low contrast`, msg);
    else note(`${label} low contrast (not enforced)`, msg);
  }

  mkdirSync(OUT, { recursive: true });
  const safe = label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  await page.screenshot({
    path: path.join(OUT, `${safe}-${mobile ? "390" : "1440"}.png`),
    fullPage: true,
  });
  ok(`${label} swept`);
}

async function run(browser) {
  // ---- 1. Public marketing pages, desktop then mobile --------------------
  for (const vp of [DESKTOP, MOBILE]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    watch(page);
    for (const [label, slug] of [
      ["marketing home", "/"],
      ["marketing contact", "/contact"],
      ["marketing programs", "/programs"],
    ]) {
      console.log(`\n[${vp.width}px] ${label}`);
      await sweep(page, label, `${BASE}${slug}`, { mobile: vp === MOBILE });
    }
    await ctx.close();
  }

  // ---- 2. /admin and /admin/ must BOTH mount the SPA ---------------------
  // Both forms are checked because the trailing-slash variant is served via a
  // redirect, and a basename mismatch has twice produced a blank screen on
  // exactly one of the two.
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    watch(page);
    for (const url of [ADMIN, `${ADMIN}/`]) {
      console.log(`\nSPA mount ${url}`);
      where.label = `spa-mount ${url}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
      const mounted = await page.evaluate(
        () => (document.getElementById("root")?.children.length ?? 0) > 0,
      );
      if (mounted) ok(`mounted ${url}`);
      else fail(`SPA mount ${url}`, "#root has no children - blank screen");
    }
    await ctx.close();
  }

  // ---- 3. Staff login end to end, and the session cookie -----------------
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  watch(page);

  console.log(`\nStaff login`);
  where.label = "staff login";
  await page.goto(ADMIN, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 45000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password-input", PASS);

  // Enter must submit. There is no separate click here on purpose: the form
  // previously had onSubmit but no submit-type button, so pressing Enter did
  // nothing and only a click worked.
  const t0 = Date.now();
  await page.press("#password-input", "Enter");

  // Login.jsx never navigates on failure - it only shows a toast - so staying
  // on /admin is the failure signal. Not retried: 3 failures lock the account
  // for 24h.
  let reached = true;
  try {
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  } catch {
    reached = false;
  }

  if (!reached) {
    fail("staff login", `did not reach the dashboard (at ${page.url()})`);
    return;
  }
  ok("staff login", `${Date.now() - t0}ms -> ${new URL(page.url()).pathname}`);

  const cookies = await ctx.cookies();
  const sid = cookies.find((c) => c.name === "sessionId");
  if (!sid) fail("session cookie", "no sessionId cookie was set");
  else if (!sid.httpOnly) fail("session cookie", "sessionId is not httpOnly");
  else ok("session cookie", `httpOnly, sameSite=${sid.sameSite}`);

  // "Loading menus" left on screen was a real defect, not a hypothetical.
  const stuck = await page
    .waitForFunction(() => !document.body.innerText.includes("Loading menus"), {
      timeout: 30000,
    })
    .then(() => false)
    .catch(() => true);
  if (stuck) fail("menu load", "'Loading menus' still on screen after 30s");
  else ok("menus loaded");

  // ---- 4. Authenticated route sweep, desktop then mobile -----------------
  for (const route of ADMIN_ROUTES) {
    console.log(`\n[1440px] admin/${route}`);
    await sweep(page, `admin-${route}`, `${ADMIN}/${route}`);
  }

  const mctx = await browser.newContext({
    viewport: MOBILE,
    isMobile: true,
    deviceScaleFactor: 2,
    storageState: await ctx.storageState(),
  });
  const mpage = await mctx.newPage();
  watch(mpage);
  for (const route of ADMIN_ROUTES.slice(0, 5)) {
    console.log(`\n[390px] admin/${route}`);
    await sweep(mpage, `admin-${route}`, `${ADMIN}/${route}`, { mobile: true });
  }
  await mctx.close();
  await ctx.close();
}

(async () => {
  if (!EMAIL || !PASS) {
    console.error("SA_EMAIL and SA_PASS must be set in the environment.");
    process.exit(2);
  }

  console.log(`Gate: ${BASE}`);
  console.log(`Out : ${OUT}\n`);

  let crashed = null;
  const browser = await chromium.launch({ channel: CHANNEL || undefined, headless: true });
  try {
    await run(browser);
  } catch (e) {
    // A thrown error must still produce a verdict and an artifact; otherwise a
    // whole class of failure leaves CI with a stack trace and no result file.
    crashed = e?.stack || String(e);
    fail("gate crashed", (e?.message || String(e)).slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
  }

  // ---- page events, attributed to the route that produced them -----------
  const byLabel = new Map();
  for (const ev of events) {
    if (!byLabel.has(ev.label)) byLabel.set(ev.label, []);
    byLabel.get(ev.label).push(ev);
  }
  for (const [label, evs] of byLabel) {
    const fatal = evs.filter((e) => e.fatal);
    const soft = evs.filter((e) => !e.fatal);
    if (fatal.length)
      fail(
        `${label} page errors`,
        `${fatal.length} -> ` + fatal.slice(0, 3).map((e) => `${e.kind}: ${e.msg}`).join(" | "),
      );
    if (soft.length)
      note(
        `${label} expected 4xx / benign console`,
        `${soft.length} -> ` + soft.slice(0, 3).map((e) => `${e.kind}: ${e.msg}`).join(" | "),
      );
  }
  if (!events.some((e) => e.fatal)) ok("no fatal page errors on any route");

  if (notes.length) {
    console.log(`\n--- not enforced (${notes.length}) ---`);
    for (const n of notes) console.log(`  note  ${n}`);
  }

  try {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(
      path.join(OUT, "gate-result.json"),
      JSON.stringify(
        { base: BASE, at: new Date().toISOString(), failures, notes, crashed },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(`could not write gate-result.json: ${e.message}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  if (failures.length) {
    console.log(`GATE FAILED - ${failures.length} problem(s):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("GATE PASSED");
  }
})();

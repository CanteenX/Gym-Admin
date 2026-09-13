/**
 * Turns the server's FIELD_SPECS into something a form can render.
 *
 * WHY NOTHING HERE HARDCODES A PER-COLLECTION EXTRA FIELD: the list endpoint
 * returns `collections` and `fieldSpecs` with every page precisely so the
 * editor does not have to. A hardcoded "plans have a price, classes have a day"
 * drifts the moment models/SiteItem.js gains a field — and the failure mode is
 * a 400 the editor cannot act on ("fields.period is not a known field for
 * 'plans'"), or worse, a field the owner can no longer fill in at all.
 * Everything below takes the spec as an argument; only the human-readable
 * LABELS are local, because a label is a display decision the API has no
 * opinion about.
 *
 * Every function is pure and returns new objects — the values it produces go
 * straight into React state.
 */
import { isPreviewableImage } from "../ImageField";

/**
 * Display names for the seven lists that exist today. A collection the server
 * reports but this map has never heard of still renders, under its raw key:
 * SITE_ITEM_COLLECTIONS is deliberately not an enum server-side, so adding a
 * list is a data change, and an editor that hid unknown lists would make that
 * data change invisible.
 */
export const COLLECTION_LABELS = {
  programs: "Programs",
  plans: "Pricing Plans",
  faqs: "FAQs",
  trainers: "Trainers",
  classes: "Class Timetable",
  testimonials: "Testimonials",
  transformations: "Transformations",
  // Site chrome. The label is what the owner would look for in a sidebar; it
  // deliberately differs from the collectionKey for three of these, exactly as
  // the menuName does in Gym-Server/config/cmsMenus.js.
  stats: "Stats",
  marquee: "Marquee",
  navlinks: "Navigation",
  branches: "Branch Cards",
  media: "Background Media",
};

/** One line of orientation above each list. */
export const COLLECTION_HINTS = {
  programs: "The programme cards on the home page and /programs.",
  plans: "The pricing table. Every plan needs a price.",
  faqs: "The question-and-answer accordion.",
  trainers: "The trainer wall — one row per coach, with a portrait.",
  classes: "One row per timetable cell: a class name for a day and a time.",
  testimonials: "The quote carousel.",
  transformations: "Before-and-after gallery. Both photos live on the row.",
  stats: "The animated counters in the home hero. The title is the label; the number is Count.",
  marquee: "The scrolling ribbon on the home page. One word or phrase per row — the title IS the row.",
  navlinks: "The navbar and footer links. Every row needs a destination.",
  branches:
    "The two gyms as the public site describes them. NOT the Branch Master — editing here cannot touch the branch name stored on members and transactions.",
  media:
    "The looping background videos. Each slot is addressed by its Slug, so the slug must match what the site asks for.",
};

/**
 * Per-collection wording for the fields every row has.
 *
 * These are the SCHEMA's fields, not the spec's, so naming them here cannot
 * drift from what the API accepts — only from the English. A missing entry
 * falls back to the generic label, so a list invented later still reads
 * sensibly with no code change.
 */
export const BASE_LABELS = {
  programs: { title: "Programme name", body: "Description" },
  plans: { title: "Plan name", subtitle: "One-line pitch", body: "Description" },
  faqs: { title: "Question", body: "Answer" },
  trainers: { title: "Trainer name", subtitle: "Role", body: "Short bio" },
  classes: { title: "Class name", body: "Notes" },
  testimonials: {
    title: "Who said it",
    subtitle: "Where they train",
    body: "The quote",
  },
  transformations: {
    title: "Member name",
    subtitle: "Caption",
    body: "Their story",
  },
  stats: { title: "Label", subtitle: "Supporting line", body: "Notes" },
  // The site renders only the title for these two; the schema still carries a
  // subtitle and body, so they are labelled for what they are rather than
  // hidden — a hidden field is one an editor fills in on the row BELOW.
  marquee: {
    title: "Word or phrase",
    subtitle: "Not shown on the site",
    body: "Not shown on the site",
  },
  navlinks: {
    title: "Link text",
    subtitle: "Not shown on the site",
    body: "Not shown on the site",
  },
  branches: {
    title: "Full name",
    subtitle: "Short name",
    body: "Blurb shown on the card",
  },
  media: { title: "Slot name", subtitle: "Caption", body: "Notes" },
};

/**
 * Per-field guidance, printed under the input the spec generated.
 *
 * WHY IT IS NEEDED AT ALL, and only for these: every other field in this CMS is
 * a plain string whose meaning the label carries. `branches.hours` and
 * `branches.openingHours` are not — they are lists of TUPLES flattened into one
 * string per row with " | " between the columns, because models/SiteItem.js
 * rejects a nested object in the `fields` bag outright (a Mixed bag of arbitrary
 * objects is how a `$` key gets in). An editor shown a bare textarea labelled
 * "Opening hours" has no way to discover that shape, and a row typed without the
 * separators saves cleanly and publishes wrong opening times to search engines.
 *
 * Keyed by collection then field, so it is display copy in exactly the same
 * place every other label lives — nothing here is sent to the server and a
 * missing entry simply prints no hint.
 */
export const FIELD_HINTS = {
  stats: {
    count: "The number the counter ticks up to. Digits only — put the + or % in Suffix.",
    value: "Optional static fallback printed before the animation runs, e.g. “1000+”.",
    suffix: "Appended after the number: +, %, or leave it empty.",
  },
  navlinks: {
    href: "Where the link goes, e.g. /programs or #contact.",
  },
  branches: {
    slug: "Stable id the site keys on: vasna, gotri. Survives a rename of the display name.",
    phoneHref: "The dialable form, e.g. tel:+919687294124.",
    mapQuery: "What gets handed to the maps link, e.g. “Mid City Gym Vasna Vadodara”.",
    hours:
      "Display rows, one per line, columns separated by a space-pipe-space: “Mon — Sat | 5:00 AM — 11:00 PM”.",
    openingHours:
      "The same information for search engines, one per line as “<days> | <opens> | <closes>” with 24-hour times and weekdays joined by SPACES, e.g. “Monday Tuesday Wednesday | 05:00 | 23:00”. Kept separate from Hours on purpose: Hours is copy an editor may reword, this is machine-read.",
    geoLat: "Decimal degrees. Leave it empty rather than guessing — a wrong pin gets published.",
    geoLng: "Decimal degrees. Leave it empty rather than guessing — a wrong pin gets published.",
  },
  media: {
    slug: "The site looks this slot up BY NAME (hero, page-header). A typo hides the slot.",
    video:
      "Paste the video URL. The picker beside it uploads images only, so a video has to be hosted elsewhere and linked here.",
    poster:
      "The still shown before the video buffers, when autoplay is blocked, and for visitors who prefer reduced motion.",
  },
};

/**
 * @param {string} collectionKey
 * @param {string} fieldKey
 * @returns {string} guidance to print under the input, or "" when there is none
 */
export const fieldHint = (collectionKey, fieldKey) =>
  FIELD_HINTS[collectionKey]?.[fieldKey] || "";

const GENERIC_LABELS = {
  title: "Title",
  subtitle: "Subtitle",
  body: "Body",
};

/**
 * @param {string} collectionKey
 * @param {"title"|"subtitle"|"body"} field
 * @returns {string} the label to print above that input
 */
export const baseLabel = (collectionKey, field) =>
  BASE_LABELS[collectionKey]?.[field] || GENERIC_LABELS[field] || field;

export const collectionLabel = (key) =>
  COLLECTION_LABELS[key] || key || "Unassigned";

/** "beforeImage" -> "Before image", "slug" -> "Slug". */
export const humanFieldLabel = (key = "") => {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "";
};

/**
 * The extra fields a collection accepts, shaped for the form.
 *
 * Three cases, and they are NOT the same thing:
 *   - a spec WITH keys   render exactly those inputs, in the server's order
 *   - a spec with NO keys the collection takes no extras at all (`faqs: {}`),
 *                         and sending any key would 400
 *   - NO spec at all      a list invented after the server shipped, left
 *                         free-form on purpose. There is no contract to render
 *                         inputs from, so the row's OWN keys are used: an
 *                         editor can still fix what is there, and every such
 *                         value is stored as a string server-side.
 *
 * @param {object} fieldSpecs - the `fieldSpecs` map from the list response
 * @param {string} collectionKey
 * @param {object} [currentFields] - the row being edited, for the third case
 * @returns {{key: string, type: string, required: boolean, label: string,
 *   hint: string}[]}
 */
export const editableFields = (fieldSpecs, collectionKey, currentFields) => {
  const spec = fieldSpecs?.[collectionKey];

  if (spec && typeof spec === "object") {
    return Object.entries(spec).map(([key, rule]) => ({
      key,
      type: rule?.type || "string",
      required: rule?.required === true,
      label: humanFieldLabel(key),
      hint: fieldHint(collectionKey, key),
    }));
  }

  const stored =
    currentFields && typeof currentFields === "object" ? currentFields : {};
  return Object.keys(stored).map((key) => ({
    key,
    type: "string",
    required: false,
    label: humanFieldLabel(key),
    hint: fieldHint(collectionKey, key),
  }));
};

/** True when the server publishes a contract for this list. */
export const hasSpec = (fieldSpecs, collectionKey) => {
  const spec = fieldSpecs?.[collectionKey];
  return Boolean(spec && typeof spec === "object");
};

/** The `image`-typed extras — transformations' before/after pair today. */
export const imageSlots = (defs) => defs.filter((def) => def.type === "image");

/** A textarea of one entry per line -> the array the API stores. */
export const linesToArray = (value) =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Stored `fields` -> form state.
 *
 * Arrays become one entry per LINE rather than a comma-separated string,
 * because the server splits a plain string on commas and the real values
 * contain them: "Everything in Monthly, plus 2 free months" would silently
 * become two features. A textarea has no such ambiguity.
 */
export const fieldsToForm = (fields, defs) => {
  const stored = fields && typeof fields === "object" ? fields : {};
  return defs.reduce((acc, def) => {
    const value = stored[def.key];
    if (def.type === "boolean") return { ...acc, [def.key]: value === true };
    if (def.type === "string[]") {
      const text = Array.isArray(value)
        ? value.join("\n")
        : value === undefined || value === null
          ? ""
          : String(value);
      return { ...acc, [def.key]: text };
    }
    if (value === undefined || value === null) return { ...acc, [def.key]: "" };
    return { ...acc, [def.key]: String(value) };
  }, {});
};

/**
 * Form state -> the `fields` bag to send.
 *
 * A cleared NUMBER is sent as "" and never as 0. The server reads "" as "drop
 * this key" precisely so a blank rating cannot ship as a 0-star review, and
 * Number("") === 0 is the bug that rule exists to prevent — so the UI must not
 * reintroduce it on the way out.
 */
export const formToFields = (form, defs) =>
  defs.reduce((acc, def) => {
    const raw = form?.[def.key];
    if (def.type === "boolean") return { ...acc, [def.key]: raw === true };
    if (def.type === "string[]") return { ...acc, [def.key]: linesToArray(raw) };
    return { ...acc, [def.key]: String(raw ?? "").trim() };
  }, {});

/**
 * Mirrors the server's own checks, so a missing price is caught in the form
 * rather than as a 400 after the round trip.
 *
 * @returns {object} key -> message; empty when the bag is valid
 */
export const validateFieldValues = (form, defs) =>
  defs.reduce((errors, def) => {
    const raw = form?.[def.key];

    if (def.type === "number") {
      const text = String(raw ?? "").trim();
      if (text !== "" && !Number.isFinite(Number(text))) {
        return { ...errors, [def.key]: `${def.label} must be a number` };
      }
    }

    if (!def.required) return errors;

    const empty =
      def.type === "string[]"
        ? linesToArray(raw).length === 0
        : def.type === "boolean"
          ? false
          : String(raw ?? "").trim() === "";

    return empty ? { ...errors, [def.key]: `${def.label} is required` } : errors;
  }, {});

/**
 * The `fields` worth printing in the list, as label/value pairs.
 *
 * Photos are skipped (the list shows a thumbnail instead) and a false boolean
 * is skipped — an unfeatured plan is the normal case, and saying so on every
 * row is noise in the one column an editor scans.
 *
 * @returns {{key: string, label: string, text: string}[]}
 */
export const fieldSummary = (row, defs) =>
  defs.reduce((acc, def) => {
    if (def.type === "image") return acc;
    const value = row?.fields?.[def.key];
    if (value === undefined || value === null || value === "") return acc;
    if (def.type === "boolean") {
      return value === true
        ? [...acc, { key: def.key, label: def.label, text: "Yes" }]
        : acc;
    }
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    return text ? [...acc, { key: def.key, label: def.label, text }] : acc;
  }, []);

/**
 * The first photo a row has, whichever field holds it.
 *
 * Transformations leave `imageUrl` empty on purpose and keep both photos in
 * `fields`, so a list column that only read `imageUrl` would show three blank
 * cells and imply the gallery had no pictures at all.
 *
 * An `image`-typed slot holding something an <img> cannot draw is SKIPPED
 * rather than returned: `media.video` is typed `image` server-side because that
 * spec type means "opaque storage reference", and it sorts before `media.poster`
 * — so without this the media list would show a broken icon on every row while
 * the poster it should have used sat in the next field along.
 */
export const primaryImage = (row, defs) => {
  if (row?.imageUrl && isPreviewableImage(row.imageUrl)) {
    return String(row.imageUrl);
  }
  const slot = imageSlots(defs).find(
    (def) => row?.fields?.[def.key] && isPreviewableImage(row.fields[def.key]),
  );
  return slot ? String(row.fields[slot.key]) : "";
};

export default {
  COLLECTION_LABELS,
  COLLECTION_HINTS,
  BASE_LABELS,
  FIELD_HINTS,
  fieldHint,
  baseLabel,
  collectionLabel,
  humanFieldLabel,
  editableFields,
  hasSpec,
  imageSlots,
  linesToArray,
  fieldsToForm,
  formToFields,
  validateFieldValues,
  fieldSummary,
  primaryImage,
};

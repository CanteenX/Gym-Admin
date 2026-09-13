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
};

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
 * @returns {{key: string, type: string, required: boolean, label: string}[]}
 */
export const editableFields = (fieldSpecs, collectionKey, currentFields) => {
  const spec = fieldSpecs?.[collectionKey];

  if (spec && typeof spec === "object") {
    return Object.entries(spec).map(([key, rule]) => ({
      key,
      type: rule?.type || "string",
      required: rule?.required === true,
      label: humanFieldLabel(key),
    }));
  }

  const stored =
    currentFields && typeof currentFields === "object" ? currentFields : {};
  return Object.keys(stored).map((key) => ({
    key,
    type: "string",
    required: false,
    label: humanFieldLabel(key),
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
 */
export const primaryImage = (row, defs) => {
  if (row?.imageUrl) return String(row.imageUrl);
  const slot = imageSlots(defs).find((def) => row?.fields?.[def.key]);
  return slot ? String(row.fields[slot.key]) : "";
};

export default {
  COLLECTION_LABELS,
  COLLECTION_HINTS,
  BASE_LABELS,
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

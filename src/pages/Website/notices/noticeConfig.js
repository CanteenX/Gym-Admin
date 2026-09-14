/**
 * The vocabulary the two notice screens share, and the one place the two kinds
 * differ from each other.
 *
 * WHY ONE CONFIG AND ONE SCREEN COMPONENT rather than two hand-written pages:
 * announcements and banners differ in PRESENTATION, not in lifecycle. Both are
 * scheduled with the same startAt/endAt window, both are ordered, both are
 * switched off the same way, and both are one collection behind one set of
 * endpoints. Two copies of the screen would mean two copies of the scheduling
 * UI - and the scheduling UI is the entire point of this work, so the one thing
 * that must not exist in two versions is the bit that says "expired".
 *
 * The kinds ARE separate ROUTES, because they are separate permissions on the
 * server (Gym-Server/config/cmsMenus.js, CMS_NOTICE_MENUS): whoever can post
 * "the gym is shut on Thursday" should not thereby be able to publish a
 * discount.
 *
 * Every enum value below is copied from Gym-Server/models/SiteNotice.js. They
 * are closed enums there - the server rejects anything else - so a value added
 * here without being added there fails at save time, not at render time.
 */

/** SiteNotice.tone. Severities, not emotions: URGENT is "we are shut today". */
export const TONES = Object.freeze([
  { value: "INFO", label: "Information - blue (the usual choice)" },
  { value: "SUCCESS", label: "Good news - green" },
  { value: "WARNING", label: "Heads up - amber" },
  { value: "URGENT", label: "Urgent - red (a closure, a cancellation)" },
]);

/**
 * SiteNotice.placement, BANNERS ONLY.
 *
 * A DIFFERENT LIST FROM THE ADVERT PLACEMENTS on the adverts screen, even
 * though both are spelled <PAGE>_<POSITION>. A banner is a full-width slab and
 * an advert is a card, so SIDEBAR and FOOTER are meaningless here while
 * PROGRAMS_TOP and CONTACT_TOP have no advert equivalent.
 *
 * Announcements do not use this at all: a closure is true on every page, so
 * asking which page it belongs on is a question with no answer. The server
 * forces the field to null on an announcement rather than rejecting it, so a
 * shared form sending a stale placement is harmless.
 */
export const PLACEMENTS = Object.freeze([
  { value: "HOME_TOP", label: "Home - top of the page" },
  { value: "HOME_MID", label: "Home - middle of the page" },
  { value: "PROGRAMS_TOP", label: "Programs - top of the page" },
  { value: "CONTACT_TOP", label: "Contact - top of the page" },
]);

export const placementLabel = (value) =>
  PLACEMENTS.find((p) => p.value === value)?.label || value || "-";

export const toneLabel = (value) =>
  TONES.find((t) => t.value === value)?.label || value || "-";

/**
 * Everything that differs between the two screens, in one object each, so the
 * shared screen never branches on a bare string literal.
 *
 * The `intro` copy says what the kind is AND what it is not, because the
 * confusion this whole content type exists to fix was a vocabulary problem: the
 * owner reached for "Advertisement" because it was the only scheduled,
 * self-expiring thing on the site, and got a small card labelled "Sponsored".
 */
export const NOTICE_KIND_CONFIG = Object.freeze({
  ANNOUNCEMENT: {
    kind: "ANNOUNCEMENT",
    /** Byte-identical to CMS_NOTICE_MENUS.ANNOUNCEMENT in cmsMenus.js. */
    menuUrl: "/cms/announcements",
    screenTitle: "Announcements",
    singular: "Announcement",
    addLabel: "Add Announcement",
    intro:
      "A notice bar across the top of the website - the gym talking to its members. A closure, a change of timings, a new class. It shows on every page, so there is no placement to choose. This is not an advert: adverts are paid third-party slots and render under a Sponsored heading.",
    emptyText:
      "No announcements yet. Use one to tell members about a closure or a change of timings.",
    titleHint:
      "The headline members see first, e.g. Closed for Ganesh Chaturthi.",
    bodyLabel: "Message",
    bodyRequired: true,
    bodyHint:
      "The message itself. A title on its own is a headline with no news in it - say which days, and from when.",
    hasPlacement: false,
    hasImage: false,
    hasDismissible: true,
    ctaHint:
      "Optional. A link members can follow for more, e.g. the timetable page.",
  },
  BANNER: {
    kind: "BANNER",
    /** Byte-identical to CMS_NOTICE_MENUS.BANNER in cmsMenus.js. */
    menuUrl: "/cms/banners",
    screenTitle: "Banners",
    singular: "Banner",
    addLabel: "Add Banner",
    intro:
      "A large promotional slab in a chosen slot on a chosen page - the gym promoting itself. A membership offer, a new branch. It is part of the page, so visitors cannot close it. This is not an advert: adverts are paid third-party slots and render under a Sponsored heading.",
    emptyText:
      "No banners yet. Use one to promote an offer or announce a new branch.",
    titleHint: "The big line on the slab, e.g. 20% off annual plans.",
    bodyLabel: "Supporting text",
    bodyRequired: false,
    bodyHint:
      "Optional. A headline on a picture with a button is already a complete banner.",
    hasPlacement: true,
    hasImage: true,
    hasDismissible: false,
    ctaHint:
      "Optional. Where the button takes a visitor. Leave the link empty and the banner is not clickable.",
  },
});

// ------------------------------------------------------------------- dates

/**
 * `<input type="datetime-local">` wants wall-clock time with no zone, while the
 * API stores an instant. toISOString() shifts by the UTC offset, which on the
 * adverts screen showed every Indian row starting 5h30m earlier than it does.
 *
 * @param {string|Date|null} value
 * @returns {string} a value a datetime-local input accepts, or ""
 */
export const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

/** The reverse: local wall clock back to an unambiguous instant for the API. */
export const toApiDate = (localValue) => {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

/**
 * A date as a person reads it. Returns null rather than "Invalid Date" so each
 * caller can choose its own words for "not set" - and they differ: an empty
 * start means "immediately", an empty end means "until switched off", and those
 * are not the same sentence.
 *
 * @param {string|Date|null} value
 * @returns {string|null}
 */
export const formatWhen = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** "2 minutes", "3 hours", "5 days" - for saying how long a window really is. */
export const durationText = (ms) => {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};

/** Windows shorter than this get called out before they are saved. */
const SHORT_WINDOW_MS = 60 * 60 * 1000;

const parseTime = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * The plain-English problems with a pair of dates, for showing on the form.
 *
 * THIS IS THE INCIDENT, WRITTEN DOWN. The owner set a window two minutes wide,
 * the notice expired before they went to look at the site, and working software
 * was reported as broken because nothing on the screen ever said so.
 *
 * A badge alone would not have caught it either: at the moment of saving, a
 * two-minute window starting now reads LIVE, and is only wrong a hundred and
 * twenty seconds later. So the LENGTH of the window is called out as well,
 * while there is still somebody looking at the form.
 *
 * These are NOTES, NOT ERRORS, on purpose - every one of them is a legal,
 * saveable state the editor may well have meant. Nothing here blocks a save;
 * refusing one would be the panel second-guessing the owner.
 *
 * @param {{startAt?:string, endAt?:string}} values raw form values
 * @param {number} [now] epoch ms, injectable so this is testable
 * @returns {{id:string, color:string, icon:string, text:string}[]}
 */
export const scheduleNotes = (values, now = Date.now()) => {
  const notes = [];
  const start = parseTime(values?.startAt);
  const end = parseTime(values?.endAt);

  if (end !== null && end < now) {
    notes.push({
      id: "past",
      color: "danger",
      icon: "ri-calendar-close-line",
      text: `This end date is already in the past - it was ${formatWhen(
        values.endAt,
      )}, so this notice has stopped showing on the website. Clear the end date to run it until you switch it off, or set a later one.`,
    });
  }

  if (start !== null && end !== null && end > start && end - start < SHORT_WINDOW_MS) {
    notes.push({
      id: "short",
      color: "warning",
      icon: "ri-timer-flash-line",
      text: `That window is only ${durationText(
        end - start,
      )} long - the notice will disappear again almost as soon as it appears. Leave the end date empty if you want it to run until you switch it off.`,
    });
  }

  if (start !== null && start > now) {
    notes.push({
      id: "future",
      color: "info",
      icon: "ri-time-line",
      text: `Nothing shows until ${formatWhen(values.startAt)}.${
        end === null ? " After that it runs until you switch it off." : ""
      }`,
    });
  }

  return notes;
};

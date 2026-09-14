/**
 * Calendar-day maths and labels for the Holiday Master.
 *
 * ============================================================================
 * PORTED, NOT INVENTED.
 * ============================================================================
 * `toLocalKey`, `mondayIndex`, `monthTitle` and the month-grid construction
 * below are the same functions the member portal's calendar already uses
 * (Gym-frontend/src/components/portal/attendance-format.ts and
 * components/portal/attendance-calendar.tsx). They are re-stated here rather
 * than imported because that is a different repository, a different build and
 * TypeScript — but they must stay behaviourally identical, because both
 * calendars render the same gym's days and a member and a receptionist
 * disagreeing about which square is Tuesday is a support call.
 *
 * ============================================================================
 * LOCAL GETTERS ONLY. NEVER getUTC*.
 * ============================================================================
 * The server stores a holiday at LOCAL midnight (Gym-Server/services/
 * holidayDate.js), on the stated assumption that the process runs in IST.
 * Reading those instants back with `getUTCDate()` in IST lands on the previous
 * day, which renders a Saturday closure on Friday — the exact bug that file's
 * header is protecting against. Every getter here is deliberately the local
 * one, which round-trips correctly for any viewer on IST.
 */

/** yyyy-mm-dd from LOCAL getters — the key every day map in here is keyed by. */
export const toLocalKey = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** A Date normalised to local midnight, or null for anything unparseable. */
export const startOfDay = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Monday-first column index — Indian gyms run their week Mon–Sun. */
export const mondayIndex = (d) => (d.getDay() + 6) % 7;

export const monthTitle = (d) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

/** The 1st of `d`'s month at local midnight — the cursor every grid is built from. */
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

/** `cursor` shifted by whole months, staying anchored to the 1st. */
export const addMonths = (cursor, n) =>
  new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);

/** "12 Nov 2026" — the single form every date in this feature is written in. */
export const dayLabel = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * How a holiday's span is written wherever it appears: "12 Nov 2026" for a
 * single day, "12–14 Nov 2026" for a range.
 *
 * The range form is what makes "one row, not three" legible. A UI that printed
 * only `date` would show a three-day Diwali closure as a single day and the
 * front desk would reopen on day two.
 *
 * The shared-month shortening ("12–14 Nov 2026" rather than repeating the
 * month) is cosmetic; the en dash is not — a hyphen reads as a minus sign in
 * the condensed template face.
 */
export const holidaySpanLabel = (holiday) => {
  const start = startOfDay(holiday?.date);
  if (!start) return "—";
  const end = startOfDay(holiday?.endDate);
  if (!end || end.getTime() <= start.getTime()) return dayLabel(start);

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${String(start.getDate()).padStart(2, "0")}–${dayLabel(end)}`;
  }
  return `${dayLabel(start)} – ${dayLabel(end)}`;
};

/** Inclusive day count of a holiday's span. 1 for a single day. */
export const holidayDayCount = (holiday) => {
  const start = startOfDay(holiday?.date);
  if (!start) return 0;
  const end = startOfDay(holiday?.endDate) || start;
  const days = Math.round((end - start) / 86400000) + 1;
  return days > 0 ? days : 1;
};

/**
 * `branch: null` is ALL BRANCHES, not missing data — see the model. Rendering
 * it blank is the one mistake that turns a gym-wide closure into something a
 * branch admin assumes is somebody else's problem.
 */
export const branchLabel = (branch) =>
  branch ? String(branch) : "All branches";

/**
 * Explodes every holiday across each day it covers, keyed by `toLocalKey`.
 *
 * This is where the "one row, not three" storage decision is paid for: the
 * list shows the row, the grid needs all three squares filled. A day can carry
 * more than one holiday (an all-branches national holiday plus a branch-only
 * closure on the same date), so the values are arrays — collapsing them to one
 * would silently hide the branch-specific row.
 *
 * Bounded by construction: iteration walks calendar days from `date` to
 * `endDate` and a `MAX_SPAN_DAYS` stop keeps a corrupt far-future `endDate`
 * from spinning forever in the browser.
 *
 * @param {Array} holidays
 * @returns {Map<string, Array>} local-day key -> holidays covering that day
 */
const MAX_SPAN_DAYS = 400;

export const expandHolidayDays = (holidays) => {
  const byDay = new Map();
  if (!Array.isArray(holidays)) return byDay;

  for (const holiday of holidays) {
    const start = startOfDay(holiday?.date);
    if (!start) continue;
    const end = startOfDay(holiday?.endDate) || start;

    const cursor = new Date(start);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < MAX_SPAN_DAYS) {
      const key = toLocalKey(cursor);
      const existing = byDay.get(key);
      // A new array every time rather than pushing into the caller's data —
      // these maps are rebuilt inside useMemo and mutating a previous value
      // would make the memo lie about having changed.
      byDay.set(key, existing ? [...existing, holiday] : [holiday]);
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }

  return byDay;
};

/**
 * The month laid out as weeks of seven cells, Monday first, with leading and
 * trailing blanks so every row is a full week.
 *
 * Same construction as the portal's grid. `null` means "not a day of this
 * month" and is rendered as an empty, aria-hidden cell — a real table needs
 * complete rows, but a screen reader must not be told those blanks are days.
 *
 * @param {Date} cursor - any date inside the month to lay out
 * @returns {Array<Array<{day: number, key: string, date: Date}|null>>}
 */
export const buildMonthGrid = (cursor) => {
  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  // Day 0 of the NEXT month is the last day of this one — the standard trick,
  // and the only one that is right for February in a leap year.
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = mondayIndex(new Date(year, monthIndex, 1));

  const cells = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ day, key: toLocalKey(date), date });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/** Monday-first weekday headings. `full` is what a screen reader is given. */
export const WEEKDAYS = [
  { key: "mon", short: "Mon", full: "Monday" },
  { key: "tue", short: "Tue", full: "Tuesday" },
  { key: "wed", short: "Wed", full: "Wednesday" },
  { key: "thu", short: "Thu", full: "Thursday" },
  { key: "fri", short: "Fri", full: "Friday" },
  { key: "sat", short: "Sat", full: "Saturday" },
  { key: "sun", short: "Sun", full: "Sunday" },
];

/** yyyy-mm-dd for an <Input type="date"> value, or "" for no date. */
export const toDateInput = (value) => {
  const d = startOfDay(value);
  return d ? toLocalKey(d) : "";
};

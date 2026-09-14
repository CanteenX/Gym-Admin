import React, { useMemo } from "react";
import PropTypes from "prop-types";
import "./HolidayCalendar.css";
import {
  WEEKDAYS,
  branchLabel,
  buildMonthGrid,
  holidayDayCount,
  holidaySpanLabel,
  monthTitle,
  toLocalKey,
} from "./holidayFormat";

/**
 * The gym-closure month grid.
 *
 * ============================================================================
 * THIS IS A PORT OF AN EXISTING COMPONENT, NOT A NEW CALENDAR.
 * ============================================================================
 * Gym-frontend/src/components/portal/attendance-calendar.tsx is the calendar
 * this project already had: a hand-rolled Monday-first month table, marked-up
 * as a real <table> with weeks for rows and days for cells. Its structure, its
 * grid maths (now in holidayFormat.js) and its accessibility decisions are
 * reproduced here, translated from Tailwind/TSX to reactstrap/Bootstrap/JSX
 * because the admin panel is a different repo and a different stack.
 *
 * No calendar LIBRARY is pulled in. The template ships
 * assets/scss/plugins/_fullcalendar.scss, but @fullcalendar/* is not a
 * dependency of this project and adding one to draw 42 squares would be a new
 * ~200KB dependency for something the codebase already solves.
 *
 * ============================================================================
 * WHY A <table> AND NOT A GRID OF <div>s
 * ============================================================================
 * A month IS tabular: the column a square sits in carries the meaning "this is
 * a Tuesday". A CSS grid of divs looks identical and tells a screen reader
 * nothing, so a non-sighted user gets a bare list of numbers. The blanks that
 * pad the first and last weeks are aria-hidden for the same reason — the rows
 * have to be complete, but those cells are not days.
 *
 * This component is PRESENTATIONAL. It fetches nothing and decides no
 * permissions: the caller supplies the month, the data and — only if the
 * caller is allowed to act — an `onSelectDay`. A read-only employee is handed
 * no handler, so the squares render as plain text and there is no dead button
 * to click.
 */
const HolidayCalendar = ({
  cursor,
  holidaysByDay,
  loading,
  error,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  compact,
  emptyHint,
}) => {
  // Computed once per mount: "today" does not move while a page is open, and
  // recomputing it per cell would call toLocalKey 42 times a render.
  const todayKey = useMemo(() => toLocalKey(new Date()), []);
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const title = monthTitle(cursor);

  // Cell size, hover states and the closure tint all live in
  // HolidayCalendar.css, keyed off the --hc-cell custom property that
  // `compact` switches. It used to be an inline height plus a pile of
  // Bootstrap utility classes, which could not express a hover state and
  // could not tint a colour against the card behind it.

  return (
    <div className={`holiday-calendar${compact ? " holiday-calendar--compact" : ""}`}>
      <div className="hc-head">
        <button
          type="button"
          className="hc-nav"
          onClick={onPrevMonth}
          disabled={loading}
          aria-label="Show the previous month"
        >
          <i className="ri-arrow-left-s-line" aria-hidden="true"></i>
        </button>
        {/* aria-live so a screen-reader user hears which month they landed on
            after pressing the arrows — the grid itself does not announce. */}
        <div className="hc-head__title" aria-live="polite">
          {title}
          {loading && (
            <span
              className="spinner-border spinner-border-sm text-muted ms-2 align-middle"
              role="status"
            >
              <span className="visually-hidden">Loading holidays</span>
            </span>
          )}
        </div>
        <button
          type="button"
          className="hc-nav"
          onClick={onNextMonth}
          disabled={loading}
          aria-label="Show the next month"
        >
          <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
        </button>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 small mb-2" role="alert">
          <i className="ri-error-warning-line align-bottom me-1" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <table className="table table-borderless table-sm mb-0 holiday-calendar-grid">
        <caption className="visually-hidden">
          Gym holidays for {title}. Highlighted days are days the gym is closed.
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th
                key={d.key}
                scope="col"
                abbr={d.full}
                className="hc-th"
              >
                <span aria-hidden="true">{compact ? d.short.charAt(0) : d.short}</span>
                <span className="visually-hidden">{d.full}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week) => (
            // Keyed by the first real day in the row rather than the row index:
            // stepping a month re-renders every row, and an index key makes
            // React reuse a cell that now means a different date.
            <tr key={week.find((c) => c)?.key || title}>
              {week.map((cell, ci) => {
                if (!cell) {
                  return (
                    <td
                      key={`blank-${title}-${ci}`}
                      aria-hidden="true"
                      className="p-1"
                    />
                  );
                }

                const dayHolidays = holidaysByDay.get(cell.key) || [];
                const closed = dayHolidays.length > 0;
                const isToday = cell.key === todayKey;

                /**
                 * The whole sentence, not "closed". A branch admin and a super
                 * admin see the same square but it can mean different things —
                 * an all-branches festival or one branch's maintenance day —
                 * and the branch is the part a screen reader would otherwise
                 * never get, because the square only has room for a title.
                 */
                const description = closed
                  ? dayHolidays
                      .map((h) => {
                        // Keyed off the DAY COUNT, not the raw endDate: the
                        // server accepts an endDate equal to date (it only
                        // rejects one that is earlier), and that row is a
                        // single day. Testing `h.endDate` would append a span
                        // that reads identically to the date already announced.
                        const span =
                          holidayDayCount(h) > 1
                            ? `, ${holidaySpanLabel(h)}`
                            : "";
                        return `${h.title} (${branchLabel(h.branch)})${span}`;
                      })
                      .join("; ")
                  : "open";
                const label = `${cell.date.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                })} — ${description}`;

                const dayClass = [
                  "hc-day",
                  closed ? "hc-day--closed" : "",
                  isToday ? "hc-day--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const inner = (
                  <>
                    <span className="d-block lh-1">{cell.day}</span>
                    {/* A DOT, NOT THE TITLE — in both sizes.
                        The roomy view used to print the holiday's name under
                        the number, but a day cell is ~47px wide and a title is
                        not, so every one of them rendered as "CLAU…" or
                        "Ganes…". A truncated name is worse than no name: it
                        occupies the space, draws the eye, and resolves to
                        nothing. The full titles are listed beside the grid,
                        which is where there is room to read them. */}
                    {closed && (
                      <span className="hc-dot" aria-hidden="true"></span>
                    )}
                  </>
                );

                return (
                  <td key={cell.key} className="p-1 text-center align-middle">
                    {onSelectDay ? (
                      <button
                        type="button"
                        aria-label={label}
                        title={label}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => onSelectDay(cell, dayHolidays)}
                        className={dayClass}
                      >
                        {inner}
                      </button>
                    ) : (
                      /* No handler means the viewer cannot act on a day, so
                         this is text, not a disabled button. A disabled button
                         is still announced as a button and still invites a
                         click — the owner asked for employees to see "a clean
                         list + calendar with no dead buttons".

                         The description goes in a visually-hidden span rather
                         than an aria-label: aria-label is only reliably honoured
                         on interactive or role-bearing elements, and on a plain
                         <span> several screen readers drop it entirely — which
                         would leave a non-sighted employee a grid of bare
                         numbers with no way to tell which days are closed. */
                      <span
                        title={label}
                        aria-current={isToday ? "date" : undefined}
                        className={dayClass}
                      >
                        {inner}
                        {closed && (
                          <span className="visually-hidden">
                            {` — ${description}`}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Two swatches that SHOW the two states, rather than a sentence
          describing them. The old legend spent a line of prose explaining a
          convention the reader can see in one glance at a coloured square. */}
      <p className="hc-legend mb-0">
        <span className="hc-legend__item">
          <span className="hc-legend__swatch hc-legend__swatch--closed" aria-hidden="true"></span>
          Closed
        </span>
        <span className="hc-legend__item">
          <span className="hc-legend__swatch hc-legend__swatch--today" aria-hidden="true"></span>
          Today
        </span>
        {emptyHint ? <span className="hc-legend__item">{emptyHint}</span> : null}
      </p>
    </div>
  );
};

HolidayCalendar.propTypes = {
  /** Any date inside the month to render; the grid anchors to its 1st. */
  cursor: PropTypes.instanceOf(Date).isRequired,
  /** Local-day key -> holidays covering that day, from expandHolidayDays(). */
  holidaysByDay: PropTypes.instanceOf(Map).isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onPrevMonth: PropTypes.func.isRequired,
  onNextMonth: PropTypes.func.isRequired,
  /**
   * Omit entirely for a read-only viewer. Supplying a no-op instead would
   * render 42 clickable squares that do nothing.
   */
  onSelectDay: PropTypes.func,
  /** Dashboard-sized grid: single-letter weekdays, a dot instead of the title. */
  compact: PropTypes.bool,
  emptyHint: PropTypes.string,
};

export default HolidayCalendar;

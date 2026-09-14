import React from "react";
import PropTypes from "prop-types";
import { Col, Row } from "reactstrap";
import HolidayCalendar from "../../../Components/Common/HolidayCalendar";
import {
  branchLabel,
  holidaySpanLabel,
} from "../../../Components/Common/holidayFormat";

/**
 * The calendar tab: the month grid beside the month's closures written out.
 *
 * The list beside the grid is not decoration. A square can only carry a
 * truncated title, and a multi-day closure occupies several squares that each
 * show the same word — so "12–14 Nov 2026 · All branches" in full, once, is
 * the only place the reader learns it is ONE three-day closure rather than
 * three separate ones.
 *
 * `onSelectDay` is passed straight through and may be undefined. That is the
 * signal HolidayCalendar uses to render days as text rather than buttons, so a
 * read-only employee is never given a control that does nothing.
 */
const HolidayCalendarPanel = ({
  cursor,
  holidaysByDay,
  monthHolidays,
  loading,
  error,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}) => (
  <Row className="g-3">
    <Col lg={7}>
      <HolidayCalendar
        cursor={cursor}
        holidaysByDay={holidaysByDay}
        loading={loading}
        error={error}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onSelectDay={onSelectDay}
        emptyHint={
          onSelectDay ? "Click a day to add or edit a closure." : ""
        }
      />
    </Col>
    <Col lg={5}>
      <h6 className="text-muted text-uppercase fs-12 mb-2">
        Closures this month
      </h6>
      {monthHolidays.length === 0 ? (
        <p className="text-muted small mb-0">Nothing marked for this month.</p>
      ) : (
        <ul className="list-unstyled mb-0">
          {monthHolidays.map((h) => (
            <li
              key={h._id}
              className="d-flex align-items-start gap-2 border-bottom py-2"
            >
              <i
                className="ri-calendar-close-line text-danger mt-1"
                aria-hidden="true"
              ></i>
              <div className="flex-grow-1">
                <div className="fw-semibold">{h.title}</div>
                <div className="text-muted small">
                  {holidaySpanLabel(h)} · {branchLabel(h.branch)}
                </div>
                {h.note && <div className="text-muted small">{h.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Col>
  </Row>
);

HolidayCalendarPanel.propTypes = {
  cursor: PropTypes.instanceOf(Date).isRequired,
  holidaysByDay: PropTypes.instanceOf(Map).isRequired,
  monthHolidays: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onPrevMonth: PropTypes.func.isRequired,
  onNextMonth: PropTypes.func.isRequired,
  /** Omitted entirely for a viewer who may neither write nor edit. */
  onSelectDay: PropTypes.func,
};

export default HolidayCalendarPanel;

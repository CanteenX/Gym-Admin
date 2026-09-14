import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Col, Row } from "reactstrap";
import HolidayCalendar from "../../Components/Common/HolidayCalendar";
import {
  addMonths,
  branchLabel,
  expandHolidayDays,
  holidaySpanLabel,
  startOfMonth,
  toLocalKey,
} from "../../Components/Common/holidayFormat";
import { MenuContext } from "../../context/MenuContext";
import {
  getHolidayCalendar,
  searchHolidays,
} from "../../api/holidays.api";

/** Byte-identical to the route path and the seeded MenuMaster row. */
const HOLIDAY_MENU_URL = "/holiday-master";

/** How many upcoming closures are worth naming before it stops being a glance. */
const UPCOMING_LIMIT = 4;

/**
 * Gym holidays on the dashboard.
 *
 * ============================================================================
 * THIS IS THE EMPLOYEE'S HALF OF THE FEATURE.
 * ============================================================================
 * The owner asked for two things: a master an admin can edit, and — "for
 * Employees in their login just view the calender on the dashboard and view
 * the Holidays that have been marked". Employees hold `read` on
 * /holiday-master and nothing else, so this widget is deliberately read-only
 * for EVERYONE, admins included: there is a link through to the master for
 * anyone who wants to change something, and no editing surface here at all.
 * `onSelectDay` is not passed, so the squares are text rather than buttons.
 *
 * ============================================================================
 * IT MUST DISAPPEAR, NOT ERROR, FOR ANYONE WITHOUT read.
 * ============================================================================
 * /dashboard is whitelisted in Routes/PermissionProtected.jsx — it renders for
 * every authenticated user regardless of what they may see elsewhere. So this
 * component cannot assume the holiday permission and cannot borrow
 * MenuContext's `currentPagePermissions` either: on the dashboard that object
 * describes /dashboard, not /holiday-master, and reading it here would gate
 * the widget on the wrong menu row entirely. It resolves its own menu the way
 * PermissionProtected does — findMenuIdByUrlInComplete() then
 * getPermissionsForMenu() — and returns null when the answer is no.
 *
 * A 403 from the server hides it too. That means the two gates disagreed
 * (a stale permission cache, a menu row renamed), and the honest response to
 * "the server says no" is to stop showing the card, not to print an error on
 * a dashboard the person cannot do anything about.
 */
const HolidayWidget = () => {
  const {
    findMenuIdByUrlInComplete,
    getPermissionsForMenu,
    loading: menuLoading,
  } = useContext(MenuContext) || {};

  const canRead = useMemo(() => {
    if (
      typeof findMenuIdByUrlInComplete !== "function" ||
      typeof getPermissionsForMenu !== "function"
    ) {
      return false;
    }
    const menuId = findMenuIdByUrlInComplete(HOLIDAY_MENU_URL);
    return getPermissionsForMenu(menuId)?.read === true;
  }, [findMenuIdByUrlInComplete, getPermissionsForMenu]);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [monthHolidays, setMonthHolidays] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  const loadMonth = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const res = await getHolidayCalendar({
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1, // 1-12, not a JS month index
      });
      setMonthHolidays(res.data?.isOk ? res.data.data?.holidays || [] : []);
      if (!res.data?.isOk) {
        setError(res.data?.message || "Could not load holidays");
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setDenied(true);
        return;
      }
      console.error("Holiday widget month load failed:", err);
      setMonthHolidays([]);
      setError("Could not load holidays");
    } finally {
      setLoading(false);
    }
  }, [canRead, cursor]);

  /**
   * The next few closures, which is the actual question staff have ("are we
   * open on Saturday?"). Anchored to TODAY rather than to the visible month,
   * so paging the grid back to look at last Diwali does not blank the list
   * that tells you about next week.
   *
   * `from` with no `to` is an open-ended overlap filter server-side, so a
   * multi-day closure already in progress still appears.
   */
  const loadUpcoming = useCallback(async () => {
    if (!canRead) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const res = await searchHolidays({
        skip: 0,
        per_page: UPCOMING_LIMIT,
        sorton: "date",
        sortdir: "asc",
        from: toLocalKey(today),
        isActive: true,
      });
      const payload = res.data?.data;
      setUpcoming(
        Array.isArray(payload) && payload.length > 0 ? payload[0].data || [] : [],
      );
    } catch (err) {
      if (err.response?.status === 403) {
        setDenied(true);
        return;
      }
      console.error("Holiday widget upcoming load failed:", err);
      setUpcoming([]);
    }
  }, [canRead]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  const holidaysByDay = useMemo(
    () => expandHolidayDays(monthHolidays),
    [monthHolidays],
  );

  /**
   * Is the gym shut TODAY — the one fact the header states outright.
   *
   * Read from `upcoming` rather than from `holidaysByDay`, deliberately.
   * `holidaysByDay` only covers the month the user is LOOKING at, and the
   * arrows move that: page to December and the header would cheerfully
   * announce the gym was open today because today is not in the grid any more.
   * `upcoming` is anchored to the real today regardless of the cursor.
   *
   * It also catches a multi-day closure that began before today and is still
   * running, because the server includes those by overlap rather than by start
   * date.
   */
  const closedToday = useMemo(() => {
    const todayKey = toLocalKey(new Date());
    return upcoming.some((h) => {
      const from = toLocalKey(new Date(h.date));
      const to = toLocalKey(new Date(h.endDate || h.date));
      return todayKey >= from && todayKey <= to;
    });
  }, [upcoming]);

  // Nothing at all while the menu tree is still resolving: a card that appears
  // and then vanishes reads as a bug, and the dashboard renders before menus
  // land on a hard refresh.
  if (menuLoading || !canRead || denied) return null;

  return (
    <Row className="g-3 mb-2">
      <Col xs={12}>
        <Card className="mb-0">
          <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 border-0 pb-0">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">
                <i
                  className="ri-calendar-close-line text-danger align-bottom me-1"
                  aria-hidden="true"
                ></i>
                Gym Holidays
              </h5>
              {/* The status the widget exists to answer, in the header rather
                  than inferred from a coloured square. Whoever opens the
                  dashboard is asking "are we open?", and a subtitle explaining
                  what a holiday is does not answer it. */}
              {closedToday ? (
                <span className="badge bg-danger-subtle text-danger">
                  Closed today
                </span>
              ) : (
                <span className="badge bg-success-subtle text-success">
                  Open today
                </span>
              )}
            </div>
            <Link
              to="/holiday-master"
              className="link-secondary fs-13 text-decoration-none"
            >
              Holiday Master{" "}
              <i className="ri-arrow-right-line align-bottom" aria-hidden="true"></i>
            </Link>
          </CardHeader>
          <CardBody className="pt-2">
            {/* Was 4/8 in favour of the LIST. On the common day there is
                nothing to list, so two thirds of the card was a single grey
                sentence while the calendar — the part with actual information
                in it — was squeezed into a third. Evened up, and the list side
                now fills its space whether or not anything is in it. */}
            <Row className="g-4">
              <Col lg="auto">
                <HolidayCalendar
                  cursor={cursor}
                  holidaysByDay={holidaysByDay}
                  loading={loading}
                  error={error}
                  onPrevMonth={() => setCursor((c) => addMonths(c, -1))}
                  onNextMonth={() => setCursor((c) => addMonths(c, 1))}
                  compact
                />
              </Col>
              <Col lg>
                {/* Capped rather than stretched. This card is a full dashboard
                    row, so an uncapped panel pulls a two-line message across
                    1400px and reads as a stretched bar with the text lost in
                    the middle of it. Held to a comfortable reading width, the
                    space to the right is plainly deliberate rather than
                    accidental. */}
                <div style={{ maxWidth: 560 }}>
                  <h6 className="text-uppercase fs-11 text-muted mb-3 ls-1">
                    Next closures
                  </h6>
                  {upcoming.length === 0 ? (
                    /* An empty list is the COMMON case, so it gets a considered
                       state rather than a stranded sentence. It also answers
                       positively: "nothing is closed" is the useful reading of
                       no rows, not "no data". */
                    <div className="d-flex align-items-center gap-3 border border-dashed rounded px-3 py-2 text-muted">
                      <i
                        className="ri-calendar-check-line fs-4 text-success opacity-75"
                        aria-hidden="true"
                      ></i>
                      <div>
                        <div className="fw-medium text-body">
                          Open every day from here
                        </div>
                        <div className="fs-12">
                          No closures are marked for the coming weeks.
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* One row per closure, not a two-column grid of cards.
                       There are at most a handful, they are read in date order,
                       and a list keeps that order obvious where a grid makes
                       the eye jump between columns. */
                    <div className="vstack gap-2">
                      {upcoming.map((h) => (
                        <div
                          key={h._id}
                          className="d-flex align-items-center gap-3 border rounded p-2"
                        >
                          <span
                            className="badge bg-danger-subtle text-danger flex-shrink-0 px-2 py-1 fs-11 text-center"
                            aria-hidden="true"
                            /* Fixed width so the titles beside them line up.
                               "18-20 Sept 2026" is half again as wide as
                               "24 Sept 2026", and left to themselves the chips
                               shunt each title to a different x — a ragged
                               left edge down a list that is meant to be
                               scanned. */
                            style={{ minWidth: 118 }}
                          >
                            {holidaySpanLabel(h)}
                          </span>
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-semibold text-truncate">
                              {h.title}
                            </div>
                            <div className="text-muted fs-12 text-truncate">
                              {branchLabel(h.branch)}
                              {h.note ? ` · ${h.note}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default HolidayWidget;

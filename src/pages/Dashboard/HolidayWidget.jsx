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

  // Nothing at all while the menu tree is still resolving: a card that appears
  // and then vanishes reads as a bug, and the dashboard renders before menus
  // land on a hard refresh.
  if (menuLoading || !canRead || denied) return null;

  return (
    <Row className="g-3 mb-2">
      <Col xs={12}>
        <Card className="mb-0">
          <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h5 className="card-title mb-0">
                <i
                  className="ri-calendar-close-line text-danger align-bottom me-1"
                  aria-hidden="true"
                ></i>
                Gym Holidays
              </h5>
              <small className="text-muted">
                Days the gym is closed. Marked by an admin.
              </small>
            </div>
            <Link
              to="/holiday-master"
              className="btn btn-sm btn-soft-primary"
            >
              Open Holiday Master{" "}
              <i className="ri-arrow-right-line align-bottom" aria-hidden="true"></i>
            </Link>
          </CardHeader>
          <CardBody className="pt-2">
            <Row className="g-3">
              <Col lg={5} xl={4}>
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
              <Col lg={7} xl={8}>
                <h6 className="text-muted text-uppercase fs-12 mb-2">
                  Next closures
                </h6>
                {upcoming.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No closures marked from today onwards.
                  </p>
                ) : (
                  <Row className="g-2">
                    {upcoming.map((h) => (
                      <Col md={6} key={h._id}>
                        <div className="d-flex align-items-start gap-2 border rounded p-2 h-100">
                          <i
                            className="ri-calendar-close-line text-danger mt-1"
                            aria-hidden="true"
                          ></i>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{h.title}</div>
                            <div className="text-muted small">
                              {holidaySpanLabel(h)} · {branchLabel(h.branch)}
                            </div>
                            {h.note && (
                              <div className="text-muted small">{h.note}</div>
                            )}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default HolidayWidget;

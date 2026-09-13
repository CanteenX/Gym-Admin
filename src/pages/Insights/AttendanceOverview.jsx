import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
} from "reactstrap";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  getFootfall,
  getInGymNow,
  getNotCheckedIn,
} from "../../api/attendanceStaff.api";
import { listBranches } from "../../api/branches.api";
import BranchQrPanel from "./components/BranchQrPanel";
import FootfallPanel from "./components/FootfallPanel";
import InGymNowPanel from "./components/InGymNowPanel";
import NotCheckedInPanel from "./components/NotCheckedInPanel";
import { daysAgoInput, toInputDate } from "./insightsFormat";

/**
 * Attendance Overview — the staff-facing half of a feature that until now only
 * collected data. Members check themselves in from the portal; nobody could
 * see it.
 *
 * ============================================================================
 * WORDING: "CHECKED IN", NEVER "VISITED". THIS IS NOT A STYLE PREFERENCE.
 * ============================================================================
 * Check-in is unattended and self-reported. The branch QR is a printed sticker
 * that can be photographed, and the portal's button needs no QR at all, so a
 * row proves a button was pressed and nothing more; equally, plenty of members
 * train without logging anything. Every figure on this screen is therefore a
 * measure of LOGGING BEHAVIOUR, and the server repeats that in a `basis` string
 * on all three responses which the panels render verbatim.
 *
 * The consequence that matters: the "not checked in" list is a prompt to ring
 * somebody, not evidence they stopped coming. See NotCheckedInPanel.
 *
 * ============================================================================
 * BRANCH FILTER
 * ============================================================================
 * `physicalOnly` — members and attendance belong to a gym, never to the
 * "Common" cost bucket, so offering it here would only ever produce an empty
 * screen. Branch scoping itself is enforced server-side from the session: this
 * filter can narrow a super admin's view and is ignored for a branch admin.
 *
 * The live panel polls, because the API is a serverless function and cannot
 * hold a WebSocket open.
 *
 * ============================================================================
 * WHO IS BEING COUNTED — THE `subjectType` FILTER
 * ============================================================================
 * Trainer shifts live in the same Attendance collection as member check-ins,
 * behind a discriminator. Both the footfall and the live endpoints default to
 * MEMBER and fall back to MEMBER for anything they do not recognise, so a
 * screen that forgets to ask gets member figures — never a silent mixture.
 * This filter is what lets staff ask the other two questions, and the answer
 * carries its own `subjectType` back so the panels label what they actually
 * received rather than what was requested.
 *
 * It is NOT applied to the "not checked in" call list: that list is a roster of
 * active MEMBERS who have gone quiet, and a trainer has no membership to lapse.
 *
 * Refused scans are excluded from every figure on this screen, by the server.
 * A lapsed member tapping the sticker five times is five refusals and zero
 * arrivals; folding them into footfall would invent visits that did not happen.
 * They surface in the check-in CSV export instead, which has an explicit
 * "refused attempts" option.
 */

/** Matches the server's own "is this session still plausible" window. */
const LIVE_POLL_MS = 30000;

const NOT_CHECKED_IN_PER_PAGE = 25;

/**
 * The three populations the attendance endpoints can count.
 *
 * The values are the server's own vocabulary and are sent verbatim. "ALL"
 * deliberately has to be asked for by name — see the file header.
 */
const SUBJECT_TYPES = [
  { value: "MEMBER", label: "Members" },
  { value: "TRAINER", label: "Trainers" },
  { value: "ALL", label: "Members and trainers" },
];

const AttendanceOverview = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // Same reasoning as Website/WebsiteAdverts.jsx: a super admin short-circuits
  // both checkPermission on the server and PermissionProtected on the client,
  // so gating the UI on a MenuMaster permission row would hide controls the
  // server would happily honour and leave the owner staring at a screen with
  // its filters missing.
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true, print: true }
    : currentPagePermissions || { read: true };

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoInput(29));
  const [toDate, setToDate] = useState(toInputDate(new Date()));
  // Members by default, matching the server's default — so the first thing the
  // screen shows is the same number it has always shown.
  const [subjectType, setSubjectType] = useState("MEMBER");

  const [footfall, setFootfall] = useState(null);
  const [footfallLoading, setFootfallLoading] = useState(true);

  const [live, setLive] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);

  const [lapsed, setLapsed] = useState(null);
  const [lapsedLoading, setLapsedLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [page, setPage] = useState(0);

  // Guards the poll: a 30-second interval that fires while a tab is in the
  // background stacks requests behind a slow one and then applies them out of
  // order, so the count jumps backwards.
  const livePending = useRef(false);

  const loadFootfall = useCallback(async () => {
    setFootfallLoading(true);
    try {
      const res = await getFootfall({ fromDate, toDate, branch, subjectType });
      if (res.data?.isOk) setFootfall(res.data.data);
      else toast.error(res.data?.message || "Could not load check-in figures");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not load check-in figures",
      );
    } finally {
      setFootfallLoading(false);
    }
  }, [fromDate, toDate, branch, subjectType]);

  const loadLive = useCallback(async (showSpinner = false) => {
    if (livePending.current) return;
    livePending.current = true;
    if (showSpinner) setLiveLoading(true);
    try {
      const res = await getInGymNow({ branch, subjectType });
      if (res.data?.isOk) setLive(res.data.data);
    } catch {
      // A failed poll is not worth a toast every 30 seconds; the panel keeps
      // showing the last good reading rather than flashing an error.
    } finally {
      livePending.current = false;
      setLiveLoading(false);
    }
  }, [branch, subjectType]);

  const loadLapsed = useCallback(async () => {
    setLapsedLoading(true);
    try {
      const res = await getNotCheckedIn({
        days,
        branch,
        skip: page * NOT_CHECKED_IN_PER_PAGE,
        per_page: NOT_CHECKED_IN_PER_PAGE,
      });
      if (res.data?.isOk) setLapsed(res.data.data);
      else toast.error(res.data?.message || "Could not load the call list");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the call list");
    } finally {
      setLapsedLoading(false);
    }
  }, [days, branch, page]);

  useEffect(() => {
    listBranches(true)
      .then((r) => r.data?.isOk && setBranches(r.data.data || []))
      // An empty branch list degrades to "All branches", which is the correct
      // default anyway — it must not take the screen down with it.
      .catch((err) => console.error("Error loading branches:", err));
  }, []);

  useEffect(() => {
    loadFootfall();
  }, [loadFootfall]);

  useEffect(() => {
    loadLapsed();
  }, [loadLapsed]);

  useEffect(() => {
    loadLive(true);
    const timer = setInterval(() => loadLive(false), LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [loadLive]);

  const refreshAll = () => {
    loadFootfall();
    loadLive(true);
    loadLapsed();
  };

  const resetRange = () => {
    setFromDate(daysAgoInput(29));
    setToDate(toInputDate(new Date()));
    setBranch("");
    setSubjectType("MEMBER");
    setPage(0);
  };

  document.title = `Attendance Overview | ${adminData?.companyName || "Admin"}`;

  if (!permissions.read) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Attendance Overview" pageTitle="Insights" />
          <Card>
            <CardBody>
              <p className="text-muted mb-0">
                You do not have permission to view attendance.
              </p>
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <div className="d-print-none">
          <BreadCrumb title="Attendance Overview" pageTitle="Insights" />
        </div>

        {/* Every filter and panel on this screen is `d-print-none`. Printing
            from here means printing the branch QR sheets - a 30-day bar chart
            and a paginated call list are not something anybody wants on paper,
            and leaving them printable is how the sticker ends up on page four.
            The sheets themselves are `d-none d-print-block`; Bootstrap emits
            its print display utilities last, so that pair resolves correctly
            without any !important of ours. */}
        <Card className="mb-3 d-print-none">
          <CardBody>
            <Row className="g-2 align-items-end">
              <Col xs={6} md={4} lg={2}>
                <Label for="footfall-from" className="form-label mb-1 small">
                  From date
                </Label>
                <Input
                  id="footfall-from"
                  type="date"
                  bsSize="sm"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Col>
              <Col xs={6} md={4} lg={2}>
                <Label for="footfall-to" className="form-label mb-1 small">
                  To date
                </Label>
                <Input
                  id="footfall-to"
                  type="date"
                  bsSize="sm"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Col>
              <Col xs={12} md={4} lg={3}>
                <Label for="footfall-branch" className="form-label mb-1 small">
                  Branch
                </Label>
                <Input
                  id="footfall-branch"
                  type="select"
                  bsSize="sm"
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b._id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <Label for="footfall-subject" className="form-label mb-1 small">
                  Count
                </Label>
                <Input
                  id="footfall-subject"
                  type="select"
                  bsSize="sm"
                  value={subjectType}
                  onChange={(e) => setSubjectType(e.target.value)}
                >
                  {SUBJECT_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={12} md={6} lg={2} className="d-flex gap-2">
                <Button color="light" size="sm" onClick={resetRange}>
                  Reset
                </Button>
                <Button
                  color="light"
                  size="sm"
                  onClick={refreshAll}
                  aria-label="Refresh attendance figures"
                  title="Refresh attendance figures"
                >
                  <i className="ri-refresh-line align-bottom" aria-hidden="true" />
                </Button>
              </Col>
            </Row>
            {subjectType !== "MEMBER" ? (
              <p className="text-muted small mb-0 mt-2">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                The call list below always covers members only - a trainer has no
                membership to lapse.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Row className="g-3 d-print-none">
          <Col xl={8}>
            <FootfallPanel data={footfall} loading={footfallLoading} />
          </Col>
          <Col xl={4}>
            <InGymNowPanel data={live} loading={liveLoading} />
          </Col>
        </Row>

        <Row className="g-3 mt-1 d-print-none">
          <Col xs={12}>
            <NotCheckedInPanel
              data={lapsed}
              loading={lapsedLoading}
              days={days}
              onDaysChange={(d) => {
                setDays(d);
                setPage(0);
              }}
              page={page}
              perPage={NOT_CHECKED_IN_PER_PAGE}
              onPageChange={setPage}
            />
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12}>
            <BranchQrPanel
              branches={branches}
              orgName={adminData?.companyName || ""}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AttendanceOverview;

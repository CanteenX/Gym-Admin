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
  markAttendanceAllowed,
} from "../../api/attendanceStaff.api";
import { listBranches } from "../../api/branches.api";
import BranchQrPanel from "./components/BranchQrPanel";
import DenialsPanel from "./components/DenialsPanel";
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
 * Refused scans are excluded from every FIGURE on this screen, by the server.
 * A lapsed member tapping the sticker five times is five refusals and zero
 * arrivals; folding them into footfall would invent visits that did not happen.
 *
 * ============================================================================
 * BUT THEY ARE NOT HIDDEN — THEY ARE THE FIRST THING ON THE PAGE.
 * ============================================================================
 * Excluded from the counts is not the same as out of sight. A refusal is the
 * only row on this screen that somebody has to act on: nobody is at the door,
 * so a member whose record says expired was simply told on their own phone that
 * their membership had lapsed, with nobody there to help. DenialsPanel is
 * therefore rendered above the in-gym list, not beside it, and it carries the
 * one write this screen can perform.
 *
 * ============================================================================
 * WHY `since` IS STILL NOT SENT, AND WHAT THAT COSTS.
 * ============================================================================
 * /attendance/live accepts a `since` cursor that would keep each poll's payload
 * near-empty. It is deliberately not used, because the SAME parameter also
 * narrows `sessions` to arrivals after that instant — the in-gym list would
 * empty out thirty seconds after the screen loaded, which is the opposite of
 * what that panel is for.
 *
 * The cost is that the server's `deniedNew` is not usable here: with no cursor
 * it is simply the length of the list, which equals `deniedToday` on every
 * poll. So "what is new since you last looked" is worked out below by diffing
 * each poll against the previous one, on `_id` AND `lastAttemptAt` — the second
 * half matters because a member refused again at 07:31 updates today's existing
 * row rather than creating a second one, so a diff on ids alone would miss
 * every repeat attempt.
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

  /**
   * Which refusals are new since the previous poll, and whether there has been
   * a previous poll at all.
   *
   * `hasBaseline` is false until the second reading, and the panel then says
   * nothing about freshness rather than claiming zero: on the very first poll
   * there is nothing to compare against, so every row is equally unseen and
   * none of them can honestly be called new.
   */
  const [denialDelta, setDenialDelta] = useState({
    hasBaseline: false,
    freshIds: [],
  });

  /** The row currently being written by the override, or "". */
  const [overridingId, setOverridingId] = useState("");

  const [lapsed, setLapsed] = useState(null);
  const [lapsedLoading, setLapsedLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [page, setPage] = useState(0);

  // Guards the poll: a 30-second interval that fires while a tab is in the
  // background stacks requests behind a slow one and then applies them out of
  // order, so the count jumps backwards.
  const livePending = useRef(false);

  /**
   * The previous poll's refusals, as `_id -> lastAttemptAt`. A ref rather than
   * state because nothing renders from it directly and writing it must not
   * schedule a render of its own every thirty seconds.
   *
   * `null` means "no baseline" — the first poll, or the moment the branch or
   * subject filter changed and the list now describes a different population.
   * Keeping a stale baseline across a filter change would light up every row
   * as new because the previous map simply does not contain any of them.
   */
  const seenDenials = useRef(null);

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
      if (res.data?.isOk) {
        const next = res.data.data || {};
        const rows = next.denials || [];
        const previous = seenDenials.current;

        /**
         * The fingerprint is the LAST ATTEMPT, not the id. A repeat refusal
         * cannot create a second row — the unique { memberId, date } index
         * forbids it — so the server updates today's row in place and leaves
         * `deniedAt` at the first refusal of the day. A member refused at
         * 07:00 who tries again at 07:31 would therefore be invisible to a
         * diff on ids alone, and the second attempt would pass unnoticed
         * between polls.
         */
        const attempt = (d) => String(d.lastAttemptAt || d.deniedAt || "");
        setDenialDelta({
          hasBaseline: Boolean(previous),
          freshIds: previous
            ? rows
                .filter((d) => previous.get(String(d._id)) !== attempt(d))
                .map((d) => String(d._id))
            : [],
        });
        // A new Map, never an edit of the old one: the comparison above still
        // holds a reference to it while this line runs.
        seenDenials.current = new Map(
          rows.map((d) => [String(d._id), attempt(d)]),
        );

        setLive(next);
      }
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
    /**
     * `loadLive` changes identity exactly when `branch` or `subjectType` does,
     * which is exactly when the refusal list starts describing a different set
     * of people — so this is the right place to drop the baseline. A manual
     * Refresh deliberately does NOT come through here and therefore keeps it,
     * which is what makes "new since the last refresh" honest for a person who
     * pressed the button rather than waited.
     */
    seenDenials.current = null;
    setDenialDelta({ hasBaseline: false, freshIds: [] });

    loadLive(true);
    const timer = setInterval(() => loadLive(false), LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [loadLive]);

  /**
   * Clear one refusal — the only write on this screen.
   *
   * ============================================================================
   * `alreadyOverridden` IS A SUCCESS. TWO PEOPLE AT THE DESK IS THE NORMAL CASE.
   * ============================================================================
   * The server is idempotent by checking "is this still a refusal", not "have I
   * seen this before", so a second press writes nothing at all: no second audit
   * row, no double-counted visit. It answers 200 with the same body plus the
   * flag. Toasted as information, never as an error — a red banner would teach
   * the desk that working alongside a colleague is a mistake.
   *
   * ============================================================================
   * THE OUTCOME SENTENCES COME BACK FROM THE SERVER AND ARE PASSED THROUGH.
   * ============================================================================
   * Whether the row became a live session or was only cleared depends on
   * whether the refusal is from today, and the server owns that comparison
   * against the row's normalised `date`. It returns `sessionOpened` alongside
   * plain-English `message` and `effect` strings. They are handed to the panel
   * as-is: re-deriving the wording here from a timestamp is how the desk ends
   * up being told a member is in the gym when no session was opened.
   */
  const markAllowed = useCallback(
    async (denial, note) => {
      const id = String(denial?._id || "");
      if (!id) return null;

      setOverridingId(id);
      try {
        const res = await markAttendanceAllowed(id, {
          note,
          /**
           * The same population that produced the row. Every query over the
           * Attendance collection defaults to MEMBER, so a trainer's refused
           * shift has to be asked for by name or the lookup 404s — and a 404
           * here is indistinguishable from "another branch's row", which is
           * deliberate on the server and would be baffling on screen.
           */
          subjectType,
        });

        const body = res.data || {};
        if (!body.isOk) {
          const message =
            body.message || "Could not clear this refused check-in";
          toast.error(message);
          return { ok: false, message };
        }

        const payload = body.data || {};
        const outcome = {
          ok: true,
          alreadyOverridden: Boolean(payload.alreadyOverridden),
          sessionOpened: Boolean(payload.sessionOpened),
          message: body.message || "",
          effect: payload.effect || "",
        };

        if (outcome.alreadyOverridden) toast.info(outcome.message);
        else toast.success(outcome.message);

        // Pull the feed forward rather than waiting out the rest of the 30s:
        // the row has stopped being a refusal and should leave the list while
        // the person who cleared it is still looking at it.
        loadLive(false);

        return outcome;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          "Could not clear this refused check-in";
        toast.error(message);
        return { ok: false, message };
      } finally {
        setOverridingId("");
      }
    },
    [subjectType, loadLive],
  );

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

        {/* FIRST on the page, and full width, because these are the only rows
            here that somebody has to act on. Everything below is a person
            happily training or a number to glance at. */}
        <Row className="g-3 d-print-none">
          <Col xs={12}>
            <DenialsPanel
              data={live}
              loading={liveLoading}
              freshIds={denialDelta.freshIds}
              hasBaseline={denialDelta.hasBaseline}
              /* The override needs `edit`; the rest of this screen needs only
                 `read`. `edit` is granted to nobody by default, so until a
                 MenuMaster row says otherwise this button belongs to the super
                 admin alone — expected, not a bug. */
              canOverride={Boolean(permissions.edit)}
              busyId={overridingId}
              onMarkAllowed={markAllowed}
            />
          </Col>
        </Row>

        <Row className="g-3 mt-1 d-print-none">
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

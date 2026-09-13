import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Row,
} from "reactstrap";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { listBranches } from "../../api/branches.api";
import { listAllTrainers } from "../../api/trainers.api";
import {
  createClassSession,
  deleteClassSession,
  getClassRoster,
  searchClassBookings,
  searchClassSessions,
  updateBookingStatus,
  updateClassSession,
} from "../../api/classSessions.api";
import { unwrapList } from "@/utils/listResponse";
import SessionList from "./sessions/SessionList";
import SessionForm, {
  emptySession,
  validateSession,
} from "./sessions/SessionForm";
import RosterPanel from "./sessions/RosterPanel";
import BookingsList from "./sessions/BookingsList";
import CancelBookingModal from "./sessions/CancelBookingModal";
import ForceDeleteModal from "./sessions/ForceDeleteModal";
import { BookingFilters, ClassFilters } from "./sessions/ListFilters";
import { toApiDate, toLocalInput } from "./classesFormat";

/**
 * Class Sessions — the bookable gym diary.
 *
 * Three views behind one route (`/class-sessions`, which must stay spelled
 * exactly like the MenuMaster row or checkPermission and PermissionProtected
 * disagree about the same screen): the class list, the create/edit form, and
 * one class's roster.
 *
 * ============================================================================
 * WHAT THIS SCREEN DOES NOT DO: TAKE A BOOKING.
 * ============================================================================
 * There is no "add booking" button and that is deliberate. A place is only ever
 * taken through the website's free-trial form or the member portal, because the
 * capacity counter is moved exclusively by the atomic reservation behind those
 * two endpoints. A panel that inserted a Booking row directly would leave
 * `bookedCount` behind and oversell the class. Staff mark what happened; they do
 * not manufacture seats.
 */
const apiMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const ClassSessions = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);

  /**
   * A super admin has full access whatever MenuMaster says: checkPermission
   * returns next() immediately for role === "ADMIN" and PermissionProtected
   * short-circuits on isAdmin. Gating the UI on a permission row would hide
   * buttons the server would happily honour — which is exactly what happened on
   * the Website menus, where the owner was told to click a button that was not
   * rendered.
   */
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true }
    : currentPagePermissions || {
        read: true,
        write: true,
        edit: true,
        delete: true,
      };

  const [view, setView] = useState("list");
  const [tab, setTab] = useState("classes");

  const [branches, setBranches] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // ---------------------------------------------------------------- classes
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setColumn] = useState("start");
  const [sortDirection, setSortDirection] = useState("asc");
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  // ------------------------------------------------------------------- form
  const [values, setValues] = useState(emptySession);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------------------- delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [forceState, setForceState] = useState(null);
  const [forceBusy, setForceBusy] = useState(false);

  // ----------------------------------------------------------------- roster
  const [roster, setRoster] = useState(null);
  const [rosterId, setRosterId] = useState("");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [markingId, setMarkingId] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // --------------------------------------------------------------- bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPerPage, setBookingsPerPage] = useState(10);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsColumn, setBookingsColumn] = useState("sessionStart");
  const [bookingsDirection, setBookingsDirection] = useState("desc");
  const [bookingsQuery, setBookingsQuery] = useState("");
  const [bookingsStatus, setBookingsStatus] = useState("");

  useEffect(() => {
    // Physical branches only — "Common" is an accounting bucket for shared
    // costs, not a room a class can be held in, and the server refuses it.
    listBranches(true)
      .then((r) => r.data?.isOk && setBranches(r.data.data || []))
      // An empty list degrades to a free-standing branch value on the form
      // rather than taking the screen down with it.
      .catch((err) => console.error("Error loading branches:", err));
    listAllTrainers()
      .then((r) => r.data?.isOk && setTrainers(r.data.data || []))
      .catch((err) => console.error("Error loading trainers:", err));
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const skip = Math.max(0, (pageNo - 1) * perPage);
    try {
      const response = await searchClassSessions({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        // Only sent when set. A branch admin's own branch wins server-side
        // whatever travels here; this can narrow a super admin's view, never
        // widen anybody's.
        ...(branchFilter ? { branch: branchFilter } : {}),
        ...(activeFilter ? { isActive: activeFilter } : {}),
        ...(upcomingOnly ? { upcomingOnly: true } : {}),
      });
      const { rows, count } = unwrapList(response);
      setSessions(rows);
      setTotalRows(count);
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not load classes"));
      setSessions([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [
    pageNo,
    perPage,
    column,
    sortDirection,
    query,
    branchFilter,
    activeFilter,
    upcomingOnly,
  ]);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    const skip = Math.max(0, (bookingsPage - 1) * bookingsPerPage);
    try {
      const response = await searchClassBookings({
        skip,
        per_page: bookingsPerPage,
        sorton: bookingsColumn,
        sortdir: bookingsDirection,
        match: bookingsQuery,
        ...(bookingsStatus ? { status: bookingsStatus } : {}),
        ...(branchFilter ? { branch: branchFilter } : {}),
      });
      const { rows, count } = unwrapList(response);
      setBookings(rows);
      setBookingsTotal(count);
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not load bookings"));
      setBookings([]);
      setBookingsTotal(0);
    } finally {
      setBookingsLoading(false);
    }
  }, [
    bookingsPage,
    bookingsPerPage,
    bookingsColumn,
    bookingsDirection,
    bookingsQuery,
    bookingsStatus,
    branchFilter,
  ]);

  useEffect(() => {
    if (view === "list" && tab === "classes") fetchSessions();
  }, [view, tab, fetchSessions]);

  useEffect(() => {
    if (view === "list" && tab === "bookings") fetchBookings();
  }, [view, tab, fetchBookings]);

  // ------------------------------------------------------------- form flows

  const backToList = () => {
    setView("list");
    setEditing(null);
    setValues(emptySession);
    setFormErrors({});
    setIsSubmit(false);
  };

  const openAddForm = () => {
    setEditing(null);
    setFormErrors({});
    setIsSubmit(false);
    setValues({
      ...emptySession,
      // Only fills a blank; a branch admin's choice is overridden server-side
      // anyway, and a super admin must pick one because there is no sensible
      // default and silently picking the first gym puts classes in the wrong one.
      branch: branches.length === 1 ? branches[0].name : "",
    });
    setView("form");
  };

  const openEditForm = (row) => {
    setEditing(row);
    setFormErrors({});
    setIsSubmit(false);
    setValues({
      title: row.title || "",
      description: row.description || "",
      notes: row.notes || "",
      branch: row.branch || "",
      // The populate returns an object; the form posts an id.
      trainer: row.trainer?._id || row.trainer || "",
      start: toLocalInput(row.start),
      durationMinutes: row.durationMinutes ?? 60,
      capacity: row.capacity ?? 20,
      allowGuests: row.allowGuests !== false,
      isActive: row.isActive !== false,
    });
    setView("form");
  };

  const handleChange = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  };

  const handleCheck = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.checked }));
  };

  /**
   * `bookedCount` is never sent: it belongs to the capacity service, and the
   * server sets it explicitly to 0 on create so a stray field cannot reach the
   * document through a spread.
   */
  const buildPayload = () => ({
    title: String(values.title).trim(),
    description: String(values.description || "").trim(),
    notes: String(values.notes || "").trim(),
    branch: values.branch,
    // An empty string means "no trainer"; the server reads "" and null alike.
    trainer: values.trainer || "",
    start: toApiDate(values.start),
    durationMinutes: Number(values.durationMinutes) || 60,
    capacity: Number(values.capacity),
    allowGuests: Boolean(values.allowGuests),
    isActive: Boolean(values.isActive),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateSession(values, editing);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const res = editing
        ? await updateClassSession(editing._id, buildPayload())
        : await createClassSession(buildPayload());
      if (res.data.isOk) {
        toast.success(
          res.data.message || (editing ? "Class updated" : "Class scheduled"),
        );
        // backToList() flips `view`, which is a dependency of the list effect,
        // so the reload happens there — calling it here too double-fires it.
        backToList();
      } else {
        toast.error(res.data.message || "Could not save the class");
      }
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not save the class"));
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------- delete flows

  const askDelete = (row) => {
    setDeleteTarget(row);
  };

  /**
   * First attempt is always UNFORCED.
   *
   * A 409 with `code: "HAS_BOOKINGS"` is not an error to retry — it is the
   * server asking whether other people's plans may be deleted, and it comes
   * with the count. Retrying with `force` here would answer that question on
   * the user's behalf, silently. So the count is handed to ForceDeleteModal.
   */
  const handleDelete = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!deleteTarget) return;

    setIsDeleteLoading(true);
    try {
      const res = await deleteClassSession(deleteTarget._id);
      if (res.data.isOk) {
        toast.success(res.data.message || "Class deleted");
        setDeleteTarget(null);
        fetchSessions();
      } else {
        toast.error(res.data.message || "Could not delete the class");
      }
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.code === "HAS_BOOKINGS") {
        setForceState({
          session: deleteTarget,
          bookings: Number(data.bookings) || 0,
          message: data.message || "",
        });
        setDeleteTarget(null);
      } else {
        console.error(err);
        toast.error(apiMessage(err, "Could not delete the class"));
      }
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleForceDelete = async () => {
    if (!forceState?.session) return;
    setForceBusy(true);
    try {
      const res = await deleteClassSession(forceState.session._id, true);
      if (res.data.isOk) {
        toast.success("Class and its bookings deleted");
        setForceState(null);
        fetchSessions();
      } else {
        toast.error(res.data.message || "Could not delete the class");
      }
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not delete the class"));
    } finally {
      setForceBusy(false);
    }
  };

  /** The safe way out of the same dialog: hide it, keep every booking. */
  const handleSwitchOff = async () => {
    if (!forceState?.session) return;
    setForceBusy(true);
    try {
      const res = await updateClassSession(forceState.session._id, {
        isActive: false,
      });
      if (res.data.isOk) {
        toast.success("Class switched off — its bookings are untouched");
        setForceState(null);
        fetchSessions();
      } else {
        toast.error(res.data.message || "Could not switch the class off");
      }
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not switch the class off"));
    } finally {
      setForceBusy(false);
    }
  };

  // ----------------------------------------------------------- roster flows

  const loadRoster = useCallback(async (id) => {
    if (!id) return;
    setRosterLoading(true);
    try {
      const res = await getClassRoster(id);
      if (res.data.isOk) setRoster(res.data.data);
      else toast.error(res.data.message || "Could not load the roster");
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not load the roster"));
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const openRoster = (row) => {
    setRoster(null);
    setRosterId(row._id);
    setView("roster");
    loadRoster(row._id);
  };

  /**
   * No explicit refetch here, and that is not an oversight: `view` is a
   * dependency of both list effects, so returning to the list re-runs the fetch
   * on its own. Calling it here as well fired every list query twice — which
   * matters, because the counter really does move while a roster is open (a
   * cancellation frees a seat) and the stale-list problem is real; it is just
   * already solved.
   */
  const closeRoster = () => {
    setView("list");
    setRoster(null);
    setRosterId("");
  };

  /**
   * Marks one booking. Reinstating is the one action that can legitimately
   * fail — it has to take a seat back, and the class may be full by now — so
   * the server's message is surfaced rather than a generic failure.
   */
  const markBooking = async (booking, status, reason = "") => {
    setMarkingId(booking._id);
    try {
      const res = await updateBookingStatus(booking._id, status, reason);
      if (res.data.isOk) {
        toast.success(res.data.message || `Booking marked ${status}`);
        await loadRoster(rosterId);
      } else {
        toast.error(res.data.message || "Could not update the booking");
      }
      return res.data.isOk;
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, "Could not update the booking"));
      return false;
    } finally {
      setMarkingId("");
    }
  };

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    const done = await markBooking(cancelTarget, "CANCELLED", cancelReason);
    if (done) {
      setCancelTarget(null);
      setCancelReason("");
    }
  };

  // ------------------------------------------------------------------ chrome

  const headerTitle = useMemo(() => {
    if (view === "form") return editing ? "Edit Class" : "Add Class";
    if (view === "roster") return "Class Roster";
    return "Class Sessions";
  }, [view, editing]);

  document.title = `Class Sessions | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Gym"
            title="Class Sessions"
            pageTitle="Class Sessions"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">{headerTitle}</h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {view === "list" ? (
                      <>
                        <div
                          className="btn-group btn-group-sm"
                          role="group"
                          aria-label="Choose what to list"
                        >
                          <button
                            type="button"
                            className={`btn ${
                              tab === "classes" ? "btn-success" : "btn-light"
                            }`}
                            aria-pressed={tab === "classes"}
                            onClick={() => setTab("classes")}
                          >
                            Classes
                          </button>
                          <button
                            type="button"
                            className={`btn ${
                              tab === "bookings" ? "btn-success" : "btn-light"
                            }`}
                            aria-pressed={tab === "bookings"}
                            onClick={() => setTab("bookings")}
                          >
                            Bookings
                          </button>
                        </div>

                        <Button
                          color="light"
                          size="sm"
                          onClick={
                            tab === "classes" ? fetchSessions : fetchBookings
                          }
                          title="Reload"
                          aria-label={
                            tab === "classes"
                              ? "Reload classes"
                              : "Reload bookings"
                          }
                        >
                          <i className="ri-refresh-line" aria-hidden="true"></i>
                        </Button>

                        {tab === "classes" && permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={openAddForm}
                          >
                            <i
                              className="ri-add-line align-bottom"
                              aria-hidden="true"
                            ></i>{" "}
                            Add Class
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button color="dark" size="sm" onClick={backToList}>
                        <i
                          className="ri-list-check-2 align-bottom"
                          aria-hidden="true"
                        ></i>{" "}
                        List
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardBody>
                  {view === "form" ? (
                    <SessionForm
                      values={values}
                      errors={formErrors}
                      isSubmit={isSubmit}
                      editing={editing}
                      branches={branches}
                      trainers={trainers}
                      saving={saving}
                      onChange={handleChange}
                      onCheck={handleCheck}
                      onSubmit={handleSubmit}
                      onCancel={backToList}
                    />
                  ) : view === "roster" ? (
                    <RosterPanel
                      roster={roster}
                      loading={rosterLoading}
                      permissions={permissions}
                      markingId={markingId}
                      onBack={closeRoster}
                      onRefresh={() => loadRoster(rosterId)}
                      onMark={markBooking}
                      onRequestCancel={(booking) => {
                        setCancelReason("");
                        setCancelTarget(booking);
                      }}
                    />
                  ) : tab === "classes" ? (
                    <>
                      <ClassFilters
                        query={query}
                        branch={branchFilter}
                        branches={branches}
                        activeFilter={activeFilter}
                        upcomingOnly={upcomingOnly}
                        onQueryChange={(next) => {
                          setQuery(next);
                          setPageNo(1);
                        }}
                        onBranchChange={(next) => {
                          setBranchFilter(next);
                          setPageNo(1);
                          setBookingsPage(1);
                        }}
                        onActiveChange={(next) => {
                          setActiveFilter(next);
                          setPageNo(1);
                        }}
                        onUpcomingChange={(next) => {
                          setUpcomingOnly(next);
                          setPageNo(1);
                        }}
                      />

                      <SessionList
                        rows={sessions}
                        loading={loading}
                        permissions={permissions}
                        totalRows={totalRows}
                        perPage={perPage}
                        pageNo={pageNo}
                        onSort={(col, direction) => {
                          setColumn(col.sortField || "start");
                          setSortDirection(direction);
                        }}
                        onChangePage={(page) => setPageNo(page)}
                        onChangeRowsPerPage={(next) => {
                          setPerPage(next);
                          setPageNo(1);
                        }}
                        onOpenRoster={openRoster}
                        onEdit={openEditForm}
                        onDelete={askDelete}
                      />
                    </>
                  ) : (
                    <>
                      <BookingFilters
                        query={bookingsQuery}
                        status={bookingsStatus}
                        onQueryChange={(next) => {
                          setBookingsQuery(next);
                          setBookingsPage(1);
                        }}
                        onStatusChange={(next) => {
                          setBookingsStatus(next);
                          setBookingsPage(1);
                        }}
                      />

                      <BookingsList
                        rows={bookings}
                        loading={bookingsLoading}
                        totalRows={bookingsTotal}
                        perPage={bookingsPerPage}
                        pageNo={bookingsPage}
                        onSort={(col, direction) => {
                          setBookingsColumn(col.sortField || "sessionStart");
                          setBookingsDirection(direction);
                        }}
                        onChangePage={(page) => setBookingsPage(page)}
                        onChangeRowsPerPage={(next) => {
                          setBookingsPerPage(next);
                          setBookingsPage(1);
                        }}
                        onOpenRoster={openRoster}
                      />
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <DeleteModal
        show={Boolean(deleteTarget)}
        handleDelete={handleDelete}
        toggle={() => setDeleteTarget(null)}
        setmodal_delete={() => setDeleteTarget(null)}
        disabled={isDeleteLoading}
      />

      <ForceDeleteModal
        session={forceState?.session || null}
        bookings={forceState?.bookings || 0}
        serverMessage={forceState?.message || ""}
        busy={forceBusy}
        canEdit={Boolean(permissions.edit)}
        onSwitchOff={handleSwitchOff}
        onForceDelete={handleForceDelete}
        onClose={() => setForceState(null)}
      />

      <CancelBookingModal
        booking={cancelTarget}
        reason={cancelReason}
        busy={Boolean(markingId)}
        onReasonChange={setCancelReason}
        onConfirm={confirmCancelBooking}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason("");
        }}
      />
    </React.Fragment>
  );
};

export default ClassSessions;

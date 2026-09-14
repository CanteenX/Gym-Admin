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
  Nav,
  NavItem,
  NavLink,
  Row,
} from "reactstrap";
import { toast } from "react-toastify";
import DataTable from "@/Components/Common/DataTableBase";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import {
  addMonths,
  expandHolidayDays,
  startOfMonth,
  toDateInput,
  toLocalKey,
} from "../../Components/Common/holidayFormat";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { listBranches } from "../../api/branches.api";
import {
  createHoliday,
  deleteHoliday,
  getHolidayCalendar,
  searchHolidays,
  updateHoliday,
} from "../../api/holidays.api";
import HolidayForm, {
  holidayInitialState,
  validateHoliday,
} from "./holidays/HolidayForm";
import HolidayFilters from "./holidays/HolidayFilters";
import HolidayCalendarPanel from "./holidays/HolidayCalendarPanel";
import { buildHolidayColumns } from "./holidays/holidayColumns";

/**
 * The menuUrl this screen is gated by, server-side AND client-side.
 *
 * It must stay byte-identical to the route path in Routes/allRoutes.jsx, to
 * the MenuMaster row seeded by Gym-Server/scripts/seedHolidayMenu.js and to the
 * string routes/v1/holidays.routes.js passes to checkPermission. The three only
 * agree while they are spelled the same; a rename in one place does not error,
 * it silently 403s every non-super-admin on a screen that is still in their
 * sidebar.
 */
const HOLIDAY_MENU_URL = "/holiday-master";

const NO_PERMISSIONS = {
  read: false,
  write: false,
  edit: false,
  delete: false,
};

/**
 * Holiday Master — the days the gym is shut.
 *
 * ============================================================================
 * PERMISSIONS: HIDDEN, NOT DISABLED.
 * ============================================================================
 * The owner's brief for this screen was about who may CHANGE it: super admins
 * and branch admins yes, employees no — "basically it's just checkbox
 * unchecked". So an employee holding read alone must get a clean list and
 * calendar, with Add / Edit / Delete ABSENT. A disabled button is still a
 * button: it is announced to a screen reader, it invites a click, and it
 * advertises a capability the person does not have.
 *
 * The permission is resolved the way Routes/PermissionProtected.jsx resolves
 * it — findMenuIdByUrlInComplete() against the COMPLETE menu tree, then
 * getPermissionsForMenu() — and not from `currentPagePermissions`, for two
 * reasons. First, `currentPagePermissions` is refreshed from
 * globalThis.location.pathname on menu load and from the sidebar's click
 * handler, so it can lag a navigation that came from anywhere else (a <Link>,
 * the back button, a pasted URL). Second, and this is the one that matters:
 * the neighbouring screens pair it with a `|| { read: true, write: true, … }`
 * fallback, which fails OPEN — the moment the context is missing, every button
 * appears. This resolution fails closed.
 *
 * The client gate is a UX decision, never the security boundary. All five
 * endpoints behind this screen are checkPermission'd on the server, so hiding
 * a button hides a button; it does not grant anything.
 */
const HolidayMaster = () => {
  const { adminData } = useContext(AuthContext);
  const {
    findMenuIdByUrlInComplete,
    getPermissionsForMenu,
    loading: menuLoading,
  } = useContext(MenuContext) || {};

  const permissions = useMemo(() => {
    if (
      typeof findMenuIdByUrlInComplete !== "function" ||
      typeof getPermissionsForMenu !== "function"
    ) {
      return NO_PERMISSIONS;
    }
    const menuId = findMenuIdByUrlInComplete(HOLIDAY_MENU_URL);
    // A super admin short-circuits inside getPermissionsForMenu and gets every
    // flag regardless of menuId, which is why this is not gated on `menuId`
    // having been found.
    return getPermissionsForMenu(menuId) || NO_PERMISSIONS;
  }, [findMenuIdByUrlInComplete, getPermissionsForMenu]);

  /**
   * Who may file a holiday against which branch — mirroring
   * Gym-Server/services/holidayScope.js exactly rather than approximating it.
   *
   * The server derives this from scopedBranch(req), which is null both for a
   * real super admin AND for any session carrying no branch at all; null there
   * means unrestricted. `ownBranch` reproduces that same null, so a branchless
   * admin is not wrongly locked out of rows the server would let them edit.
   */
  const isSuperAdmin = adminData?.isSuperAdmin === true;
  const ownBranch = adminData?.branch || null;

  /**
   * A branch admin may READ an all-branches closure but may not CHANGE one —
   * the write path uses plain scopeFilter(), so editing a `branch: null` row as
   * a Gotri admin 404s. Hiding the buttons on those rows is the difference
   * between "that is not mine to change" and "this screen is broken".
   */
  const canModifyRow = useCallback(
    (row) => isSuperAdmin || !ownBranch || row?.branch === ownBranch,
    [isSuperAdmin, ownBranch],
  );

  const [activeTab, setActiveTab] = useState("list");

  // ------------------------------------------------------------ list state
  const [holidays, setHolidays] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);

  // ------------------------------------------------------- calendar state
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [monthHolidays, setMonthHolidays] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  // ----------------------------------------------------------- form state
  const [values, setValues] = useState(holidayInitialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [removeId, setRemoveId] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [branches, setBranches] = useState([]);

  /**
   * Only a super admin is offered a branch choice, so only a super admin needs
   * the list. `physicalOnly` because "Common" is a bookkeeping bucket, not a
   * floor that can be shut — the server's resolveHolidayBranch() rejects it,
   * so offering it would be an option that always fails.
   */
  useEffect(() => {
    if (!isSuperAdmin) return;
    listBranches(true)
      .then((res) => {
        if (res.data?.isOk) setBranches(res.data.data || []);
      })
      .catch((err) => {
        console.error("Could not load branches:", err);
      });
  }, [isSuperAdmin]);

  const fetchHolidays = useCallback(async () => {
    if (!permissions.read) return;
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const res = await searchHolidays({
        skip,
        per_page: perPage,
        match: query,
        sorton: "date",
        sortdir: "asc",
        from: fromDate || undefined,
        to: toDate || undefined,
        branch: branchFilter || undefined,
        // "" is "any status" and must not be sent: the server reads isActive
        // through a permissive toBool(), so an empty string would be coerced
        // rather than ignored and the filter would stick on one value.
        isActive: statusFilter === "" ? undefined : statusFilter === "active",
      });
      const payload = res.data?.data;
      if (Array.isArray(payload) && payload.length > 0) {
        setHolidays(payload[0].data || []);
        setTotalRows(payload[0].count || 0);
      } else {
        setHolidays([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error("Could not load holidays:", err);
      toast.error(
        err.response?.data?.message || "Could not load the holiday list",
      );
    } finally {
      setLoading(false);
    }
  }, [
    permissions.read,
    pageNo,
    perPage,
    query,
    fromDate,
    toDate,
    branchFilter,
    statusFilter,
  ]);

  /**
   * Only fetched while the calendar tab is actually showing. The effect below
   * depends on this callback and this callback depends on `activeTab`, so
   * switching to the calendar refetches on arrival — which is also why a save
   * made while the list tab is up needs no refresh of its own to be correct
   * here.
   */
  const fetchCalendar = useCallback(async () => {
    if (!permissions.read || activeTab !== "calendar") return;
    setCalendarLoading(true);
    setCalendarError("");
    try {
      const res = await getHolidayCalendar({
        year: cursor.getFullYear(),
        // The endpoint wants a human month, 1-12 — getMonth() is 0-11 and would
        // quietly render the previous month.
        month: cursor.getMonth() + 1,
        branch: branchFilter || undefined,
      });
      if (res.data?.isOk) {
        setMonthHolidays(res.data.data?.holidays || []);
      } else {
        setMonthHolidays([]);
        setCalendarError(res.data?.message || "Could not load the calendar");
      }
    } catch (err) {
      console.error("Could not load holiday calendar:", err);
      setMonthHolidays([]);
      setCalendarError(
        err.response?.data?.message || "Could not reach the server",
      );
    } finally {
      setCalendarLoading(false);
    }
  }, [permissions.read, activeTab, cursor, branchFilter]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const holidaysByDay = useMemo(
    () => expandHolidayDays(monthHolidays),
    [monthHolidays],
  );

  // --------------------------------------------------------- form handlers

  const closeForm = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(holidayInitialState);
    setFormErrors({});
    setIsSubmit(false);
    setSelectedId("");
  };

  const openAddForm = (prefillDate = "") => {
    setShowForm(true);
    setUpdateForm(false);
    setSelectedId("");
    setFormErrors({});
    setIsSubmit(false);
    setValues({
      ...holidayInitialState,
      date: prefillDate,
      // A super admin's default is "all branches" (the common case: a festival
      // both branches observe). A branch admin never sees this field, and the
      // server overrides it from their session anyway.
      branch: "",
    });
  };

  const openEditForm = (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setSelectedId(row._id);
    setFormErrors({});
    setIsSubmit(false);
    setValues({
      title: row.title || "",
      date: toDateInput(row.date),
      isMultiDay: Boolean(row.endDate),
      endDate: toDateInput(row.endDate),
      note: row.note || "",
      branch: row.branch || "",
      isActive: row.isActive !== false,
    });
  };

  /**
   * `endDate` is sent as an explicit null for a single-day holiday rather than
   * omitted. On an update the server only touches fields that are present, so
   * omitting it would leave an old range in place and make "shorten this to one
   * day" silently do nothing.
   *
   * `branch` is only sent when the picker was actually shown. A branch admin's
   * value would be discarded server-side regardless, and sending a field the
   * user was never offered is how a UI starts lying about what it did.
   */
  const toPayload = (v) => {
    const payload = {
      title: v.title.trim(),
      date: v.date,
      endDate: v.isMultiDay && v.endDate ? v.endDate : null,
      note: v.note || "",
      isActive: v.isActive,
    };
    if (isSuperAdmin) payload.branch = v.branch || null;
    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateHoliday(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    const call = updateForm
      ? updateHoliday(selectedId, toPayload(values))
      : createHoliday(toPayload(values));

    call
      .then((res) => {
        if (res.data.isOk) {
          toast.success(res.data.message || "Holiday saved");
          closeForm();
          fetchHolidays();
          // The calendar is a second view of the same rows, so it is refetched
          // too rather than left showing the state before the edit. It
          // no-ops when the list tab is up; see fetchCalendar.
          fetchCalendar();
        } else {
          toast.error(res.data.message || "Save failed");
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || "Save failed"))
      .finally(() => setIsSaving(false));
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteHoliday(removeId);
      if (res.data.isOk) {
        toast.success(res.data.message || "Holiday deleted");
        fetchHolidays();
        fetchCalendar();
      } else {
        toast.error(res.data.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setIsDeleteLoading(false);
      setmodal_delete(false);
    }
  };

  /**
   * Clicking a day. Only wired up at all when the viewer can write or edit —
   * see `onSelectDay` below — so a read-only employee gets plain squares
   * rather than 42 buttons that do nothing.
   */
  const handleSelectDay = (cell, dayHolidays) => {
    const editable = dayHolidays.find(canModifyRow);
    // The tab is deliberately left on "calendar": the form takes over the card
    // either way, and Cancel should put you back where you clicked from.
    if (editable && permissions.edit) {
      openEditForm(editable);
      return;
    }
    if (permissions.write) {
      openAddForm(toLocalKey(cell.date));
      return;
    }
    /**
     * Reachable only for edit-without-write: either an empty day (nothing to
     * edit, and they may not add) or one whose closures all belong to another
     * branch. The two are told apart because "nothing here is yours" on a day
     * that is genuinely blank reads as a bug.
     */
    toast.info(
      dayHolidays.length === 0
        ? "Nothing is marked on that day, and you do not have permission to add one."
        : "Nothing on that day is yours to edit.",
    );
  };

  const canActOnCalendar = permissions.write || permissions.edit;

  const columns = useMemo(
    () =>
      buildHolidayColumns({
        permissions,
        canModifyRow,
        onEdit: openEditForm,
        onDelete: (row) => {
          setRemoveId(row._id);
          setmodal_delete(true);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, canModifyRow],
  );

  document.title = `Holiday Master | ${adminData?.companyName || "Admin"}`;

  /**
   * PermissionProtected has already bounced anyone without read, so in practice
   * this is the narrow window where the menu tree has not resolved yet (a hard
   * refresh straight onto this URL). Showing the empty-handed state rather than
   * the screen avoids one frame of "no Add button" for someone who has one.
   */
  if (!permissions.read) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Holiday Master"
            pageTitle="Holiday Master"
          />
          <Card>
            <CardBody className="text-center text-muted py-5">
              {menuLoading
                ? "Checking your permissions…"
                : "You do not have access to the holiday master."}
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  const cardTitle = showForm
    ? "Add Holiday"
    : updateForm
      ? "Edit Holiday"
      : "Holiday Master";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Holiday Master"
            pageTitle="Holiday Master"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">{cardTitle}</h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {showForm || updateForm ? (
                      <Button color="dark" size="sm" onClick={closeForm}>
                        ≡ List
                      </Button>
                    ) : (
                      <>
                        <Nav pills className="nav-sm gap-1 mb-0">
                          <NavItem>
                            <NavLink
                              href="#"
                              active={activeTab === "list"}
                              onClick={(e) => {
                                e.preventDefault();
                                setActiveTab("list");
                              }}
                            >
                              <i
                                className="ri-list-check-2 align-bottom me-1"
                                aria-hidden="true"
                              ></i>
                              List
                            </NavLink>
                          </NavItem>
                          <NavItem>
                            <NavLink
                              href="#"
                              active={activeTab === "calendar"}
                              onClick={(e) => {
                                e.preventDefault();
                                setActiveTab("calendar");
                              }}
                            >
                              <i
                                className="ri-calendar-2-line align-bottom me-1"
                                aria-hidden="true"
                              ></i>
                              Calendar
                            </NavLink>
                          </NavItem>
                        </Nav>
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            onClick={() => openAddForm()}
                          >
                            <i
                              className="ri-add-line align-bottom"
                              aria-hidden="true"
                            ></i>{" "}
                            Add Holiday
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  <CardBody>
                    <HolidayForm
                      values={values}
                      setValues={setValues}
                      formErrors={formErrors}
                      isSubmit={isSubmit}
                      isSaving={isSaving}
                      isUpdate={updateForm}
                      branches={branches}
                      showBranchPicker={isSuperAdmin}
                      onSubmit={handleSubmit}
                      onCancel={closeForm}
                    />
                  </CardBody>
                ) : (
                  <CardBody>
                    <HolidayFilters
                      isListView={activeTab === "list"}
                      showBranchFilter={isSuperAdmin}
                      query={query}
                      onQueryChange={(v) => {
                        setQuery(v);
                        setPageNo(1);
                      }}
                      fromDate={fromDate}
                      onFromDateChange={(v) => {
                        setFromDate(v);
                        setPageNo(1);
                      }}
                      toDate={toDate}
                      onToDateChange={(v) => {
                        setToDate(v);
                        setPageNo(1);
                      }}
                      statusFilter={statusFilter}
                      onStatusFilterChange={(v) => {
                        setStatusFilter(v);
                        setPageNo(1);
                      }}
                      branchFilter={branchFilter}
                      onBranchFilterChange={(v) => {
                        setBranchFilter(v);
                        setPageNo(1);
                      }}
                      branches={branches}
                    />

                    {activeTab === "list" ? (
                      <div className="table-responsive table-card">
                        <DataTable
                          columns={columns}
                          data={holidays}
                          progressPending={loading}
                          pagination
                          paginationServer
                          paginationTotalRows={totalRows}
                          paginationPerPage={perPage}
                          paginationRowsPerPageOptions={[10, 25, 50]}
                          onChangeRowsPerPage={(n) => setPerPage(n)}
                          onChangePage={(p) => setPageNo(p)}
                          noDataComponent={
                            <div className="text-center py-4 text-muted">
                              No holidays marked for this filter.
                            </div>
                          }
                        />
                      </div>
                    ) : (
                      <HolidayCalendarPanel
                        cursor={cursor}
                        holidaysByDay={holidaysByDay}
                        monthHolidays={monthHolidays}
                        loading={calendarLoading}
                        error={calendarError}
                        onPrevMonth={() => setCursor((c) => addMonths(c, -1))}
                        onNextMonth={() => setCursor((c) => addMonths(c, 1))}
                        onSelectDay={
                          canActOnCalendar ? handleSelectDay : undefined
                        }
                      />
                    )}
                  </CardBody>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default HolidayMaster;

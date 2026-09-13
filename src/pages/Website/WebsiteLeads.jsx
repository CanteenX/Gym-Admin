import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Label,
  Input,
  Row,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import DataTable from "@/Components/Common/DataTableBase";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { searchSiteLeads, updateSiteLead } from "../../api/siteLeads.api";
import { searchEmployees } from "../../api/employees.api";
import { unwrapList } from "@/utils/listResponse";

const STATUSES = [
  { value: "NEW", label: "New", badgeClass: "bg-info" },
  { value: "CONTACTED", label: "Contacted", badgeClass: "bg-warning text-dark" },
  { value: "CONVERTED", label: "Converted", badgeClass: "bg-success" },
  { value: "CLOSED", label: "Closed", badgeClass: "bg-secondary" },
];

const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || {
    value,
    label: value || "—",
    badgeClass: "bg-secondary",
  };

/** Enough staff for a two-branch gym; the dropdown is not paged. */
const EMPLOYEE_FETCH_LIMIT = 200;

/**
 * Employees have no single canonical name field across the seed data and the
 * admin form, so fall back rather than render an empty option a user cannot
 * tell apart from any other empty option.
 */
const employeeName = (emp) =>
  emp?.employeeName ||
  emp?.name ||
  [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
  emp?.emailOffice ||
  emp?.email ||
  "Unnamed employee";

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const WebsiteLeads = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // A super admin has full access: checkPermission returns next() immediately
  // for role === "ADMIN" and PermissionProtected short-circuits on isAdmin, so
  // gating the UI on a MenuMaster permission row would hide buttons the server
  // would happily honour. That is exactly what happened here - the Website
  // menus are seeded without blanket role grants (least privilege), which left
  // the owner looking at an empty state telling them to click a button that was
  // not rendered.
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true }
    : currentPagePermissions || {
        read: true,
        write: true,
        edit: true,
        delete: true,
      };

  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("createdAt");
  const [sortDirection, setsortDirection] = useState("desc");

  // Triage modal
  const [manageOpen, setManageOpen] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [status, setStatus] = useState("NEW");
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchSiteLeads({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
      });
      const { rows, count } = unwrapList(response);
      setLeads(rows);
      setTotalRows(count);
    } catch (err) {
      console.error(err);
      toast.error("Could not load leads");
      setLeads([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // The assignee list is loaded once: it changes far less often than the inbox
  // and re-fetching it per page would triple the requests this screen makes.
  useEffect(() => {
    let cancelled = false;
    const loadEmployees = async () => {
      try {
        const res = await searchEmployees({
          page: 1,
          per_page: EMPLOYEE_FETCH_LIMIT,
          sorton: "createdAt",
          sortdir: "desc",
          match: "",
          isActive: true,
        });
        const { rows } = unwrapList(res);
        if (!cancelled) setEmployees(rows);
      } catch (err) {
        console.error(err);
        // Non-fatal: status and notes still work, only assignment is unavailable.
        if (!cancelled) setEmployees([]);
      }
    };
    loadEmployees();
    return () => {
      cancelled = true;
    };
  }, []);

  const employeeLookup = useMemo(() => {
    const map = {};
    for (const emp of employees) {
      if (emp?._id) map[emp._id] = employeeName(emp);
    }
    return map;
  }, [employees]);

  /**
   * `assignedTo` arrives either populated (an object) or as a bare id depending
   * on whether the controller ran .populate(), so resolve both.
   */
  const assigneeLabel = (lead) => {
    const value = lead?.assignedTo;
    if (!value) return "";
    if (typeof value === "object") return employeeName(value);
    return employeeLookup[value] || "";
  };

  const assigneeId = (lead) => {
    const value = lead?.assignedTo;
    if (!value) return "";
    return typeof value === "object" ? value._id || "" : value;
  };

  const openManage = (row) => {
    setActiveLead(row);
    setStatus(row.status || "NEW");
    setAssignedTo(assigneeId(row));
    setNote("");
    setManageOpen(true);
  };

  const closeManage = () => {
    setManageOpen(false);
    setActiveLead(null);
    setNote("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeLead?._id) return;

    setIsSaving(true);
    try {
      const res = await updateSiteLead(activeLead._id, {
        status,
        // "" clears the assignment; null would be dropped by JSON.stringify on
        // some axios versions, and undefined is indistinguishable from "leave".
        assignedTo: assignedTo || "",
        note: note.trim(),
      });
      if (res.data.isOk) {
        toast.success("Lead Updated Successfully");
        closeManage();
        fetchLeads();
      } else {
        toast.error(res.data.message || "Failed to update lead");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "createdAt");
    setsortDirection(direction);
  };

  const col = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
      {
        name: "Received",
        cell: (row) => (
          <span className="small text-muted text-wrap">
            {formatDateTime(row.createdAt)}
          </span>
        ),
        sortable: true,
        sortField: "createdAt",
        minWidth: "170px",
      },
      {
        name: "Name",
        cell: (row) => (
          <span className="fw-semibold text-wrap">{row.name || "—"}</span>
        ),
        sortable: true,
        sortField: "name",
        minWidth: "150px",
      },
      {
        name: "Contact",
        cell: (row) => (
          <div className="py-1">
            <div className="text-wrap">
              <i className="ri-phone-line" aria-hidden="true"></i>{" "}
              {row.phone || "—"}
            </div>
            {row.email ? (
              <small className="text-muted text-wrap">
                <i className="ri-mail-line" aria-hidden="true"></i> {row.email}
              </small>
            ) : null}
          </div>
        ),
        minWidth: "190px",
      },
      {
        name: "Message",
        cell: (row) => (
          <span className="text-muted small text-wrap">
            {row.message
              ? `${String(row.message).slice(0, 70)}${String(row.message).length > 70 ? "…" : ""}`
              : "—"}
          </span>
        ),
        minWidth: "200px",
      },
      {
        name: "Branch",
        cell: (row) =>
          row.branch ? (
            <span className="badge bg-primary-subtle text-primary">
              {row.branch}
            </span>
          ) : (
            <span className="text-muted small">—</span>
          ),
        minWidth: "120px",
      },
      {
        name: "Source",
        cell: (row) => (
          <span className="text-muted small text-wrap">
            {row.source || "WEBSITE"}
          </span>
        ),
        minWidth: "130px",
      },
      {
        name: "Status",
        cell: (row) => {
          const meta = statusMeta(row.status);
          return <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>;
        },
        sortable: true,
        sortField: "status",
        minWidth: "130px",
      },
      {
        name: "Assigned To",
        cell: (row) => {
          const label = assigneeLabel(row);
          return label ? (
            <span className="text-wrap">
              <i className="ri-user-follow-line" aria-hidden="true"></i> {label}
            </span>
          ) : (
            <span className="text-muted small">Unassigned</span>
          );
        },
        minWidth: "170px",
      },
      {
        name: "Notes",
        cell: (row) => (
          <span className="badge bg-light text-body">
            {row.notes?.length || 0}
          </span>
        ),
        width: "90px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit ? (
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={() => openManage(row)}
              >
                <i className="ri-user-received-line" aria-hidden="true"></i>{" "}
                Manage
              </button>
            ) : (
              <button
                className="btn btn-sm btn-light d-flex align-items-center gap-1"
                onClick={() => openManage(row)}
              >
                <i className="ri-eye-line" aria-hidden="true"></i> View
              </button>
            )}
          </div>
        ),
        minWidth: "150px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, pageNo, perPage, employeeLookup],
  );

  const readOnly = !permissions.edit;

  document.title = `Website Leads | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Website"
            title="Website Leads"
            pageTitle="Website Leads"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    <i className="ri-inbox-line align-bottom" aria-hidden="true"></i>{" "}
                    Lead Inbox
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div
                      className="search-box mb-0"
                      style={{ position: "relative", minWidth: "200px" }}
                    >
                      <Label htmlFor="leadSearch" className="visually-hidden">
                        Search leads
                      </Label>
                      <Input
                        id="leadSearch"
                        type="text"
                        className="form-control form-control-sm search"
                        placeholder="Search name, phone or email..."
                        style={{ paddingLeft: "30px", height: "30px" }}
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setPageNo(1);
                        }}
                      />
                      <i
                        className="ri-search-line search-icon text-muted"
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "12px",
                        }}
                      ></i>
                    </div>

                    <Button
                      color="light"
                      size="sm"
                      style={{ height: "30px" }}
                      onClick={fetchLeads}
                      title="Reload leads"
                      aria-label="Reload leads"
                    >
                      <i className="ri-refresh-line" aria-hidden="true"></i>
                    </Button>
                  </div>
                </CardHeader>

                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={leads}
                      progressPending={loading}
                      sortServer
                      onSort={handleSort}
                      pagination
                      paginationServer
                      paginationTotalRows={totalRows}
                      paginationPerPage={perPage}
                      paginationRowsPerPageOptions={[10, 25, 50, 100]}
                      onChangeRowsPerPage={(newPerPage) => setPerPage(newPerPage)}
                      onChangePage={(page) => setPageNo(page)}
                      noDataComponent={
                        <div className="text-center py-4 text-muted">
                          No enquiries yet. Leads submitted on the website appear
                          here.
                        </div>
                      }
                    />
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Triage modal: status, assignment and a new note in one save. */}
      <Modal isOpen={manageOpen} toggle={closeManage} centered>
        <ModalHeader toggle={closeManage}>
          {readOnly ? "Lead Details" : "Manage Lead"}
        </ModalHeader>
        <ModalBody>
          {activeLead ? (
            <Form onSubmit={handleSave}>
              <div className="mb-3">
                <h6 className="mb-1">{activeLead.name}</h6>
                <div className="small text-muted">
                  <i className="ri-phone-line" aria-hidden="true"></i>{" "}
                  {activeLead.phone || "—"}
                  {activeLead.email ? (
                    <>
                      {" · "}
                      <i className="ri-mail-line" aria-hidden="true"></i>{" "}
                      {activeLead.email}
                    </>
                  ) : null}
                </div>
                <div className="small text-muted">
                  <i className="ri-calendar-line" aria-hidden="true"></i>{" "}
                  {formatDateTime(activeLead.createdAt)}
                  {activeLead.branch ? ` · ${activeLead.branch}` : ""}
                  {activeLead.source ? ` · ${activeLead.source}` : ""}
                </div>
                {activeLead.message ? (
                  <p className="mt-2 mb-0 text-wrap">{activeLead.message}</p>
                ) : null}
              </div>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <Label htmlFor="leadStatus" className="form-label fw-bold">
                      Status
                    </Label>
                    <Input
                      id="leadStatus"
                      type="select"
                      name="status"
                      value={status}
                      disabled={readOnly}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup className="mb-3">
                    <Label htmlFor="leadAssignee" className="form-label fw-bold">
                      Assign To
                    </Label>
                    <Input
                      id="leadAssignee"
                      type="select"
                      name="assignedTo"
                      value={assignedTo}
                      disabled={readOnly}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {employeeName(emp)}
                        </option>
                      ))}
                    </Input>
                    {employees.length === 0 && (
                      <small className="text-muted">
                        No employees available to assign
                      </small>
                    )}
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup className="mb-3">
                    <Label htmlFor="leadNote" className="form-label fw-bold">
                      Add a Note
                    </Label>
                    <Input
                      id="leadNote"
                      type="textarea"
                      rows="3"
                      name="note"
                      placeholder="e.g. Called, asked to ring back after 6pm"
                      value={note}
                      disabled={readOnly}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <small className="text-muted">
                      Notes are appended — nothing already recorded is replaced.
                    </small>
                  </FormGroup>
                </Col>
              </Row>

              {activeLead.notes?.length ? (
                <div className="mb-3">
                  <h6 className="fs-13 text-muted mb-2">
                    <i className="ri-sticky-note-line" aria-hidden="true"></i>{" "}
                    History
                  </h6>
                  <ul className="list-unstyled mb-0">
                    {activeLead.notes.map((entry, index) => (
                      <li
                        key={entry?._id || `${entry?.at || ""}-${index}`}
                        className="border-bottom pb-2 mb-2"
                      >
                        <div className="text-wrap">{entry?.text}</div>
                        <small className="text-muted">
                          {formatDateTime(entry?.at)}
                          {entry?.by
                            ? ` · ${
                                typeof entry.by === "object"
                                  ? employeeName(entry.by)
                                  : employeeLookup[entry.by] || "Staff"
                              }`
                            : ""}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="d-flex justify-content-end gap-2">
                <Button type="button" color="light" onClick={closeManage}>
                  Close
                </Button>
                {!readOnly && (
                  <Button type="submit" color="success" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
            </Form>
          ) : null}
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};

export default WebsiteLeads;

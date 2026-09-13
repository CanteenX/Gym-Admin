import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
} from "reactstrap";
import DataTable from "@/Components/Common/DataTableBase";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  getAuditLogById,
  getAuditLogFilters,
  searchAuditLogs,
} from "../../api/auditLogs.api";
import { listBranches } from "../../api/branches.api";
import AuditLogDetailModal from "./components/AuditLogDetailModal";
import { formatDateTime } from "./insightsFormat";

/**
 * The audit trail viewer. READ-ONLY, and there is no write endpoint behind it —
 * a trail an operator can edit is not a trail.
 *
 * ============================================================================
 * WHY A BRANCH ADMIN'S LIST IS GENUINELY SHORTER THAN THE OWNER'S
 * ============================================================================
 * `AuditLog.branch` is the branch of the CHANGED DOCUMENT, falling back to the
 * actor's. Rows with `branch: null` — changes to business-wide masters (menus,
 * membership plans, branches, website copy) — are visible to a super admin
 * only, deliberately: those changes affect both gyms and are the owner's
 * business, and the alternative puts "who changed the pricing" in front of
 * every branch manager.
 *
 * The branch filter is therefore rendered for a super admin only. For anyone
 * else it would be a control that cannot change anything: the server spreads
 * the session scope last, so a branch admin's `branch` value is overwritten
 * before the query runs.
 *
 * ============================================================================
 * THE RESPONSE SHAPE IS NOT THE HOUSE $facet ENVELOPE
 * ============================================================================
 * Other `…-by-params` endpoints answer `data: [{ data: [...], count }]`. This
 * one answers a plain `data: [...]` with `total` beside it, so `unwrapList`
 * would report a count of "rows on this page" and the pager would stop after
 * one. Read `res.data.total` directly.
 */

const PER_PAGE_OPTIONS = [25, 50, 100];

const AuditLog = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // Same pattern as Website/WebsiteAdverts.jsx — a super admin short-circuits
  // both checkPermission and PermissionProtected, so gating on a MenuMaster row
  // alone hides controls the server would honour.
  const permissions = isAdmin
    ? { read: true, write: false, edit: false, delete: false, print: true }
    : currentPagePermissions || { read: true };

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [match, setMatch] = useState("");
  const [action, setAction] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [actorId, setActorId] = useState("");
  const [branch, setBranch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [options, setOptions] = useState({
    collections: [],
    actions: [],
    actors: [],
  });
  const [branches, setBranches] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchAuditLogs({
        skip: (page - 1) * perPage,
        per_page: perPage,
        sorton: "createdAt",
        sortdir: "desc",
        match: match || undefined,
        action: action || undefined,
        collectionName: collectionName || undefined,
        actorId: actorId || undefined,
        branch: branch || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      if (res.data?.isOk) {
        setRows(res.data.data || []);
        // Plain array + a sibling total — NOT the $facet envelope.
        setTotal(Number(res.data.total ?? res.data.count ?? 0));
      } else {
        toast.error(res.data?.message || "Could not load the audit log");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the audit log");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    perPage,
    match,
    action,
    collectionName,
    actorId,
    branch,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAuditLogFilters()
      .then((r) => r.data?.isOk && setOptions(r.data.data || options))
      // Losing the dropdown options leaves the free-text search working, which
      // is better than a blank screen.
      .catch((err) => console.error("Error loading audit filters:", err));
    if (isAdmin) {
      listBranches(true)
        .then((r) => r.data?.isOk && setBranches(r.data.data || []))
        .catch((err) => console.error("Error loading branches:", err));
    }
    // `options` is intentionally not a dependency: it is what this effect sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openDetail = useCallback(async (id) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await getAuditLogById(id);
      if (res.data?.isOk) setDetail(res.data.data);
      else setDetailError(res.data?.message || "Entry not found");
    } catch (err) {
      setDetailError(
        err.response?.status === 404
          ? "That entry is not available on your account."
          : err.response?.data?.message || "Could not load the entry",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearFilters = () => {
    setMatch("");
    setAction("");
    setCollectionName("");
    setActorId("");
    setBranch("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        name: "When",
        selector: (row) => row.createdAt,
        cell: (row) => (
          <span className="small">{formatDateTime(row.createdAt)}</span>
        ),
        width: "170px",
      },
      {
        name: "Who",
        cell: (row) => (
          <div className="small">
            <div className="fw-medium">{row.actor?.name || "Unknown"}</div>
            <div className="text-muted">{row.actor?.email || ""}</div>
          </div>
        ),
        minWidth: "180px",
      },
      {
        name: "Action",
        cell: (row) => (
          <Badge
            color={
              row.action?.startsWith("DELETE")
                ? "danger"
                : row.action?.startsWith("CREATE")
                  ? "success"
                  : "info"
            }
          >
            {row.action}
          </Badge>
        ),
        width: "130px",
      },
      {
        name: "Record",
        cell: (row) => (
          <div className="small">
            <div className="fw-medium">{row.collectionName}</div>
            <div className="text-muted text-truncate" style={{ maxWidth: 220 }}>
              {row.documentLabel || row.documentId || "—"}
            </div>
          </div>
        ),
        minWidth: "200px",
      },
      {
        name: "Branch",
        cell: (row) => (
          <span className="small">{row.branch || "Business-wide"}</span>
        ),
        width: "130px",
      },
      {
        name: "Detail",
        cell: (row) => (
          <Button
            color="light"
            size="sm"
            onClick={() => openDetail(row._id)}
            aria-label={`View the ${row.action} on ${row.collectionName}`}
            title="View this change"
          >
            <i className="ri-eye-line align-bottom" aria-hidden="true" />
          </Button>
        ),
        width: "90px",
        right: true,
      },
    ],
    [openDetail],
  );

  document.title = `Audit Log | ${adminData?.companyName || "Admin"}`;

  if (!permissions.read) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Audit Log" pageTitle="Insights" />
          <Card>
            <CardBody>
              <p className="text-muted mb-0">
                You do not have permission to view the audit log.
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
        <BreadCrumb title="Audit Log" pageTitle="Insights" />

        <Card className="mb-3">
          <CardBody>
            <Row className="g-2 align-items-end">
              <Col xs={12} md={4} lg={3}>
                <Label for="audit-search" className="form-label mb-1 small">
                  Search
                </Label>
                <Input
                  id="audit-search"
                  type="search"
                  bsSize="sm"
                  placeholder="Name, email, record or path"
                  value={match}
                  onChange={(e) => {
                    setMatch(e.target.value);
                    setPage(1);
                  }}
                />
              </Col>
              <Col xs={6} md={4} lg={2}>
                <Label for="audit-action" className="form-label mb-1 small">
                  Action
                </Label>
                <Input
                  id="audit-action"
                  type="select"
                  bsSize="sm"
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any action</option>
                  {options.actions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={6} md={4} lg={2}>
                <Label for="audit-collection" className="form-label mb-1 small">
                  Record type
                </Label>
                <Input
                  id="audit-collection"
                  type="select"
                  bsSize="sm"
                  value={collectionName}
                  onChange={(e) => {
                    setCollectionName(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any record</option>
                  {options.collections.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={12} md={4} lg={2}>
                <Label for="audit-actor" className="form-label mb-1 small">
                  Changed by
                </Label>
                <Input
                  id="audit-actor"
                  type="select"
                  bsSize="sm"
                  value={actorId}
                  onChange={(e) => {
                    setActorId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Anyone</option>
                  {options.actors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.email || a.id} ({a.changes})
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={6} md={4} lg="auto">
                <Label for="audit-from" className="form-label mb-1 small">
                  From date
                </Label>
                <Input
                  id="audit-from"
                  type="date"
                  bsSize="sm"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
              </Col>
              <Col xs={6} md={4} lg="auto">
                <Label for="audit-to" className="form-label mb-1 small">
                  To date
                </Label>
                <Input
                  id="audit-to"
                  type="date"
                  bsSize="sm"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </Col>
              {/* Branch narrows a super admin's view only — the server
                  overwrites it for anyone else, so showing it would be a
                  control that does nothing. */}
              {isAdmin ? (
                <Col xs={6} md={4} lg={2}>
                  <Label for="audit-branch" className="form-label mb-1 small">
                    Branch
                  </Label>
                  <Input
                    id="audit-branch"
                    type="select"
                    bsSize="sm"
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setPage(1);
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
              ) : null}
              <Col xs={12} md="auto" className="d-flex gap-2">
                <Button color="light" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
                <Button
                  color="light"
                  size="sm"
                  onClick={load}
                  aria-label="Refresh the audit log"
                  title="Refresh the audit log"
                >
                  <i className="ri-refresh-line align-bottom" aria-hidden="true" />
                </Button>
              </Col>
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {!isAdmin ? (
              <p className="text-muted small">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                Changes to business-wide settings — membership plans, menus,
                branches, website copy — are recorded against no branch and are
                visible to the owner only, so they do not appear here.
              </p>
            ) : null}

            <DataTable
              columns={columns}
              data={rows}
              progressPending={loading}
              pagination
              paginationServer
              paginationTotalRows={total}
              paginationDefaultPage={page}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={PER_PAGE_OPTIONS}
              onChangePage={setPage}
              onChangeRowsPerPage={(newPerPage, newPage) => {
                setPerPage(newPerPage);
                setPage(newPage);
              }}
              highlightOnHover
              persistTableHead
              noDataComponent={
                <div className="p-4 text-muted">
                  No changes match these filters.
                </div>
              }
            />
          </CardBody>
        </Card>

        <AuditLogDetailModal
          show={detailOpen}
          onCloseClick={() => setDetailOpen(false)}
          entry={detail}
          loading={detailLoading}
          error={detailError || undefined}
        />
      </Container>
    </div>
  );
};

export default AuditLog;

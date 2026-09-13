import React, { useCallback, useContext, useEffect, useState } from "react";
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
  getCollectionsReport,
  getExpiryPipeline,
  getMemberAgeing,
  getProfitAndLoss,
} from "../../api/reports.api";
import { listBranches } from "../../api/branches.api";
import CollectionsPanel from "./components/CollectionsPanel";
import ProfitLossPanel from "./components/ProfitLossPanel";
import ExpiryPipelinePanel from "./components/ExpiryPipelinePanel";
import MemberAgeingPanel from "./components/MemberAgeingPanel";
import ReportExports from "./components/ReportExports";
import { daysAgoInput, toInputDate } from "./insightsFormat";

/**
 * Reports — collections, profit and loss, the expiry pipeline and member
 * ageing, plus the CSV exports.
 *
 * ============================================================================
 * EVERY MONEY FIGURE COMES FROM THE LEDGER, NOT FROM MEMBER RECORDS.
 * ============================================================================
 * Nothing on this page recomputes a total client-side. `Member.payments[]` is
 * the current period's balance and is cleared on renewal, so anything summed
 * from it silently drops every rupee collected before each member's last
 * renewal and still produces a plausible number. The server reads the
 * append-only Transaction ledger for all of it; the panels render what arrives.
 *
 * ============================================================================
 * "Common" AND WHAT A BRANCH ADMIN SEES
 * ============================================================================
 * The P&L response has three separate keys — `branches[]`, `common`,
 * `consolidated` — and `common`/`consolidated` come back **null** for a branch
 * admin. That is not an error state and must not be rendered as zero: see
 * components/ProfitLossPanel.jsx, which says in words that shared overhead is
 * held outside branch numbers and is the owner's to see, so a branch manager
 * cannot mistake a branch's trading result for the business's profit.
 *
 * The branch filter offers physical gyms only. "Common" is a bookkeeping
 * bucket, not a gym, so selecting it would empty three of the four panels; the
 * P&L surfaces it on its own terms instead.
 */
const Reports = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  /**
   * Same pattern as Website/WebsiteAdverts.jsx, and it matters most here.
   *
   * A super admin short-circuits checkPermission on the server and
   * PermissionProtected on the client, so a UI gated purely on a MenuMaster
   * permission row hides controls the server would honour — and the owner, who
   * has every right to export, is exactly who it hides them from.
   */
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true, print: true }
    : currentPagePermissions || { read: true, print: false };

  // The export routes check `print`, not `read`. Separate decision, separate flag.
  const canExport = Boolean(isAdmin || permissions.print);

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoInput(364));
  const [toDate, setToDate] = useState(toInputDate(new Date()));
  const [months, setMonths] = useState(12);

  const [collections, setCollections] = useState(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [pnl, setPnl] = useState(null);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [expiry, setExpiry] = useState(null);
  const [expiryLoading, setExpiryLoading] = useState(true);
  const [ageing, setAgeing] = useState(null);
  const [ageingLoading, setAgeingLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const res = await getCollectionsReport({ months, branch });
      if (res.data?.isOk) setCollections(res.data.data);
      else toast.error(res.data?.message || "Could not load collections");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load collections");
    } finally {
      setCollectionsLoading(false);
    }
  }, [months, branch]);

  const loadPnl = useCallback(async () => {
    setPnlLoading(true);
    try {
      const res = await getProfitAndLoss({ fromDate, toDate, branch });
      if (res.data?.isOk) setPnl(res.data.data);
      else toast.error(res.data?.message || "Could not load profit and loss");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not load profit and loss",
      );
    } finally {
      setPnlLoading(false);
    }
  }, [fromDate, toDate, branch]);

  const loadMemberReports = useCallback(async () => {
    setExpiryLoading(true);
    setAgeingLoading(true);
    try {
      const [pipeline, ageingRes] = await Promise.all([
        getExpiryPipeline({ branch, perBucket: 10 }),
        getMemberAgeing({ branch }),
      ]);
      if (pipeline.data?.isOk) setExpiry(pipeline.data.data);
      if (ageingRes.data?.isOk) setAgeing(ageingRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load member reports");
    } finally {
      setExpiryLoading(false);
      setAgeingLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    listBranches(true)
      .then((r) => r.data?.isOk && setBranches(r.data.data || []))
      // Degrades to "All branches", which is the right default anyway.
      .catch((err) => console.error("Error loading branches:", err));
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    loadPnl();
  }, [loadPnl]);

  useEffect(() => {
    loadMemberReports();
  }, [loadMemberReports]);

  const refreshAll = () => {
    loadCollections();
    loadPnl();
    loadMemberReports();
  };

  const resetFilters = () => {
    setBranch("");
    setFromDate(daysAgoInput(364));
    setToDate(toInputDate(new Date()));
    setMonths(12);
  };

  document.title = `Reports | ${adminData?.companyName || "Admin"}`;

  if (!permissions.read) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Reports" pageTitle="Insights" />
          <Card>
            <CardBody>
              <p className="text-muted mb-0">
                You do not have permission to view reports.
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
        <BreadCrumb title="Reports" pageTitle="Insights" />

        <Card className="mb-3">
          <CardBody>
            <Row className="g-2 align-items-end">
              <Col xs={6} md={3}>
                <Label for="reports-from" className="form-label mb-1 small">
                  From date
                </Label>
                <Input
                  id="reports-from"
                  type="date"
                  bsSize="sm"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Col>
              <Col xs={6} md={3}>
                <Label for="reports-to" className="form-label mb-1 small">
                  To date
                </Label>
                <Input
                  id="reports-to"
                  type="date"
                  bsSize="sm"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Col>
              <Col xs={12} md={3}>
                <Label for="reports-branch" className="form-label mb-1 small">
                  Branch
                </Label>
                <Input
                  id="reports-branch"
                  type="select"
                  bsSize="sm"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b._id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col xs={12} md={3} className="d-flex gap-2">
                <Button color="light" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
                <Button
                  color="light"
                  size="sm"
                  onClick={refreshAll}
                  aria-label="Refresh all reports"
                  title="Refresh all reports"
                >
                  <i className="ri-refresh-line align-bottom" aria-hidden="true" />
                </Button>
              </Col>
            </Row>
            <p className="text-muted small mb-0 mt-2">
              The date range applies to the profit and loss and to the exports.
              Collections use their own period selector; the member reports are
              always &ldquo;as of today&rdquo;.
            </p>
          </CardBody>
        </Card>

        <ReportExports
          canExport={canExport}
          filters={{ fromDate, toDate, branch }}
        />

        <Row className="g-3">
          <Col xs={12}>
            <ProfitLossPanel data={pnl} loading={pnlLoading} />
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12}>
            <CollectionsPanel
              data={collections}
              loading={collectionsLoading}
              months={months}
              onMonthsChange={setMonths}
            />
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xl={6}>
            <ExpiryPipelinePanel data={expiry} loading={expiryLoading} />
          </Col>
          <Col xl={6}>
            <MemberAgeingPanel data={ageing} loading={ageingLoading} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Reports;

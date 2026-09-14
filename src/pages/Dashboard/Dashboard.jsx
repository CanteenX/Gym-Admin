import React, { useContext, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableSkeleton from "@/Components/Common/TableSkeleton";
import { AuthContext } from "../../context/AuthContext";
import { getMemberDashboardStats } from "../../api/members.api";
import HolidayWidget from "./HolidayWidget";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Days until expiry — negative means already lapsed. */
const daysUntil = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const expiryLabel = (date) => {
  const d = daysUntil(date);
  if (d < 0) return { text: `${Math.abs(d)} days overdue`, color: "danger" };
  if (d === 0) return { text: "Expires today", color: "danger" };
  if (d === 1) return { text: "Expires tomorrow", color: "warning" };
  return { text: `${d} days left`, color: "warning" };
};

/** Headline metric tile. */
const StatTile = ({ icon, label, value, sub, color = "primary", to }) => {
  const body = (
    <Card className="card-animate h-100 mb-0">
      <CardBody>
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <p
              className="text-uppercase fw-medium text-muted mb-0"
              style={{ fontSize: "11px", letterSpacing: "0.5px" }}
            >
              {label}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span
              className={`avatar-title bg-${color}-subtle text-${color} rounded fs-4 d-flex align-items-center justify-content-center`}
              style={{ width: 40, height: 40 }}
            >
              <i className={icon}></i>
            </span>
          </div>
        </div>
        <div className="d-flex align-items-end justify-content-between mt-3">
          <div>
            <h3 className="fs-22 fw-semibold ff-secondary mb-1">{value}</h3>
            {sub ? <span className="text-muted small">{sub}</span> : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return to ? (
    <Link to={to} className="text-decoration-none text-reset d-block h-100">
      {body}
    </Link>
  ) : (
    body
  );
};

/**
 * One reminder row — the member, why they're listed, and a direct call link so
 * staff can action it without leaving the dashboard.
 */
const ReminderRow = ({ member, mode }) => {
  const expiry = expiryLabel(member.endDate);
  return (
    <div className="d-flex align-items-center gap-3 py-2 border-bottom">
      <div className="avatar-xs flex-shrink-0">
        <span
          className={`avatar-title rounded-circle bg-${
            mode === "due" ? "danger" : "warning"
          }-subtle text-${mode === "due" ? "danger" : "warning"} fw-semibold`}
        >
          {member.fullName?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>
      <div className="flex-grow-1 min-w-0">
        <div className="fw-semibold text-truncate">{member.fullName}</div>
        <div className="text-muted small">
          {member.mobileNumber} · {member.branch}
        </div>
      </div>
      <div className="text-end flex-shrink-0">
        {mode === "due" ? (
          <>
            <div className="text-danger fw-semibold">
              {currency(member.balanceAmount)}
            </div>
            <div className="text-muted small">due</div>
          </>
        ) : (
          <>
            <Badge color={expiry.color} className="mb-1">
              {expiry.text}
            </Badge>
            <div className="text-muted small">{formatDate(member.endDate)}</div>
          </>
        )}
      </div>
      <a
        href={`tel:${String(member.mobileNumber || "").replace(/\s/g, "")}`}
        className="btn btn-sm btn-soft-primary flex-shrink-0"
        title={`Call ${member.fullName}`}
      >
        <i className="ri-phone-line"></i>
      </a>
    </div>
  );
};

const EmptyState = ({ icon, text }) => (
  <div className="text-center py-4 text-muted">
    <i
      className={`${icon} d-block mb-2`}
      style={{ fontSize: "2rem", opacity: 0.4 }}
    ></i>
    <span className="small">{text}</span>
  </div>
);

/**
 * The dashboard's own layout, drawn in placeholder bars, shown on first load.
 *
 * This replaced a single centred spinner with a "Loading member data..."
 * caption under it. The spinner was honest but it sat alone in an otherwise
 * empty page, so the whole screen snapped into existence at once when the
 * stats landed. Echoing the real shape - four stat tiles over two list cards -
 * means nothing moves when the data arrives, and it tells the reader what is
 * about to appear rather than only that something is happening.
 *
 * Accessibility: every bar is decoration, so the whole block is `aria-hidden`
 * and a screen reader hears only the one visually-hidden status line. That
 * also keeps the browser gate's contrast sampler out of these deliberately
 * low-opacity bars, which are not text and have no contrast requirement.
 */
const DashboardSkeleton = () => (
  <div className="placeholder-glow">
    <span className="visually-hidden" role="status">
      Loading member data
    </span>

    <div aria-hidden="true">
      {/* Four headline metric tiles. */}
      <Row className="g-3 mb-2">
        {[0, 1, 2, 3].map((tile) => (
          <Col xl={3} md={6} key={`tile-${tile}`}>
            <Card className="h-100 mb-0">
              <CardBody>
                <div className="mb-3">
                  <span className="placeholder col-7 rounded" />
                </div>
                <div className="mb-2">
                  <span className="placeholder col-4 rounded" />
                </div>
                <span className="placeholder col-9 rounded" />
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* The two reminder lists. */}
      <Row className="g-3">
        {[0, 1].map((list) => (
          <Col lg={6} key={`list-${list}`}>
            <Card className="h-100 mb-0">
              <CardHeader>
                <span className="placeholder col-6 rounded" />
              </CardHeader>
              <CardBody className="p-0">
                <TableSkeleton rows={4} columns={2} header={false} />
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  </div>
);

const Dashboard = () => {
  const { adminData } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMemberDashboardStats();
      if (res.data?.isOk) {
        setStats(res.data.data);
      } else {
        setError(res.data?.message || "Could not load member statistics");
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError(
        err.response?.data?.message ||
          "Could not reach the server for member statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  document.title = `Dashboard | ${adminData?.companyName || "Admin"}`;

  const counts = stats?.counts || {};
  const expiringSoon = stats?.expiringSoon || [];
  const paymentDue = stats?.paymentDue || [];
  const expired = stats?.expired || [];

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Dashboard" pageTitle="Dashboard" />

        {/* Greeting + refresh */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h4 className="mb-1">
                  {getGreeting()},{" "}
                  {adminData?.companyName || adminData?.employeeName || "there"}
                </h4>
                <p className="text-muted mb-0">
                  Here&apos;s who needs a follow-up call today.
                </p>
              </div>
              <Button
                color="light"
                size="sm"
                onClick={loadStats}
                disabled={loading}
              >
                <i className="ri-refresh-line align-bottom me-1"></i>
                Refresh
              </Button>
            </div>
          </Col>
        </Row>

        {error && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="alert alert-warning mb-0" role="alert">
                <i className="ri-error-warning-line align-bottom me-1"></i>
                {error}
              </div>
            </Col>
          </Row>
        )}

        {/* OUTSIDE the stats skeleton on purpose. The holiday widget is the
            employee-facing half of the Holiday Master, and it is gated on its
            own menu permission and fed by its own endpoints — tying it to the
            member-statistics request would blank it for the whole of that load
            and hide it entirely whenever that call fails, which is the one
            thing an employee logs in to this screen for. It renders nothing at
            all for anyone without read on /holiday-master. */}
        <HolidayWidget />

        {loading && !stats ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Headline metrics */}
            <Row className="g-3 mb-2">
              <Col xl={3} md={6}>
                <StatTile
                  icon="ri-group-line"
                  label="Total Members"
                  value={counts.totalMembers ?? 0}
                  sub={`${counts.activeMembers ?? 0} currently active`}
                  color="primary"
                  to="/members"
                />
              </Col>
              <Col xl={3} md={6}>
                <StatTile
                  icon="ri-alarm-warning-line"
                  label="Expiring in 7 Days"
                  value={counts.expiringSoon ?? 0}
                  sub="Call them before they lapse"
                  color="warning"
                  to="/members"
                />
              </Col>
              <Col xl={3} md={6}>
                <StatTile
                  icon="ri-money-rupee-circle-line"
                  label="Payment Due"
                  value={counts.paymentDue ?? 0}
                  sub={`${currency(counts.totalOutstanding)} outstanding`}
                  color="danger"
                  to="/members"
                />
              </Col>
              <Col xl={3} md={6}>
                <StatTile
                  icon="ri-wallet-3-line"
                  label="Collected This Month"
                  value={currency(counts.collectedThisMonth)}
                  sub={`${counts.expired ?? 0} memberships expired`}
                  color="success"
                />
              </Col>
            </Row>

            {/* The two reminder lists — the core of the feature */}
            <Row className="g-3">
              <Col lg={6}>
                <Card className="h-100">
                  <CardHeader className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-0">
                        <i className="ri-alarm-warning-line text-warning align-bottom me-1"></i>
                        Memberships Ending Soon
                      </h5>
                      <small className="text-muted">Next 7 days</small>
                    </div>
                    <Badge color="warning" pill>
                      {expiringSoon.length}
                    </Badge>
                  </CardHeader>
                  <CardBody className="pt-2">
                    {expiringSoon.length === 0 ? (
                      <EmptyState
                        icon="ri-checkbox-circle-line"
                        text="No memberships expiring in the next 7 days."
                      />
                    ) : (
                      <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                        {expiringSoon.map((m) => (
                          <ReminderRow key={m._id} member={m} mode="expiring" />
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>

              <Col lg={6}>
                <Card className="h-100">
                  <CardHeader className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-0">
                        <i className="ri-money-rupee-circle-line text-danger align-bottom me-1"></i>
                        Payments Due
                      </h5>
                      <small className="text-muted">Outstanding balance</small>
                    </div>
                    <Badge color="danger" pill>
                      {paymentDue.length}
                    </Badge>
                  </CardHeader>
                  <CardBody className="pt-2">
                    {paymentDue.length === 0 ? (
                      <EmptyState
                        icon="ri-checkbox-circle-line"
                        text="Every member is fully paid up."
                      />
                    ) : (
                      <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                        {paymentDue.map((m) => (
                          <ReminderRow key={m._id} member={m} mode="due" />
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* Already-lapsed members: the win-back list */}
            <Row className="g-3 mt-1">
              <Col xs={12}>
                <Card>
                  <CardHeader className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-0">
                        <i className="ri-user-unfollow-line text-muted align-bottom me-1"></i>
                        Expired Memberships
                      </h5>
                      <small className="text-muted">
                        Past their end date — worth a renewal call
                      </small>
                    </div>
                    <Link to="/members" className="btn btn-sm btn-soft-primary">
                      Manage Members{" "}
                      <i className="ri-arrow-right-line align-bottom"></i>
                    </Link>
                  </CardHeader>
                  <CardBody className="pt-2">
                    {expired.length === 0 ? (
                      <EmptyState
                        icon="ri-emotion-happy-line"
                        text="No expired memberships. Everyone is current."
                      />
                    ) : (
                      <Row className="g-2">
                        {expired.slice(0, 9).map((m) => (
                          <Col md={4} key={m._id}>
                            <ReminderRow member={m} mode="expiring" />
                          </Col>
                        ))}
                      </Row>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default Dashboard;

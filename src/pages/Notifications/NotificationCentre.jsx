import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import classnames from "classnames";
import { toast } from "react-toastify";
import BreadCrumb from "@/Components/Common/BreadCrumb";
import {
  getAudienceCounts,
  getNotificationHistory,
  searchMembersForNotification,
  sendCustomNotification,
} from "@/api/notifications.api";

const PRESET_LINKS = [
  { label: "Dashboard", url: "/dashboard" },
  { label: "Workout", url: "/workout" },
  { label: "Classes", url: "/classes" },
  { label: "Attendance", url: "/attendance" },
  { label: "User Guide", url: "/guide-book" },
];

export default function NotificationCentre() {
  document.title = "Notification Centre | Mid City Gym";

  // Tab state: "SPECIFIC" | "ALL" | "PAID"
  const [activeTab, setActiveTab] = useState("ALL");

  // Audience statistics
  const [audienceCounts, setAudienceCounts] = useState({
    totalUsers: 0,
    paidUsers: 0,
    pushSubscribers: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Specific user search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Compose form fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [linkUrl, setLinkUrl] = useState("/dashboard");
  const [sending, setSending] = useState(false);

  // History table state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load audience statistics
  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const res = await getAudienceCounts();
      const payload = res?.data?.data || res?.data;
      if (payload) {
        setAudienceCounts({
          totalUsers: Number(payload.totalUsers) || 0,
          paidUsers: Number(payload.paidUsers) || 0,
          pushSubscribers: Number(payload.pushSubscribers) || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load audience counts:", err);
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  // Load sent history
  const loadHistory = useCallback(async (p = 1) => {
    setLoadingHistory(true);
    try {
      const res = await getNotificationHistory(p, 10);
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setHistory(items);
      if (res?.data?.meta?.totalPages) {
        setTotalPages(res.data.meta.totalPages);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
    loadHistory(1);
  }, [loadCounts, loadHistory]);

  // Search members with debounce
  useEffect(() => {
    if (activeTab !== "SPECIFIC" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const res = await searchMembersForNotification(searchQuery.trim());
        const members = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setSearchResults(members);
      } catch (err) {
        console.error("Member search error:", err);
        setSearchResults([]);
      } finally {
        setSearchingMembers(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Handle submit
  const handleSend = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a notification title.");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter the message body.");
      return;
    }
    if (activeTab === "SPECIFIC" && !selectedMember) {
      toast.error("Please search and select a specific member.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        targetType: activeTab,
        targetMemberId: activeTab === "SPECIFIC" ? selectedMember._id : null,
        category,
        linkUrl: linkUrl.trim() || "/dashboard",
      };

      const res = await sendCustomNotification(payload);
      const responseData = res?.data || res;

      if (responseData && responseData.success) {
        toast.success(responseData.message || "Notification sent successfully!");
        // Reset form
        setTitle("");
        setBody("");
        if (activeTab === "SPECIFIC") {
          setSelectedMember(null);
          setSearchQuery("");
        }
        // Refresh counts and history
        loadCounts();
        loadHistory(1);
      } else {
        toast.error(responseData?.message || "Failed to send notification.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error sending notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Notification Centre" pageTitle="Communications" />

        {/* ── Stat Counters ── */}
        <Row className="mb-4">
          <Col md={4} sm={12}>
            <Card className="card-animate border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-3">
                    <i className="ri-team-line" />
                  </span>
                </div>
                <div>
                  <p className="text-muted text-uppercase fw-semibold fs-12 mb-1">
                    All Registered Members
                  </p>
                  <h4 className="mb-0 fw-bold">
                    {loadingCounts ? (
                      <Spinner size="sm" />
                    ) : (
                      audienceCounts.totalUsers.toLocaleString()
                    )}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col md={4} sm={12}>
            <Card className="card-animate border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-success-subtle text-success rounded-circle fs-3">
                    <i className="ri-shield-check-line" />
                  </span>
                </div>
                <div>
                  <p className="text-muted text-uppercase fw-semibold fs-12 mb-1">
                    Paid Members (No Due)
                  </p>
                  <h4 className="mb-0 fw-bold">
                    {loadingCounts ? (
                      <Spinner size="sm" />
                    ) : (
                      audienceCounts.paidUsers.toLocaleString()
                    )}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col md={4} sm={12}>
            <Card className="card-animate border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-info-subtle text-info rounded-circle fs-3">
                    <i className="ri-smartphone-line" />
                  </span>
                </div>
                <div>
                  <p className="text-muted text-uppercase fw-semibold fs-12 mb-1">
                    PWA Push Subscribers
                  </p>
                  <h4 className="mb-0 fw-bold">
                    {loadingCounts ? (
                      <Spinner size="sm" />
                    ) : (
                      audienceCounts.pushSubscribers.toLocaleString()
                    )}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ── Main Composer & Live Preview ── */}
        <Row>
          <Col lg={8} md={12}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-transparent border-bottom">
                <h5 className="card-title mb-1 fw-bold">Send Push Notification</h5>
                <p className="text-muted mb-0 fs-13">
                  Broadcast custom alerts directly to members' devices via PWA Web Push & in-app inbox.
                </p>
              </CardHeader>

              <CardBody className="p-4">
                {/* ── Audience Tabs ── */}
                <div className="mb-4">
                  <Label className="fw-semibold mb-2">Target Audience Tab</Label>
                  <Nav tabs className="nav-tabs-custom nav-success">
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "ALL" })}
                        onClick={() => setActiveTab("ALL")}
                        style={{ cursor: "pointer" }}
                      >
                        <i className="ri-group-line me-1" /> All Users (
                        {audienceCounts.totalUsers})
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "PAID" })}
                        onClick={() => setActiveTab("PAID")}
                        style={{ cursor: "pointer" }}
                      >
                        <i className="ri-money-dollar-circle-line me-1" /> Paid Users (
                        {audienceCounts.paidUsers})
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "SPECIFIC" })}
                        onClick={() => setActiveTab("SPECIFIC")}
                        style={{ cursor: "pointer" }}
                      >
                        <i className="ri-user-line me-1" /> A Specific User
                      </NavLink>
                    </NavItem>
                  </Nav>
                </div>

                {/* ── Tab Context Banners & Selectors ── */}
                {activeTab === "ALL" && (
                  <div className="alert alert-primary bg-primary-subtle border-0 mb-4 p-3 rounded-3 d-flex align-items-center gap-3">
                    <i className="ri-broadcast-line fs-24 text-primary" />
                    <div>
                      <h6 className="mb-1 fw-semibold text-primary">
                        Broadcasting to All Registered Members
                      </h6>
                      <p className="mb-0 text-muted fs-12">
                        This notification will be received by all {audienceCounts.totalUsers} registered gym members across their installed PWA devices and portal inbox.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "PAID" && (
                  <div className="alert alert-success bg-success-subtle border-0 mb-4 p-3 rounded-3 d-flex align-items-center gap-3">
                    <i className="ri-shield-star-line fs-24 text-success" />
                    <div>
                      <h6 className="mb-1 fw-semibold text-success">
                        Targeting Active Paid Members Only
                      </h6>
                      <p className="mb-0 text-muted fs-12">
                        Filtered to {audienceCounts.paidUsers} active members whose membership is valid with zero outstanding dues.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "SPECIFIC" && (
                  <div className="mb-4 p-3 bg-light rounded-3 border">
                    <Label className="fw-semibold">Search Member by Name, Mobile or ID</Label>
                    {!selectedMember ? (
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder="Type member name, phone number, or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                        />
                        {searchingMembers && (
                          <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                            <Spinner size="sm" />
                          </div>
                        )}

                        {Array.isArray(searchResults) && searchResults.length > 0 && (
                          <div
                            className="position-absolute w-100 bg-white shadow-lg rounded-3 border mt-1 z-3"
                            style={{ maxHeight: "240px", overflowY: "auto" }}
                          >
                            {searchResults.map((m) => (
                              <div
                                key={m._id}
                                className="p-2.5 border-bottom d-flex align-items-center justify-content-between hover-bg"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setSelectedMember(m);
                                  setSearchResults([]);
                                  setSearchQuery("");
                                }}
                              >
                                <div>
                                  <div className="fw-bold fs-13 text-dark">{m.fullName}</div>
                                  <div className="text-muted fs-12">
                                    {m.mobileNumber} · {m.planCode || "Standard"}
                                  </div>
                                </div>
                                <div>
                                  {m.hasPush ? (
                                    <Badge color="success-subtle" className="text-success">
                                      <i className="ri-smartphone-line me-1" /> PWA Active
                                    </Badge>
                                  ) : (
                                    <Badge color="secondary-subtle" className="text-muted">
                                      Portal Only
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-between bg-white p-3 rounded border">
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar-xs">
                            <span className="avatar-title rounded-circle bg-primary text-white fw-bold">
                              {selectedMember.fullName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">{selectedMember.fullName}</h6>
                            <span className="text-muted fs-12">
                              {selectedMember.mobileNumber} · Plan: {selectedMember.planCode}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {selectedMember.hasPush ? (
                            <Badge color="success" className="me-2">
                              Push Enabled
                            </Badge>
                          ) : (
                            <Badge color="warning" className="me-2">
                              No Push Device Yet
                            </Badge>
                          )}
                          <Button
                            color="light"
                            size="sm"
                            onClick={() => setSelectedMember(null)}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Form Inputs ── */}
                <form onSubmit={handleSend}>
                  <Row>
                    <Col md={8}>
                      <FormGroup className="mb-3">
                        <Label className="fw-semibold">
                          Notification Title <span className="text-danger">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="e.g. ⚡ Tomorrow's Morning Batch Rescheduled"
                          value={title}
                          maxLength={100}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                        <div className="text-end text-muted fs-11 mt-1">
                          {title.length}/100 characters
                        </div>
                      </FormGroup>
                    </Col>

                    <Col md={4}>
                      <FormGroup className="mb-3">
                        <Label className="fw-semibold">Category</Label>
                        <Input
                          type="select"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="GENERAL">General</option>
                          <option value="ANNOUNCEMENT">Announcement</option>
                          <option value="REMINDER">Reminder</option>
                          <option value="OFFER">Offer / Promotion</option>
                          <option value="ALERT">Important Alert</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <FormGroup className="mb-3">
                    <Label className="fw-semibold">
                      Custom Message Body <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="textarea"
                      rows={4}
                      placeholder="Type your custom message here. Members will see this on their phone screen and in their portal inbox..."
                      value={body}
                      maxLength={600}
                      onChange={(e) => setBody(e.target.value)}
                      required
                    />
                    <div className="text-end text-muted fs-11 mt-1">
                      {body.length}/600 characters
                    </div>
                  </FormGroup>

                  <FormGroup className="mb-4">
                    <Label className="fw-semibold">Action Link (Opens upon tapping)</Label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {PRESET_LINKS.map((preset) => (
                        <Button
                          key={preset.url}
                          type="button"
                          color={linkUrl === preset.url ? "primary" : "light"}
                          size="sm"
                          className="btn-rounded"
                          onClick={() => setLinkUrl(preset.url)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="text"
                      placeholder="/dashboard"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </FormGroup>

                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      type="button"
                      color="light"
                      onClick={() => {
                        setTitle("");
                        setBody("");
                        setLinkUrl("/dashboard");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      color="primary"
                      className="px-4"
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <Spinner size="sm" className="me-2" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <i className="ri-send-plane-fill me-1" /> Send Notification
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </Col>

          {/* ── Live Mobile Mockup Preview ── */}
          <Col lg={4} md={12}>
            <Card className="border-0 shadow-sm sticky-top" style={{ top: "80px" }}>
              <CardHeader className="bg-transparent border-bottom">
                <h6 className="card-title mb-0 fw-bold">Live PWA Push Preview</h6>
              </CardHeader>
              <CardBody className="p-4 d-flex flex-col items-center justify-content-center">
                <div
                  className="rounded-4 p-3 shadow-lg w-100"
                  style={{
                    backgroundColor: "#1e1e24",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.12)",
                    maxWidth: "340px",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-2 d-flex align-items-center justify-content-center"
                        style={{
                          width: "24px",
                          height: "24px",
                          backgroundColor: "#e11d2e",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        M
                      </div>
                      <span className="fw-semibold text-white fs-12">MID CITY GYM</span>
                      <span className="text-muted fs-11">· now</span>
                    </div>
                    <Badge color="danger" pill className="fs-10">
                      PWA Push
                    </Badge>
                  </div>

                  <div className="fw-bold fs-14 text-white mb-1">
                    {title.trim() || "Notification Title Preview"}
                  </div>
                  <div
                    className="text-white-50 fs-12 mb-2 text-break"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {body.trim() ||
                      "Your custom message will appear here on the member's phone notification tray..."}
                  </div>

                  <div className="pt-2 border-top border-secondary d-flex align-items-center justify-content-between fs-11 text-muted">
                    <span>Tap to view in App</span>
                    <span className="text-danger fw-semibold">{linkUrl || "/dashboard"} ›</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ── Sent Notifications History Table ── */}
        <Row className="mt-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-transparent border-bottom d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="card-title mb-0 fw-bold">Broadcast & Dispatch History</h5>
                  <p className="text-muted mb-0 fs-12">
                    Log of custom notifications sent from this console.
                  </p>
                </div>
                <Button color="light" size="sm" onClick={() => loadHistory(page)}>
                  <i className="ri-refresh-line me-1" /> Refresh
                </Button>
              </CardHeader>

              <CardBody className="p-0">
                <div className="table-responsive">
                  <Table className="table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date & Time</th>
                        <th>Target Audience</th>
                        <th>Title & Body</th>
                        <th>Category</th>
                        <th>Deliveries</th>
                        <th>Sent By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4">
                            <Spinner size="sm" className="me-2" /> Loading notification logs...
                          </td>
                        </tr>
                      ) : !Array.isArray(history) || history.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            No notifications sent yet.
                          </td>
                        </tr>
                      ) : (
                        history.map((item) => (
                          <tr key={item._id}>
                            <td className="fs-12 text-muted text-nowrap">
                              {new Date(item.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>
                              {item.targetType === "ALL" && (
                                <Badge color="primary">All Users</Badge>
                              )}
                              {item.targetType === "PAID" && (
                                <Badge color="success">Paid Users</Badge>
                              )}
                              {item.targetType === "SPECIFIC" && (
                                <Badge color="info">
                                  User: {item.targetMemberName || "Specific"}
                                </Badge>
                              )}
                            </td>
                            <td style={{ maxWidth: "340px" }}>
                              <div className="fw-semibold text-dark fs-13">{item.title}</div>
                              <div className="text-muted fs-12 text-truncate">{item.body}</div>
                            </td>
                            <td>
                              <Badge color="light" className="text-dark border">
                                {item.category}
                              </Badge>
                            </td>
                            <td>
                              <span className="fw-bold text-success fs-13">
                                {item.deliveredCount || 0}
                              </span>{" "}
                              <span className="text-muted fs-11">
                                / {item.totalTargeted || 0} targeted
                              </span>
                            </td>
                            <td className="fs-12 text-muted">{item.sentByName || "Staff"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

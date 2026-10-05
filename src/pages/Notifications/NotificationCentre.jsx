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

  // Specific user search & multi-select state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

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

  // Fetch members list (all latest or filtered by search query)
  const fetchMemberList = useCallback(async (q = "") => {
    setSearchingMembers(true);
    try {
      const res = await searchMembersForNotification(q.trim());
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
  }, []);

  // When activeTab switches to SPECIFIC, load member list immediately
  useEffect(() => {
    if (activeTab === "SPECIFIC") {
      fetchMemberList(searchQuery);
    }
  }, [activeTab, fetchMemberList]);

  // Debounced search when searchQuery changes
  useEffect(() => {
    if (activeTab !== "SPECIFIC") return;
    const timer = setTimeout(() => {
      fetchMemberList(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchMemberList]);

  // Member multi-select toggle helpers
  const toggleMemberSelection = (member) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m._id === member._id);
      if (exists) {
        return prev.filter((m) => m._id !== member._id);
      } else {
        return [...prev, member];
      }
    });
  };

  const removeMember = (memberId) => {
    setSelectedMembers((prev) => prev.filter((m) => m._id !== memberId));
  };

  const selectAllVisible = () => {
    setSelectedMembers((prev) => {
      const prevIds = new Set(prev.map((m) => m._id));
      const newlyAdded = searchResults.filter((m) => !prevIds.has(m._id));
      return [...prev, ...newlyAdded];
    });
  };

  const clearAllSelected = () => {
    setSelectedMembers([]);
  };

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
    if (activeTab === "SPECIFIC" && selectedMembers.length === 0) {
      toast.error("Please search and select at least one member to notify.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        targetType: activeTab,
        targetMemberIds: activeTab === "SPECIFIC" ? selectedMembers.map((m) => m._id) : [],
        targetMemberId: activeTab === "SPECIFIC" && selectedMembers.length === 1 ? selectedMembers[0]._id : null,
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
          setSelectedMembers([]);
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
                    {/* Header with Title and Quick Actions */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="fw-bold mb-0 fs-14 text-dark">Search &amp; Select Specific Members</h6>
                          <Badge color="light" className="text-muted border fs-11 fw-normal">
                            Multi-select
                          </Badge>
                        </div>
                        <p className="text-muted mb-0 fs-12 mt-1">
                          Choose one or more members below to receive this direct notification.
                        </p>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {searchResults.length > 0 && (
                          <Button
                            type="button"
                            color="primary"
                            outline
                            size="sm"
                            className="py-1.5 px-3 fs-12 fw-medium d-inline-flex align-items-center gap-1.5 rounded-2 shadow-sm"
                            onClick={selectAllVisible}
                          >
                            <i className="ri-check-double-line fs-14" />
                            Select All Visible ({searchResults.length})
                          </Button>
                        )}
                        {selectedMembers.length > 0 && (
                          <Button
                            type="button"
                            color="danger"
                            outline
                            size="sm"
                            className="py-1.5 px-3 fs-12 fw-medium d-inline-flex align-items-center gap-1.5 rounded-2"
                            onClick={clearAllSelected}
                          >
                            <i className="ri-close-circle-line fs-14" />
                            Clear Selection ({selectedMembers.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Search Input with Left Search Icon and Clear Button */}
                    <div className="position-relative mb-3">
                      <i
                        className="ri-search-2-line position-absolute start-0 top-50 translate-middle-y ms-3 text-muted fs-16"
                        style={{ pointerEvents: "none" }}
                      />
                      <Input
                        type="text"
                        placeholder="Search by member name, phone number, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-control bg-white shadow-sm border-light-subtle"
                        style={{
                          paddingLeft: "2.5rem",
                          paddingRight: "2.5rem",
                          height: "44px",
                          fontSize: "0.875rem",
                          borderRadius: "8px",
                        }}
                      />
                      {searchingMembers ? (
                        <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                          <Spinner size="sm" color="primary" />
                        </div>
                      ) : searchQuery ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-2 p-1 text-decoration-none"
                          onClick={() => setSearchQuery("")}
                          title="Clear search"
                        >
                          <i className="ri-close-line fs-18" />
                        </button>
                      ) : null}
                    </div>

                    {/* Selected Members Chips Bar */}
                    {selectedMembers.length > 0 && (
                      <div className="mb-3 p-3 bg-white rounded-3 border shadow-sm">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                              {selectedMembers.length}
                            </span>
                            <span className="fs-12 fw-semibold text-dark">
                              Selected {selectedMembers.length === 1 ? "Recipient" : "Recipients"}
                            </span>
                          </div>
                          <span className="fs-11 text-muted">
                            Click <span className="text-danger fw-bold">✕</span> to deselect
                          </span>
                        </div>
                        <div
                          className="d-flex flex-wrap gap-1.5"
                          style={{ maxHeight: "96px", overflowY: "auto" }}
                        >
                          {selectedMembers.map((m) => (
                            <span
                              key={m._id}
                              className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-2 py-1.5 px-3 fs-12 fw-medium"
                            >
                              <span>{m.fullName}</span>
                              <span
                                role="button"
                                tabIndex={0}
                                className="text-primary hover-text-danger d-inline-flex align-items-center"
                                style={{ cursor: "pointer", fontSize: "14px", lineHeight: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMember(m._id);
                                }}
                                title={`Remove ${m.fullName}`}
                              >
                                &times;
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visible Members List Box */}
                    <div className="bg-white rounded-3 border shadow-sm overflow-hidden">
                      {/* Subtle Header */}
                      <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center justify-content-between text-muted fs-11 fw-semibold text-uppercase">
                        <span>Member Name &amp; Details</span>
                        <span style={{ paddingRight: "16px" }}>App Channel</span>
                      </div>

                      {/* Scrollable Items Container */}
                      <div
                        style={{
                          maxHeight: "280px",
                          overflowY: "auto",
                          scrollbarWidth: "thin",
                        }}
                      >
                        {searchingMembers && (!searchResults || searchResults.length === 0) ? (
                          <div className="text-center py-5 text-muted fs-13">
                            <Spinner size="sm" color="primary" className="me-2" /> Loading members list...
                          </div>
                        ) : !Array.isArray(searchResults) || searchResults.length === 0 ? (
                          <div className="text-center py-5 text-muted fs-13">
                            <i className="ri-user-unfollow-line fs-24 d-block mb-1 text-secondary opacity-50" />
                            No members found matching &quot;{searchQuery}&quot;.
                          </div>
                        ) : (
                          searchResults.map((m) => {
                            const isSelected = selectedMembers.some((sm) => sm._id === m._id);
                            return (
                              <div
                                key={m._id}
                                className={`px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between ${
                                  isSelected ? "bg-primary-subtle" : ""
                                }`}
                                style={{
                                  cursor: "pointer",
                                  transition: "background-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = "#f8f9fa";
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                                }}
                                onClick={() => toggleMemberSelection(m)}
                              >
                                {/* Left Side: Checkbox, Avatar, Name & Details */}
                                <div className="d-flex align-items-center gap-3">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0 flex-shrink-0"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by row onClick
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      cursor: "pointer",
                                    }}
                                  />
                                  <div
                                    className="avatar-xs flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      backgroundColor: isSelected
                                        ? "var(--vz-primary, #405189)"
                                        : "#e9ebec",
                                      color: isSelected ? "#fff" : "#495057",
                                      fontWeight: "600",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {m.fullName?.charAt(0)?.toUpperCase() || "M"}
                                  </div>
                                  <div>
                                    <div
                                      className={`fw-semibold fs-13 ${
                                        isSelected ? "text-primary" : "text-dark"
                                      }`}
                                    >
                                      {m.fullName}
                                    </div>
                                    <div className="text-muted fs-11 d-flex flex-wrap align-items-center gap-1.5 mt-0.5">
                                      <span>{m.mobileNumber}</span>
                                      <span>•</span>
                                      <span className="badge bg-light text-secondary border px-1.5 py-0.5 fs-10">
                                        {m.planCode || "Standard"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Status Badges with Safe Spacing from Scrollbar */}
                                <div className="d-flex align-items-center gap-1.5" style={{ paddingRight: "14px" }}>
                                  {m.allowNotifications === false ? (
                                    <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-2.5 py-1.5 fs-11 fw-medium">
                                      <i className="ri-notification-off-line me-1 align-bottom" /> Muted
                                    </span>
                                  ) : m.hasPush ? (
                                    <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-11 fw-medium">
                                      <i className="ri-smartphone-line me-1 align-bottom" /> PWA Active
                                    </span>
                                  ) : (
                                    <span className="badge rounded-pill bg-light text-muted border px-2.5 py-1.5 fs-11 fw-medium">
                                      <i className="ri-computer-line me-1 align-bottom" /> Portal Only
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
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
                    Log of custom notifications sent from this console (auto-retained for 30 days).
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
                                <Badge color="info" className="text-wrap text-start" style={{ maxWidth: "220px", display: "inline-block" }}>
                                  {item.totalTargeted > 1
                                    ? `Users (${item.totalTargeted}): `
                                    : "User: "}
                                  {item.targetMemberName || "Specific"}
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

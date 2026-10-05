import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Table,
} from "reactstrap";
import { getInGymNow } from "../../api/attendanceStaff.api";
import { listBranches } from "../../api/branches.api";
import config from "../../config";

/** Format time into 12-hour AM/PM string. */
const formatTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/** Format date into DD MMM YYYY. */
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

/** Relative "just refreshed" label for the live feed. */
const formatUpdatedAgo = (ts) => {
  if (!ts) return "";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 5) return "Just updated";
  if (sec < 60) return `Updated ${sec}s ago`;
  return `Updated ${Math.floor(sec / 60)}m ago`;
};

/**
 * Membership status cell - copy aligned with the portal QR scanner verdict.
 */
const MembershipStatus = ({ memberData, isTrainer }) => {
  if (isTrainer) {
    return <span className="text-muted small">Staff on duty</span>;
  }

  const daysLeft = memberData?.daysUntilExpiry;
  const isExpiringSoon = Boolean(memberData?.isExpiringSoon);
  const isExpired = Boolean(memberData?.isExpired);

  if (daysLeft === null || daysLeft === undefined) {
    return <span className="text-muted small">-</span>;
  }

  if (isExpired) {
    return (
      <div>
        <Badge color="danger" className="text-uppercase fw-bold">
          <i className="ri-alarm-warning-line me-1" />
          Membership expired
        </Badge>
        {memberData?.endDate ? (
          <div className="text-danger small mt-1">
            Ended {formatDate(memberData.endDate)}
            {Math.abs(daysLeft) > 0 ? ` (${Math.abs(daysLeft)}d ago)` : ""}
          </div>
        ) : null}
      </div>
    );
  }

  if (daysLeft === 0) {
    return (
      <div>
        <Badge color="danger" className="text-uppercase fw-bold">
          <i className="ri-error-warning-line me-1" />
          Expires today
        </Badge>
        <div className="text-danger small mt-1">Renew at reception</div>
      </div>
    );
  }

  if (isExpiringSoon) {
    return (
      <div>
        <Badge
          color="danger"
          className="fw-bold fs-12 px-2 py-1"
          style={{
            backgroundColor: "#f06548",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(240, 101, 72, 0.2)",
          }}
        >
          <i className="ri-alarm-warning-fill me-1" />
          Expiring in {daysLeft} {daysLeft === 1 ? "day" : "days"}
        </Badge>
        {memberData?.endDate ? (
          <div className="text-danger fw-medium small mt-1">
            Till {formatDate(memberData.endDate)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <Badge
        color="success-subtle"
        className="text-success border border-success-subtle"
        pill
      >
        Active · {daysLeft} days left
      </Badge>
      {memberData?.endDate ? (
        <div className="text-muted small mt-1">
          Till {formatDate(memberData.endDate)}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Live Branch Check-In Scans Widget.
 *
 * Real-time monitor on the Admin Dashboard:
 * - Direct WebSocket connection for instant zero-latency scan updates.
 * - Server-Sent Events (SSE) & polling fallback.
 * - Flashes new rows when a member scans the branch QR.
 * - Highlights memberships expiring within 7 days (or already expired).
 */
const LiveBranchScansWidget = ({ branch = "" }) => {
  const initialBranch =
    branch === "All Branches" || !branch ? "" : branch;
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [branchesList, setBranchesList] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [wsConnected, setWsConnected] = useState(false);

  const inFlightRef = useRef(false);
  const knownIdsRef = useRef(new Set());
  const flashTimersRef = useRef(new Map());
  const hasSeededRef = useRef(false);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Sync prop changes if parent updates branch
  useEffect(() => {
    if (branch && branch !== "All Branches") {
      setSelectedBranch(branch);
    }
  }, [branch]);

  // Load available branches for selector
  useEffect(() => {
    let unmounted = false;
    listBranches(true)
      .then((res) => {
        if (!unmounted && res.data?.isOk) {
          setBranchesList(res.data.data || []);
        }
      })
      .catch((err) => {
        console.warn("Could not load branches for live widget:", err);
      });
    return () => {
      unmounted = true;
    };
  }, []);

  const triggerRowFlash = useCallback((id) => {
    if (!id) return;
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const existing = flashTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      flashTimersRef.current.delete(id);
    }, 3200);
    flashTimersRef.current.set(id, timer);
  }, []);

  const handleIncomingLiveScan = useCallback(
    (newSession, newDenial) => {
      if (newSession) {
        const branchMatches =
          !selectedBranch ||
          selectedBranch === "All Branches" ||
          newSession.branch === selectedBranch;

        if (branchMatches) {
          setData((prev) => {
            const currentSessions = prev?.sessions || [];
            // Remove existing session if present so newest re-scan is placed at top
            const remaining = currentSessions.filter(
              (s) => s._id !== newSession._id,
            );
            const updated = [newSession, ...remaining];
            return {
              ...(prev || {}),
              inGymNow: updated.length,
              sessions: updated,
            };
          });

          setLastUpdatedAt(Date.now());
          triggerRowFlash(newSession._id);
        }
      }

      if (newDenial) {
        const branchMatches =
          !selectedBranch ||
          selectedBranch === "All Branches" ||
          newDenial.branch === selectedBranch;

        if (branchMatches) {
          setData((prev) => {
            const currentDenials = prev?.denials || [];
            const remaining = currentDenials.filter(
              (d) => d._id !== newDenial._id,
            );
            return {
              ...(prev || {}),
              denials: [newDenial, ...remaining],
            };
          });
        }
      }
    },
    [selectedBranch, triggerRowFlash],
  );

  // WebSocket Connection
  useEffect(() => {
    let isCancelled = false;

    const connectWs = () => {
      if (isCancelled) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      try {
        const base = config.api.API_URL;
        let wsUrl = "";
        if (!base) {
          const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
          wsUrl = `${proto}//${window.location.host}/ws/attendance-live`;
        } else {
          const wsProto = base.startsWith("https") ? "wss:" : "ws:";
          const host = base.replace(/^https?:\/\//, "").replace(/\/+$/, "");
          wsUrl = `${wsProto}//${host}/ws/attendance-live`;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isCancelled) {
            setWsConnected(true);
            if (selectedBranch) {
              ws.send(
                JSON.stringify({ type: "FILTER", branch: selectedBranch }),
              );
            }
          }
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "CHECK_IN") {
              handleIncomingLiveScan(payload.session, payload.denial);
            }
          } catch {
            /* ignore malformed frames */
          }
        };

        ws.onclose = () => {
          if (!isCancelled) {
            setWsConnected(false);
            wsRef.current = null;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(connectWs, 3500);
          }
        };

        ws.onerror = () => {
          if (!isCancelled) {
            setWsConnected(false);
            try {
              ws.close();
            } catch {
              /* ignore */
            }
          }
        };
      } catch (err) {
        console.warn("WebSocket init error:", err);
        if (!isCancelled) {
          setWsConnected(false);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      isCancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
    };
  }, [selectedBranch, handleIncomingLiveScan]);

  // Server-Sent Events (SSE) Fallback
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const base = config.api.API_URL || "";
    const sseUrl = `${base}/api/v1/attendance/live-stream`;
    let sse;

    try {
      sse = new EventSource(sseUrl);
      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "CHECK_IN") {
            handleIncomingLiveScan(payload.session, payload.denial);
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }

    return () => {
      if (sse) {
        try {
          sse.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [handleIncomingLiveScan]);

  const fetchLiveScans = useCallback(
    async (showSpinner = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (showSpinner) setIsRefreshing(true);

      try {
        const branchParam =
          selectedBranch && selectedBranch !== "All Branches"
            ? selectedBranch
            : undefined;

        const res = await getInGymNow({
          branch: branchParam,
          subjectType: "ALL",
        });

        if (res.data?.isOk) {
          const next = res.data.data;
          const sessions = next?.sessions || [];
          const nextIds = new Set(sessions.map((s) => s._id).filter(Boolean));

          if (!hasSeededRef.current) {
            knownIdsRef.current = nextIds;
            hasSeededRef.current = true;
          } else {
            const newcomers = [];
            nextIds.forEach((id) => {
              if (!knownIdsRef.current.has(id)) newcomers.push(id);
            });

            if (newcomers.length > 0) {
              newcomers.forEach((id) => triggerRowFlash(id));
            }

            knownIdsRef.current = nextIds;
          }

          setData(next);
          setLastUpdatedAt(Date.now());
          setError("");
        } else {
          setError(res.data?.message || "Could not fetch live scans");
        }
      } catch (err) {
        console.error("Live branch scans error:", err);
        setError("Unable to update live scans");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [selectedBranch, triggerRowFlash],
  );

  useEffect(() => {
    hasSeededRef.current = false;
    knownIdsRef.current = new Set();
    flashTimersRef.current.forEach((t) => clearTimeout(t));
    flashTimersRef.current.clear();
    setFlashIds(new Set());

    fetchLiveScans(true);
    const timer = setInterval(() => {
      fetchLiveScans(false);
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchLiveScans]);

  // Keep the "Updated Xs ago" label fresh
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      flashTimersRef.current.forEach((t) => clearTimeout(t));
      flashTimersRef.current.clear();
    };
  }, []);

  const sessions = data?.sessions || [];
  const denials = data?.denials || [];
  const inGymCount = Number(data?.inGymNow ?? sessions.length);

  const expiringCount = sessions.filter(
    (s) => s.member && (s.member.isExpiringSoon || s.member.isExpired),
  ).length;

  return (
    <Card className="h-100 mb-0 shadow-sm border-0">
      <style>{`
        @keyframes liveScanPulse {
          0% { box-shadow: 0 0 0 0 rgba(10, 179, 156, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(10, 179, 156, 0); }
          100% { box-shadow: 0 0 0 0 rgba(10, 179, 156, 0); }
        }
        @keyframes liveScanRowFlash {
          0% { background-color: rgba(10, 179, 156, 0.28); }
          100% { background-color: transparent; }
        }
        .live-scans-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0ab39c;
          box-shadow: 0 0 0 3px rgba(10, 179, 156, 0.22);
          animation: liveScanPulse 2s ease-out infinite;
        }
        .live-scans-row-flash > td {
          animation: liveScanRowFlash 2.8s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .live-scans-dot,
          .live-scans-row-flash > td {
            animation: none !important;
          }
        }
      `}</style>
      <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-2">
        <div className="d-flex align-items-center gap-2">
          <div className="live-scans-dot flex-shrink-0" aria-hidden="true" />
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h5 className="card-title mb-0">Live Branch Check-Ins</h5>
              <Badge color="success" pill className="fs-12">
                {inGymCount} checked in
              </Badge>
              <Badge
                color={wsConnected ? "success-subtle" : "warning-subtle"}
                className={`border fs-11 px-2 py-0.5 ${
                  wsConnected
                    ? "text-success border-success-subtle"
                    : "text-warning border-warning-subtle"
                }`}
                pill
                title={
                  wsConnected
                    ? "Realtime WebSocket active: scans appear immediately"
                    : "Reconnecting to live WebSocket (polling active)"
                }
              >
                <i
                  className={`ri-${
                    wsConnected ? "broadcast-line" : "time-line"
                  } me-1 align-middle`}
                />
                {wsConnected ? "Realtime Live" : "Polling"}
              </Badge>
            </div>
            <small className="text-muted">
              Branch QR scans update live
              {lastUpdatedAt ? ` · ${formatUpdatedAgo(lastUpdatedAt)}` : ""}
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Branch filter switcher */}
          {branchesList.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ width: "135px", fontSize: "12px", height: "30px" }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filter branch"
            >
              <option value="">All Branches</option>
              {branchesList.map((b) => (
                <option key={b._id} value={b.name}>
                  {b.displayName || b.name}
                </option>
              ))}
            </select>
          )}

          {expiringCount > 0 ? (
            <Badge color="danger" pill className="px-2 py-1 fs-12">
              <i className="ri-error-warning-line me-1" />
              {expiringCount} need renewal
            </Badge>
          ) : null}

          <Link
            to="/attendance-overview"
            className="btn btn-sm btn-soft-secondary"
            title="Open Full Attendance Overview"
          >
            Full View
          </Link>
          <Button
            color="light"
            size="sm"
            onClick={() => fetchLiveScans(true)}
            disabled={isRefreshing}
            title="Refresh now"
          >
            {isRefreshing ? (
              <Spinner size="sm" />
            ) : (
              <i className="ri-refresh-line" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        {error ? (
          <div className="alert alert-warning py-2 small mb-3" role="alert">
            <i className="ri-alert-line align-middle me-1" />
            {error}
          </div>
        ) : null}

        {denials.length > 0 ? (
          <div className="alert alert-danger py-2 px-3 small d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
            <div>
              <i className="ri-close-circle-line me-1 align-middle fs-6" />
              <strong>
                {denials.length} refused check-in
                {denials.length === 1 ? "" : "s"} today
              </strong>{" "}
              - member needs assistance at the desk.
            </div>
            <Link
              to="/attendance-overview"
              className="btn btn-sm btn-danger py-0 px-2"
            >
              Resolve
            </Link>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="text-center py-5 text-muted">
            <Spinner color="primary" size="sm" className="me-2" />
            <span>Connecting to live branch scanner feed...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle"
              style={{ width: 56, height: 56 }}
            >
              <i
                className="ri-qr-scan-2-line text-primary"
                style={{ fontSize: "1.6rem" }}
                aria-hidden="true"
              />
            </div>
            <p className="mb-1 fw-medium">No check-ins recorded yet today</p>
            <p className="small text-muted mb-0 mx-auto" style={{ maxWidth: 360 }}>
              When members scan the branch QR at the desk, their name and
              membership status appear here immediately.
            </p>
          </div>
        ) : (
          <div
            className="table-responsive"
            style={{ maxHeight: "360px", overflowY: "auto" }}
          >
            <Table className="align-middle table-nowrap mb-0" size="sm" hover>
              <thead className="table-light sticky-top">
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Branch</th>
                  <th scope="col">Membership</th>
                  <th scope="col">Checked in</th>
                  <th scope="col" className="text-end">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const isTrainer =
                    s.subjectType === "TRAINER" || Boolean(s.trainer);
                  const person = isTrainer ? s.trainer : s.member;
                  const memberData = !isTrainer ? s.member : null;
                  const isExpiringSoon = Boolean(memberData?.isExpiringSoon);
                  const isExpired = Boolean(memberData?.isExpired);
                  const needsRenewal = isExpired || isExpiringSoon;
                  const isNew = flashIds.has(s._id);

                  const rowClass = [
                    needsRenewal
                      ? "table-danger border-start border-danger border-3"
                      : "",
                    isNew ? "live-scans-row-flash" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={s._id} className={rowClass}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="avatar-xs flex-shrink-0">
                            {memberData?.photo ? (
                              <img
                                src={memberData.photo}
                                alt={person?.fullName || "Member"}
                                className="rounded-circle avatar-xs object-fit-cover"
                              />
                            ) : (
                              <span
                                className={`avatar-title rounded-circle ${
                                  needsRenewal
                                    ? "bg-danger text-white fw-bold"
                                    : isTrainer
                                      ? "bg-info-subtle text-info fw-semibold"
                                      : "bg-primary-subtle text-primary fw-semibold"
                                }`}
                              >
                                {person?.fullName?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="fw-semibold text-truncate">
                              {person?.fullName ||
                                (isTrainer ? "Trainer" : "Member")}
                              {isNew ? (
                                <Badge
                                  color="success"
                                  className="ms-2 py-0 px-1"
                                  pill
                                >
                                  New
                                </Badge>
                              ) : null}
                              {s.source === "QR" ? (
                                <Badge
                                  color="primary-subtle"
                                  className="text-primary ms-2 py-0 px-1"
                                  pill
                                  title="Scanned Branch QR"
                                >
                                  <i className="ri-qr-code-line align-middle me-1" />
                                  QR
                                </Badge>
                              ) : null}
                              {isTrainer ? (
                                <Badge
                                  color="info"
                                  className="ms-2 py-0 px-1"
                                  pill
                                >
                                  Trainer
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-muted small">
                              {person?.mobileNumber || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {s.branch || "-"}
                        </span>
                      </td>
                      <td>
                        <MembershipStatus
                          memberData={memberData}
                          isTrainer={isTrainer}
                        />
                      </td>
                      <td>
                        <div className="fw-medium">
                          {formatTime(s.checkInAt)}
                        </div>
                        <div className="text-muted small">
                          {s.minutesSoFar < 1
                            ? "Just now"
                            : `${s.minutesSoFar}m ago`}
                        </div>
                      </td>
                      <td className="text-end">
                        {person?.mobileNumber ? (
                          <a
                            href={`tel:${String(person.mobileNumber).replace(/\s/g, "")}`}
                            className={`btn btn-sm ${
                              needsRenewal
                                ? "btn-danger"
                                : "btn-soft-primary"
                            }`}
                            title={`Call ${person.fullName}`}
                          >
                            <i className="ri-phone-line" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default LiveBranchScansWidget;

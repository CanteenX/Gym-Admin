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
 * - Polls recent branch check-ins every 10 seconds.
 * - Flashes new rows when a member scans the branch QR.
 * - Highlights memberships expiring within 7 days (or already expired).
 */
const LiveBranchScansWidget = ({ branch = "" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const [flashIds, setFlashIds] = useState(() => new Set());
  const inFlightRef = useRef(false);
  const knownIdsRef = useRef(new Set());
  const flashTimersRef = useRef(new Map());
  const hasSeededRef = useRef(false);

  const fetchLiveScans = useCallback(
    async (showSpinner = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (showSpinner) setIsRefreshing(true);

      try {
        const res = await getInGymNow({
          branch: branch || undefined,
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
              setFlashIds((prev) => {
                const merged = new Set(prev);
                newcomers.forEach((id) => merged.add(id));
                return merged;
              });

              newcomers.forEach((id) => {
                const existing = flashTimersRef.current.get(id);
                if (existing) clearTimeout(existing);
                const timer = setTimeout(() => {
                  setFlashIds((prev) => {
                    const nextSet = new Set(prev);
                    nextSet.delete(id);
                    return nextSet;
                  });
                  flashTimersRef.current.delete(id);
                }, 2800);
                flashTimersRef.current.set(id, timer);
              });
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
    [branch],
  );

  useEffect(() => {
    // Re-seed flash tracking whenever the branch filter changes so the first
    // response for the new scope is not treated as a burst of "New" rows.
    hasSeededRef.current = false;
    knownIdsRef.current = new Set();
    flashTimersRef.current.forEach((t) => clearTimeout(t));
    flashTimersRef.current.clear();
    setFlashIds(new Set());

    fetchLiveScans(true);
    const timer = setInterval(() => {
      fetchLiveScans(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchLiveScans]);

  // Keep the "Updated Xs ago" label fresh without refetching.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 5000);
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

  // tick is only used to re-render the relative time label
  void tick;

  return (
    <Card className="card-height-100 live-scans-card">
      <style>{`
        @keyframes liveScanPulse {
          0% { box-shadow: 0 0 0 0 rgba(10, 179, 156, 0.45); }
          70% { box-shadow: 0 0 0 8px rgba(10, 179, 156, 0); }
          100% { box-shadow: 0 0 0 0 rgba(10, 179, 156, 0); }
        }
        @keyframes liveScanRowFlash {
          0% { background-color: rgba(10, 179, 156, 0.22); }
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
          animation: liveScanRowFlash 2.6s ease-out;
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
            </div>
            <small className="text-muted">
              Branch QR scans update live
              {lastUpdatedAt ? ` · ${formatUpdatedAgo(lastUpdatedAt)}` : ""}
            </small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
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
                            {person?.mobileNumber ? (
                              <div className="text-muted small">
                                {person.mobileNumber}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-body border">
                          {s.branch}
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

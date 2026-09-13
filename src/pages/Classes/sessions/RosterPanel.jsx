import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "reactstrap";
import TableSkeleton from "@/Components/Common/TableSkeleton";
import {
  bookingStatusMeta,
  bookingSubject,
  capacityState,
  formatDateTime,
  formatDuration,
  membershipState,
  SOURCE_LABELS,
} from "../classesFormat";

/**
 * Who is coming to one class, and the four buttons that say what happened.
 *
 * ============================================================================
 * A LIST OF CARDS, NOT A TABLE, AND THE REASON IS THE VIEWPORT.
 * ============================================================================
 * This is read at the door on a phone. A booking carries a name, a phone
 * number, a membership expiry, a source, a status and up to three actions;
 * as table columns that is ~1500px of content, which at 390px becomes a
 * horizontal scroll over the very buttons being reached for. Stacked rows that
 * wrap cost nothing at 1440px and stay usable at 390px.
 *
 * CANCELLED ROWS ARE SHOWN, in their own filter. "Six booked, two cancelled"
 * is what decides whether to open the slot back up; hiding the cancellations
 * makes a half-empty class look like nobody was ever interested.
 */
const FILTERS = [
  { value: "", label: "Everyone" },
  { value: "BOOKED", label: "Booked" },
  { value: "ATTENDED", label: "Attended" },
  { value: "NO_SHOW", label: "No show" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RosterPanel = ({
  roster,
  loading,
  permissions,
  markingId,
  onBack,
  onRefresh,
  onMark,
  onRequestCancel,
}) => {
  const [filter, setFilter] = useState("");

  const session = roster?.session || null;
  const counts = roster?.counts || {};
  const byStatus = counts.byStatus || {};
  const bookings = useMemo(() => roster?.bookings || [], [roster]);

  const visible = useMemo(
    () => (filter ? bookings.filter((b) => b.status === filter) : bookings),
    [bookings, filter],
  );

  // The session carries the virtuals; counts repeats them. Read the counts
  // block, which is what the roster endpoint publishes for exactly this.
  const seats = capacityState({
    capacity: counts.capacity ?? session?.capacity,
    bookedCount: counts.bookedCount ?? session?.bookedCount,
    remainingCapacity: counts.remainingCapacity ?? session?.remainingCapacity,
    isFull: session?.isFull,
  });

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h5 className="mb-1">{session?.title || "Class roster"}</h5>
          <div className="text-muted small">
            <i className="ri-calendar-event-line" aria-hidden="true"></i>{" "}
            {formatDateTime(session?.start) || "—"}
            {session?.durationMinutes
              ? ` · ${formatDuration(session.durationMinutes)}`
              : ""}
          </div>
          <div className="text-muted small">
            <i className="ri-map-pin-line" aria-hidden="true"></i>{" "}
            {session?.branch || "—"}
            {session?.trainer?.fullName ? (
              <>
                {" · "}
                <i className="ri-user-star-line" aria-hidden="true"></i>{" "}
                {session.trainer.fullName}
              </>
            ) : null}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className={`badge ${seats.tone}`} title={seats.hint}>
            {seats.label}
          </span>
          <span className="badge bg-light text-body">
            {seats.booked} / {seats.capacity} booked
          </span>
          <Button
            color="light"
            size="sm"
            onClick={onRefresh}
            title="Reload roster"
            aria-label="Reload roster"
          >
            <i className="ri-refresh-line" aria-hidden="true"></i>
          </Button>
          <Button color="dark" size="sm" onClick={onBack}>
            <i className="ri-arrow-left-line" aria-hidden="true"></i> Back to
            classes
          </Button>
        </div>
      </div>

      {session?.notes ? (
        <div className="alert alert-light border small mb-3">
          <strong>Internal note:</strong> {session.notes}
        </div>
      ) : null}

      <div
        className="d-flex flex-wrap gap-1 mb-3"
        role="group"
        aria-label="Filter the roster by booking status"
      >
        {FILTERS.map((f) => {
          const count = f.value ? byStatus[f.value] || 0 : bookings.length;
          return (
            <button
              key={f.value || "ALL"}
              type="button"
              className={`btn btn-sm ${
                filter === f.value ? "btn-success" : "btn-light"
              }`}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}{" "}
              <span className="badge bg-light text-body ms-1">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        /* A grey line of text where the roster goes reads as "nobody booked",
           which is the opposite of what it means. Placeholder rows of roughly
           booking-row shape read as "still fetching" and stop the panel from
           resizing when the real rows arrive. No header bar: these are stacked
           cards, not columns. */
        <TableSkeleton rows={3} columns={3} header={false} label="Loading roster" />
      ) : visible.length === 0 ? (
        <div className="text-center py-4 text-muted">
          {bookings.length === 0
            ? "Nobody has booked this class yet."
            : "No bookings with that status."}
        </div>
      ) : (
        <ul className="list-unstyled mb-0">
          {visible.map((booking) => (
            <RosterRow
              key={booking._id}
              booking={booking}
              permissions={permissions}
              busy={markingId === booking._id}
              onMark={onMark}
              onRequestCancel={onRequestCancel}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * One person's place.
 *
 * ============================================================================
 * `booking.member` MAY BE NULL AND THAT IS THE NORMAL CASE FOR A FREE TRIAL.
 * ============================================================================
 * bookingSubject() in ../classesFormat resolves member XOR lead (and the third
 * case, where neither reference survives), so nothing below ever reaches into
 * `booking.member.…` directly.
 */
const RosterRow = ({ booking, permissions, busy, onMark, onRequestCancel }) => {
  const who = bookingSubject(booking);
  const status = bookingStatusMeta(booking.status);
  const membership = membershipState(who.endDate);
  const nameChanged = who.currentName && who.currentName !== who.name;
  const phoneChanged = who.currentPhone && who.currentPhone !== who.phone;

  return (
    <li className="border rounded p-2 mb-2">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-semibold text-wrap">{who.name}</span>
            <span className={`badge ${who.tone}`}>
              <i className={who.icon} aria-hidden="true"></i> {who.label}
            </span>
            <span className={`badge ${status.tone}`}>
              <i className={status.icon} aria-hidden="true"></i> {status.label}
            </span>
            {membership ? (
              /* Context for the front desk, never a gate: a booking is a claim
                 about a future slot, so an expiring membership is the renewal
                 conversation to have — not a reason to refuse the place. */
              <span className={`badge ${membership.tone}`} title={membership.hint}>
                {membership.label}
              </span>
            ) : null}
            {who.leadStatus ? (
              <span className="badge bg-light text-body">
                Lead: {who.leadStatus}
              </span>
            ) : null}
          </div>

          <div className="small text-muted text-wrap mt-1">
            {who.phone ? (
              <span className="me-2">
                <i className="ri-phone-line" aria-hidden="true"></i> {who.phone}
              </span>
            ) : null}
            {who.email ? (
              <span className="me-2">
                <i className="ri-mail-line" aria-hidden="true"></i> {who.email}
              </span>
            ) : null}
            <span className="me-2">
              {SOURCE_LABELS[booking.source] || booking.source}
            </span>
            <span>Booked {formatDateTime(booking.createdAt) || "—"}</span>
          </div>

          {nameChanged || phoneChanged ? (
            /* The row keeps who booked as they identified themselves; the
               linked record keeps who they are now. Both are real answers, so
               a difference is shown rather than one silently winning. */
            <div className="small text-muted text-wrap">
              Record now says{" "}
              {nameChanged ? <strong>{who.currentName}</strong> : null}
              {nameChanged && phoneChanged ? " · " : null}
              {phoneChanged ? who.currentPhone : null}
            </div>
          ) : null}

          {booking.cancelReason ? (
            <div className="small text-muted text-wrap">
              Note: {booking.cancelReason}
            </div>
          ) : null}
        </div>

        {permissions.edit ? (
          <div className="d-flex align-items-start gap-1 flex-wrap">
            {booking.status !== "ATTENDED" && (
              <Button
                color="success"
                size="sm"
                disabled={busy}
                onClick={() => onMark(booking, "ATTENDED")}
              >
                Attended
              </Button>
            )}
            {booking.status !== "NO_SHOW" && (
              <Button
                color="warning"
                size="sm"
                disabled={busy}
                onClick={() => onMark(booking, "NO_SHOW")}
              >
                No show
              </Button>
            )}
            {booking.status === "BOOKED" && (
              <Button
                color="danger"
                size="sm"
                disabled={busy}
                onClick={() => onRequestCancel(booking)}
              >
                Cancel
              </Button>
            )}
            {booking.status !== "BOOKED" && (
              <Button
                color="light"
                size="sm"
                disabled={busy}
                onClick={() => onMark(booking, "BOOKED")}
                title="Takes a seat back, so it can fail if the class is now full"
              >
                <i className="ri-arrow-go-back-line" aria-hidden="true"></i>{" "}
                Reinstate
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
};

RosterRow.propTypes = {
  booking: PropTypes.object.isRequired,
  permissions: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  onMark: PropTypes.func.isRequired,
  onRequestCancel: PropTypes.func.isRequired,
};

RosterPanel.propTypes = {
  roster: PropTypes.object,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  markingId: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onMark: PropTypes.func.isRequired,
  onRequestCancel: PropTypes.func.isRequired,
};

export default RosterPanel;

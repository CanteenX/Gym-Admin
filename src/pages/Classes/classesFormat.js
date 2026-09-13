/**
 * Shared formatting and state helpers for the /class-sessions screen.
 *
 * Kept out of the page components so the three places that render a booking
 * (the roster, the cross-class list and the delete confirmation) cannot drift
 * apart on the two things that are easy to get subtly wrong: which seat number
 * to trust, and who a booking actually belongs to.
 */

/**
 * `<input type="datetime-local">` wants wall-clock time with no zone, while the
 * API stores an instant. toISOString() shifts by the UTC offset, so using it
 * here would show every class starting 5h30m earlier than it does — the exact
 * bug WebsiteAdverts.jsx documents, and it matters more on a class than on an
 * advert because somebody turns up at the wrong time.
 */
export const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

/** The reverse: local wall clock back to an unambiguous instant for the API. */
export const toApiDate = (localValue) => {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** "60 min" / "1 h 30 min". A timetable is read at a glance; 90 min is not. */
export const formatDuration = (minutes) => {
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/**
 * ============================================================================
 * SEATS ARE READ, NEVER RECOMPUTED.
 * ============================================================================
 * `remainingCapacity` and `isFull` are virtuals on ClassSession, derived from
 * the `bookedCount` counter that only the atomic reservation moves. Working
 * them out here as `capacity - bookedCount` would be a second copy of a number
 * the server can change between the response and the render, and the two copies
 * would disagree exactly when it matters — on the last seat.
 *
 * So when the field is absent (a payload not serialised with virtuals) this
 * returns null and the caller prints an em dash. A blank is honest; a
 * confidently wrong "1 left" is not.
 *
 * @param {object} session
 * @returns {{remaining: (number|null), capacity: number, booked: number,
 *   isFull: boolean, tone: string, label: string, hint: string}}
 */
export const capacityState = (session = {}) => {
  const capacity = Number(session.capacity) || 0;
  const booked = Number(session.bookedCount) || 0;
  const remaining =
    typeof session.remainingCapacity === "number"
      ? session.remainingCapacity
      : null;
  const isFull =
    typeof session.isFull === "boolean" ? session.isFull : remaining === 0;

  if (remaining === null) {
    return {
      remaining: null,
      capacity,
      booked,
      isFull: false,
      tone: "bg-light text-body",
      label: "—",
      hint: "The server did not send a remaining-seat count for this class.",
    };
  }
  if (isFull) {
    return {
      remaining,
      capacity,
      booked,
      isFull: true,
      tone: "bg-danger-subtle text-danger",
      label: "Full",
      hint: `All ${capacity} places are taken.`,
    };
  }
  return {
    remaining,
    capacity,
    booked,
    isFull: false,
    tone: remaining <= 3 ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success",
    label: `${remaining} left`,
    hint: `${booked} of ${capacity} places are taken.`,
  };
};

/** Has the class started? Drives the "can anybody still book it" hint. */
export const sessionTiming = (session = {}) => {
  const start = session.start ? new Date(session.start) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { past: false, label: "", tone: "bg-light text-body", hint: "" };
  }
  if (start.getTime() <= Date.now()) {
    return {
      past: true,
      label: "Past",
      tone: "bg-light text-body",
      hint: "This class has started, so nobody can still book it.",
    };
  }
  return {
    past: false,
    label: "Upcoming",
    tone: "bg-info-subtle text-info",
    hint: "Open for booking while the class is active.",
  };
};

/** Badge styling per booking status. Bootstrap tokens only — no colour literals. */
export const BOOKING_STATUS_META = {
  BOOKED: {
    label: "Booked",
    tone: "bg-primary-subtle text-primary",
    icon: "ri-calendar-check-line",
  },
  ATTENDED: {
    label: "Attended",
    tone: "bg-success-subtle text-success",
    icon: "ri-check-double-line",
  },
  NO_SHOW: {
    label: "No show",
    tone: "bg-warning-subtle text-warning",
    icon: "ri-user-unfollow-line",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-danger-subtle text-danger",
    icon: "ri-close-circle-line",
  },
};

export const bookingStatusMeta = (status) =>
  BOOKING_STATUS_META[status] || {
    label: status || "Unknown",
    tone: "bg-light text-body",
    icon: "ri-information-line",
  };

/** Where the booking came in from. Not security-relevant; it is for the roster. */
export const SOURCE_LABELS = {
  WEBSITE: "Website",
  PORTAL: "Member portal",
  ADMIN: "Front desk",
};

/**
 * ============================================================================
 * A BOOKING BELONGS TO A MEMBER **XOR** A LEAD. NEITHER MAY BE ASSUMED.
 * ============================================================================
 * The free trial is why: a prospect who has never walked in has no Member row
 * and must not be given one, because a half-populated Member poisons every
 * member count, renewal report and attendance denominator. So they book as a
 * `lead`, and `booking.member` is null on that row. Reading
 * `booking.member.fullName` on a roster is therefore not a rare edge case — it
 * is every free-trial booking, and it takes the whole screen down.
 *
 * A third case is real too: the roster populates with `.lean()`, so a Lead that
 * has since been deleted comes back as null on BOTH sides. The row still has to
 * render, because somebody is turning up to the class either way.
 *
 * WHICH NAME IS SHOWN, AND WHY THERE ARE TWO.
 * `booking.name/phone/email` are copied onto the row at booking time and record
 * who claimed the seat, as they identified themselves then. The reference
 * records who they are now, and a member can change their mobile number
 * afterwards. Both questions are real, so the copy is the primary line — it is
 * the name on the list at the door — and a differing current value is shown
 * beside it rather than silently replacing it.
 *
 * @param {object} booking
 * @returns {{kind: string, label: string, icon: string, tone: string,
 *   name: string, phone: string, email: string, currentName: string,
 *   currentPhone: string, endDate: (string|null), leadStatus: string}}
 */
export const bookingSubject = (booking = {}) => {
  const bookedName = booking.name || "";
  const bookedPhone = booking.phone || "";
  const bookedEmail = booking.email || "";

  const member = booking.member || null;
  if (member) {
    return {
      kind: "MEMBER",
      label: "Member",
      icon: "ri-vip-crown-line",
      tone: "bg-primary-subtle text-primary",
      name: bookedName || member.fullName || "Unnamed",
      phone: bookedPhone || member.mobileNumber || "",
      email: bookedEmail || member.email || "",
      currentName: member.fullName || "",
      currentPhone: member.mobileNumber || "",
      endDate: member.endDate || null,
      leadStatus: "",
    };
  }

  const lead = booking.lead || null;
  if (lead) {
    return {
      kind: "LEAD",
      label: "Prospect",
      icon: "ri-user-search-line",
      tone: "bg-info-subtle text-info",
      name: bookedName || lead.name || "Unnamed",
      phone: bookedPhone || lead.phone || "",
      email: bookedEmail || lead.email || "",
      currentName: lead.name || "",
      currentPhone: lead.phone || "",
      endDate: null,
      leadStatus: lead.status || "",
    };
  }

  // Neither reference resolved. The copied identity is all there is, and it is
  // enough to let somebody in — so say so plainly instead of rendering a blank.
  return {
    kind: "UNKNOWN",
    label: "No linked record",
    icon: "ri-user-line",
    tone: "bg-light text-body",
    name: bookedName || "Unnamed",
    phone: bookedPhone,
    email: bookedEmail,
    currentName: "",
    currentPhone: "",
    endDate: null,
    leadStatus: "",
  };
};

/** Days from now to a date, rounded up (negative means already past). */
const daysUntil = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

/**
 * Membership expiry, for CONTEXT ON THE ROSTER ONLY.
 *
 * ============================================================================
 * THIS IS NEVER A REASON TO REFUSE A BOOKING, AND THE SERVER AGREES.
 * ============================================================================
 * Attendance check-in IS gated on expiry — that is a claim about training today
 * on a membership that has lapsed. A booking is a claim about a future slot, and
 * somebody whose membership runs out next week booking the week after is exactly
 * the renewal the gym wants to win. So the booking endpoint deliberately does
 * not check it, and nothing on this screen may either. It is shown so the person
 * at the desk can have the renewal conversation face to face.
 *
 * @param {string|Date|null} endDate
 * @returns {{tone: string, label: string, hint: string}|null}
 */
export const membershipState = (endDate) => {
  if (!endDate) return null;
  const days = daysUntil(endDate);
  if (days === null) return null;
  const on = formatDate(endDate);

  if (days < 0) {
    return {
      tone: "bg-danger-subtle text-danger",
      label: `Expired ${on}`,
      hint: "Membership has lapsed — a good moment to talk about renewing. It does not block the booking.",
    };
  }
  if (days <= 14) {
    return {
      tone: "bg-warning-subtle text-warning",
      label: `Expires ${on}`,
      hint: `Membership ends in ${days} day(s) — worth a renewal conversation at the door.`,
    };
  }
  return {
    tone: "bg-success-subtle text-success",
    label: `Valid to ${on}`,
    hint: "Membership is current.",
  };
};

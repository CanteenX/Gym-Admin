/**
 * Class Sessions API Service
 *
 * Bookable classes (the gym diary) and the bookings held against them.
 *
 * JSON throughout — a class carries no file, so there is no multipart variant
 * here and no reason for one. Never call axios from a page: the shared instance
 * in ./index carries withCredentials (the staff session cookie) and the 401
 * redirect, and a page that reaches past it loses both.
 *
 * ============================================================================
 * TWO NUMBERS ON A CLASS ARE SERVER-OWNED. DO NOT SEND THEM, DO NOT RECOMPUTE.
 * ============================================================================
 * `bookedCount` is a cached counter that only services/bookingCapacity.js
 * moves, through conditional updates that compare it with `capacity` inside one
 * round trip. `remainingCapacity` and `isFull` are virtuals derived from it and
 * arrive on every response. Subtracting them again in a component would be a
 * second, slower copy of a number that can change between two renders — read
 * what the server sent and render that.
 *
 * The create/update helpers below therefore never put `bookedCount` in a body;
 * the server also sets it explicitly to 0 on create so a stray field cannot
 * reach the document.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Paged list of classes. House params: skip, per_page, match, sorton, sortdir.
 *
 * Also accepted, and all optional: `branch`, `isActive`, `fromDate`, `toDate`,
 * `upcomingOnly`. `sorton` is validated server-side against
 * start | title | branch | capacity | createdAt and falls back to `start`.
 *
 * BRANCH IS A REQUEST, NOT AN INSTRUCTION. resolveBranchFilter reads the staff
 * session: a branch admin's own branch always wins, so `branch` here can only
 * narrow a super admin's view. Sending it is safe; relying on it to widen one
 * is not.
 */
export const searchClassSessions = async (params) => {
    return api.post(ENDPOINTS.CLASS_SESSIONS.SEARCH, params);
};

export const createClassSession = async (data) => {
    return api.post(ENDPOINTS.CLASS_SESSIONS.BASE, data);
};

export const updateClassSession = async (id, data) => {
    return api.put(ENDPOINTS.CLASS_SESSIONS.BY_ID(id), data);
};

/**
 * Deletes a class AND every booking on it.
 *
 * ============================================================================
 * A 409 HERE IS NOT AN ERROR TO RETRY — IT IS A QUESTION TO PUT TO THE USER.
 * ============================================================================
 * While anybody holds a BOOKED place the server refuses with
 * `{ isOk: false, status: 409, code: "HAS_BOOKINGS", bookings: <number> }`.
 * `force` is what answers that question, so it must come from a person who has
 * been shown the number — the alternative is a panel that quietly deletes other
 * people's plans on the first click and tells nobody.
 *
 * Switching the class off (`isActive: false`) hides it from the public list
 * without touching the bookings, and is almost always what was meant.
 *
 * @param {string} id
 * @param {boolean} [force] - true also cancels the bookings. Ask first.
 */
export const deleteClassSession = async (id, force = false) => {
    return api.delete(ENDPOINTS.CLASS_SESSIONS.BY_ID(id), {
        params: force ? { force: true } : {},
    });
};

/**
 * Everyone on one class.
 *
 * Returns `{ session, counts: { capacity, bookedCount, remainingCapacity,
 * byStatus }, bookings: [...] }`. Cancelled rows come back too, in their own
 * bucket of `byStatus` — "six booked, two cancelled" is what decides whether to
 * open the slot back up, and hiding the cancellations makes a half-empty class
 * look like nobody was ever interested.
 *
 * Each booking references EXACTLY ONE of `member` or `lead`; see
 * pages/Classes/classesFormat.js for why, and for the helper that reads them.
 */
export const getClassRoster = async (id) => {
    return api.get(ENDPOINTS.CLASS_SESSIONS.ROSTER(id));
};

/**
 * Paged list of bookings across classes. Same house params, plus `status`,
 * `branch`, `session` (an id) and a `fromDate`/`toDate` window over
 * `sessionStart`. `match` searches name, phone and email.
 */
export const searchClassBookings = async (params) => {
    return api.post(ENDPOINTS.CLASS_BOOKINGS.SEARCH, params);
};

/**
 * Marks a booking ATTENDED | NO_SHOW | CANCELLED, or reinstates it to BOOKED.
 *
 * Only two of those move a seat, and the server owns which:
 *   ATTENDED / NO_SHOW  the class happened, the seat was used either way, so
 *                       the counter does not change.
 *   CANCELLED           the seat is released — but only if the row really was
 *                       BOOKED a moment ago, so a double click frees one seat
 *                       rather than two.
 *   BOOKED              a seat has to be TAKEN again and may no longer exist.
 *                       This is the one staff action that can legitimately come
 *                       back 409 "that class is now full"; surface the message.
 *
 * @param {string} id
 * @param {string} status - BOOKED | ATTENDED | CANCELLED | NO_SHOW
 * @param {string} [reason] - stored on the row; "cancelled, ill" and
 *   "cancelled, class moved" are different facts to whoever reads the roster.
 */
export const updateBookingStatus = async (id, status, reason = "") => {
    return api.put(ENDPOINTS.CLASS_BOOKINGS.BY_ID(id), {
        status,
        ...(reason ? { reason } : {}),
    });
};

export default {
    searchClassSessions,
    createClassSession,
    updateClassSession,
    deleteClassSession,
    getClassRoster,
    searchClassBookings,
    updateBookingStatus,
};

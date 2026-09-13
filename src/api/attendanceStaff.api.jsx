/**
 * Staff-facing attendance API service.
 *
 * ============================================================================
 * WORDING IS PART OF THE CONTRACT: "NOT CHECKED IN", NEVER "NOT VISITED".
 * ============================================================================
 * Check-in is unattended and self-reported. The branch QR is a printed sticker
 * (so it can be photographed and used from a sofa) and the portal's check-in
 * button needs no QR at all. A row therefore proves somebody pressed a button,
 * not that they were in the building — and the absence of a row proves nothing,
 * because a member can train without logging it.
 *
 * So these endpoints measure LOGGING BEHAVIOUR. That is still the best churn
 * prompt the data supports, but it is a reason to make a phone call, not
 * evidence somebody stopped attending. The server repeats the caveat in a
 * `basis` string on every response for exactly this reason; screens rendering
 * this data must carry it through rather than relabelling it "visits".
 *
 * Branch scoping is enforced server-side from the session. A `branch` argument
 * can only NARROW a super admin's view — for a branch admin it is ignored, so
 * there is no need (and no way) to enforce anything from here.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/** Drops empty values so `?branch=&days=` never reaches the server. */
const qs = (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const s = query.toString();
  return s ? `?${s}` : "";
};

/**
 * Check-ins per branch per day.
 *
 * @param {{ fromDate?: string, toDate?: string, branch?: string }} params
 * @returns data: { from, to, days[], byBranch[], totalCheckIns, basis }
 *   days[]    { branch, date, checkIns, uniqueMembers, autoClosedSessions, totalMinutes }
 *   byBranch[] { branch, checkIns, totalMinutes }
 */
export const getFootfall = async (params = {}) =>
  api.get(`${ENDPOINTS.ATTENDANCE_STAFF.FOOTFALL}${qs(params)}`);

/**
 * Open sessions — who is on the floor right now, as far as the logs know.
 *
 * `staleOpenSessions` is a COUNT, not a list, and is not part of `inGymNow`:
 * those are rows still open past the longest legitimate session (120 min),
 * waiting for the portal's lazy auto-close. A rising number means members are
 * not finding the check-out button, not that the gym is full.
 *
 * @param {{ branch?: string, since?: string }} params
 * @returns data: { serverTime, inGymNow, sessions[], staleOpenSessions, basis }
 *   sessions[] { _id, branch, checkInAt, minutesSoFar, member { _id, fullName, mobileNumber, photo } | null }
 */
export const getInGymNow = async (params = {}) =>
  api.get(`${ENDPOINTS.ATTENDANCE_STAFF.LIVE}${qs(params)}`);

/**
 * Active members with no LOGGED check-in in the last N days. A call list.
 *
 * @param {{ days?: number, skip?: number, per_page?: number, branch?: string }} params
 * @returns data: { days, cutoff, total, rosterTruncated, rows[], basis }
 *   rows[] { _id, fullName, mobileNumber, branch, planCode, endDate,
 *            membershipExpired, lastCheckInAt, daysSinceLastCheckIn,
 *            hasEverCheckedIn }
 *   `daysSinceLastCheckIn` is null for a member who has NEVER logged one —
 *   often a portal that was never set up, which is a different conversation
 *   from a member who has gone quiet.
 */
export const getNotCheckedIn = async (params = {}) =>
  api.get(`${ENDPOINTS.ATTENDANCE_STAFF.NOT_CHECKED_IN}${qs(params)}`);

export default {
  getFootfall,
  getInGymNow,
  getNotCheckedIn,
};

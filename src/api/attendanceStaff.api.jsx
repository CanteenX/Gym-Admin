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
 * ============================================================================
 * `subjectType` IS NOT OPTIONAL DECORATION — OMITTING IT IS A WRONG NUMBER.
 * ============================================================================
 * Phase 3 put trainer shifts in the same Attendance collection behind a
 * discriminator. The server defaults every one of these endpoints to
 * `MEMBER` and falls back to `MEMBER` for any value it does not recognise —
 * deliberately, so a mistake reads as a number that is too SMALL and obviously
 * so, rather than one that is too big and plausible. "TRAINER" and "ALL" have
 * to be asked for by name.
 *
 * Whatever was counted comes back in `data.subjectType`, so a screen renders
 * that rather than assuming what it asked for was honoured.
 *
 * Denied scans are excluded from every count here. A refused attempt is a real
 * row — the desk needs to see it — but it is not a visit, and a lapsed member
 * tapping the sticker five times must not read as five arrivals. The only place
 * denials surface is the attendance CSV export, with `includeDenied=true`.
 */

/**
 * Check-ins per branch per day.
 *
 * @param {{ fromDate?: string, toDate?: string, branch?: string,
 *           subjectType?: "MEMBER"|"TRAINER"|"ALL" }} params
 * @returns data: { from, to, days[], byBranch[], totalCheckIns, subjectType, basis }
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
 * `trainer` is a SEPARATE key from `member`, not a person squeezed into it:
 * `member` keeps its exact former shape and is null on a trainer row, so a
 * column headed "Member" can never end up showing a trainer.
 *
 * @param {{ branch?: string, since?: string,
 *           subjectType?: "MEMBER"|"TRAINER"|"ALL" }} params
 * @returns data: { serverTime, inGymNow, sessions[], staleOpenSessions, subjectType, basis }
 *   sessions[] { _id, subjectType, branch, checkInAt, minutesSoFar,
 *                member { _id, fullName, mobileNumber, photo } | null,
 *                trainer { _id, fullName, mobileNumber } | null }
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

/**
 * The payload for a branch's printed sticker. NOT an image.
 *
 * The server has no QR encoder and is not getting one for a string this short,
 * so this returns the deep link and the copy around it; the panel encodes it
 * (src/utils/qrCode.js). `configured` is the field that matters: it is false
 * when PUBLIC_SITE_ORIGIN is unset, in which case `url` is a RELATIVE path and
 * a QR made from it resolves to nothing on a phone. Say so rather than printing
 * a dead sticker.
 *
 * A branch admin gets 403 for any branch but their own — not because the other
 * branch's link is a secret (it is deliberately guessable; there is no token
 * and nothing to rotate) but because that is how the wrong sticker ends up on
 * the wrong wall and every scan through it is mis-attributed for good.
 *
 * @param {string} branch the Branch master's `name`, not its display name
 * @returns data: { branch, displayName, url, path, configured, instructions, notice }
 */
export const getBranchQr = async (branch) =>
  api.get(ENDPOINTS.ATTENDANCE_STAFF.QR(branch));

export default {
  getFootfall,
  getInGymNow,
  getNotCheckedIn,
  getBranchQr,
};

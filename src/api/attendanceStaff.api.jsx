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
 * The server's own cap on an override note (attendanceOverride.controller.js).
 * Exported so the textarea's `maxLength` is the same number rather than a
 * second copy that drifts and starts silently losing the end of a receipt.
 */
export const DENIAL_NOTE_MAX = 300;

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
 * Denied scans are excluded from every COUNT here. A refused attempt is a real
 * row — the desk needs to see it — but it is not a visit, and a lapsed member
 * tapping the sticker five times must not read as five arrivals.
 *
 * They are not hidden, though: `getInGymNow` returns them as a separate
 * `denials` list built from the opposite filter, so they can be worked through
 * without ever leaking into footfall or into the in-gym count. The attendance
 * CSV export carries them too, with `includeDenied=true`.
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
 * ============================================================================
 * REFUSALS RIDE ALONG IN THE SAME RESPONSE — `denials`, AND THEY COME FIRST.
 * ============================================================================
 * Check-in is unattended, so a refusal cannot stop anybody: the member is told
 * on their own phone that their membership needs attention and is pointed at
 * reception. Until this list existed nobody at the desk knew it had happened.
 * They are the only rows on the screen somebody has to act on, which is why the
 * server puts them at the top of the payload and the screen puts them at the
 * top of the page.
 *
 * They are NOT counted in `inGymNow` and never appear in `sessions` — the two
 * lists are built from opposite filters on the server, so they are disjoint by
 * construction.
 *
 * `deniedToday` vs the length of `denials`: `deniedToday` is every refusal
 * recorded today regardless of any cursor, and is the honest total to put
 * beside the list. `deniedNew` is simply how many rows this particular call
 * returned — which equals `deniedToday` unless `since` was sent. This screen
 * deliberately does NOT send `since` (it would also narrow `sessions` to
 * arrivals after that instant and empty the in-gym list), so the caller works
 * out what is new by diffing against its own previous poll. See
 * AttendanceOverview.jsx.
 *
 * `denialsTruncated` means the server hit its per-poll cap and the list is a
 * partial view of `deniedToday`. Say so on screen rather than showing a short
 * list as though it were the whole queue.
 *
 * @param {{ branch?: string, since?: string,
 *           subjectType?: "MEMBER"|"TRAINER"|"ALL" }} params
 * @returns data: { serverTime, denials[], deniedNew, deniedToday,
 *                  denialsTruncated, inGymNow, sessions[], staleOpenSessions,
 *                  subjectType, basis, denialsBasis }
 *   sessions[] { _id, subjectType, branch, checkInAt, minutesSoFar,
 *                member { _id, fullName, mobileNumber, photo } | null,
 *                trainer { _id, fullName, mobileNumber } | null }
 *   denials[]  { _id, subjectType, branch, deniedReason, deniedAt,
 *                lastAttemptAt, source,
 *                member { _id, fullName, mobileNumber, photo, endDate } | null,
 *                trainer { _id, fullName, mobileNumber } | null }
 *   `deniedAt` is the FIRST refusal of the day and `lastAttemptAt` the most
 *   recent, because a repeat refusal updates today's row in place instead of
 *   writing a second one. There is deliberately no `minutesSoFar`: a refusal is
 *   not a session and nothing is elapsing.
 */
export const getInGymNow = async (params = {}) =>
  api.get(`${ENDPOINTS.ATTENDANCE_STAFF.LIVE}${qs(params)}`);

/**
 * Clear one refusal — "mark as allowed". THE ONLY WRITE IN THIS MODULE.
 *
 * ============================================================================
 * WHAT THIS IS AND IS NOT.
 * ============================================================================
 * It is not staff checking somebody in, and it is not letting somebody through
 * a door — there is no door. The member checked themselves in, was told their
 * membership had lapsed, and has since settled it at reception. This closes off
 * a flag that has stopped being true, and the row stops being a refusal.
 *
 * ============================================================================
 * READ `sessionOpened` — DO NOT INFER IT FROM THE DATE.
 * ============================================================================
 * A refusal from TODAY becomes a live session: the member is standing at the
 * desk, so the row is re-stamped and they appear in the in-gym list. An OLDER
 * refusal only has the refusal cleared — its original day, arrival time and
 * closed session are all left alone, because opening a session dated last
 * Tuesday would claim somebody is on the floor because a clerk tidied up.
 *
 * The response says which happened in `sessionOpened`, and spells out the
 * consequence in plain English in `effect` and in the envelope's `message`.
 * Render those strings; a screen that composes its own wording is one refactor
 * away from telling the desk a member is in the gym when they are not.
 *
 * ============================================================================
 * `alreadyOverridden: true` IS A SUCCESS, NOT AN ERROR.
 * ============================================================================
 * Two people at the desk pressing the same button, or one double-click, is the
 * expected case and not a mistake. The second call finds nothing left to do,
 * writes nothing (so no second audit row and no double-counted visit) and
 * answers 200 with the same shape plus this flag. Treat it calmly.
 *
 * Needs `edit` on /attendance-overview. Everything else on that screen needs
 * only `read`, so the button has to be gated separately from the page.
 *
 * @param {string} id the denied Attendance row's `_id`, from `denials[]`
 * @param {{ note?: string, subjectType?: "MEMBER"|"TRAINER"|"ALL" }} params
 *   `note` is an optional memo for reception ("paid at desk, receipt 1042"),
 *   capped at 300 characters by the server. `subjectType` must be the same
 *   value that produced the row: this collection defaults every query to
 *   MEMBER, so a trainer's refused shift has to be asked for by name or the
 *   lookup 404s.
 * @returns data: { _id, subjectType, branch, date, checkInAt, checkOutAt,
 *                  deniedReason, denialOverride, sessionOpened,
 *                  alreadyOverridden, effect? }
 *   `effect` is absent on the already-overridden path — there was no new
 *   effect to describe.
 */
export const markAttendanceAllowed = async (id, params = {}) =>
  api.post(
    `${ENDPOINTS.ATTENDANCE_STAFF.MARK_ALLOWED(id)}${qs({
      subjectType: params.subjectType,
    })}`,
    // Trimmed and capped here too, so a paste of half a WhatsApp message is
    // rejected by the textarea rather than silently truncated by the server.
    { note: String(params.note || "").trim().slice(0, DENIAL_NOTE_MAX) },
  );

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
  markAttendanceAllowed,
};

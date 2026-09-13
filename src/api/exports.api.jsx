/**
 * CSV export API service.
 *
 * ============================================================================
 * THESE ROUTES CHECK `print`, NOT `read`.
 * ============================================================================
 * They sit behind the /reports menu row, but a file that leaves the building is
 * a separate decision from being allowed to look at the numbers on screen, so
 * the server gates them on the print flag. Any button that reaches these must
 * be gated the same way (plus `isAdmin`, which short-circuits permission checks
 * on both sides) or staff see a button that 403s.
 *
 * ============================================================================
 * WHY THESE ASK FOR `format=json` AND NOT THE RAW CSV STREAM
 * ============================================================================
 * The endpoints default to a streamed CSV attachment, which a browser would
 * have to fetch by navigating to the URL. That navigation is cross-origin in
 * dev (panel on :5173, API on :7002) and carries no session cookie, so it
 * answers 401 and downloads an error page named like a spreadsheet.
 *
 * `?format=json` exists for precisely this caller: it returns a capped,
 * already-column-labelled array over the normal axios instance (cookies and
 * all), which Components/Common/ExportCSVModal turns into a file client-side.
 * The cap is the server's MAX_JSON_ROWS (5000) because that path is held in
 * memory rather than streamed — `meta.truncated` says when it bit, and the
 * modal must surface that rather than hand over a silently short file.
 *
 * Branch scoping is applied server-side from the session and spread LAST, so a
 * branch admin's `branch` argument narrows nothing and widens nothing. "Common"
 * rows can only ever appear in a super admin's transactions export.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

const qs = (params) => {
  const query = new URLSearchParams({ format: "json" });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  return `?${query.toString()}`;
};

/**
 * The cash ledger.
 *
 * @param {{ fromDate?: string, toDate?: string, direction?: "IN"|"OUT", branch?: string }} params
 * @returns data: Array<{ Date, Direction, Amount, Mode, Branch, "Receipt No",
 *   Member, Mobile, Plan, Category, "Paid To", "Bill No", Source, Note }>
 *   meta: { rowCount, truncated, maxRows }
 */
export const exportTransactions = async (params = {}) =>
  api.get(`${ENDPOINTS.EXPORTS.TRANSACTIONS}${qs(params)}`);

/**
 * The member roster.
 *
 * Deliberately omits portal credentials, ID proofs and payments — an export is
 * the widest-travelling copy of this data. Money comes from the transactions
 * export instead, never from a per-member paid column.
 *
 * @param {{ branch?: string, isActive?: boolean|string }} params
 * @returns data: Array<{ Name, Mobile, Email, Gender, Branch, Plan,
 *   "Start Date", "End Date", "Fee For Period", Active, Joined }>
 */
export const exportMembers = async (params = {}) =>
  api.get(`${ENDPOINTS.EXPORTS.MEMBERS}${qs(params)}`);

/**
 * Logged check-ins — sessions recorded, not verified visits. Defaults to the
 * last 30 days server-side when no range is given.
 *
 * TWO PHASE 3 SWITCHES, BOTH OFF BY DEFAULT, BOTH DELIBERATE:
 *
 * `subjectType` — trainer shifts share this collection behind a discriminator.
 * The server defaults to MEMBER and treats anything it does not recognise as
 * MEMBER, so "TRAINER" and "ALL" must be asked for by name. Without that, a
 * file labelled "member check-ins" quietly contains trainer shifts.
 *
 * `includeDenied` — a refused scan is a real row (a lapsed member tapped the
 * sticker; the desk needs to know) but it is NOT a visit, so it is excluded
 * from every count and from this file unless asked for. Ask for it when the
 * question is "who was turned away", never when the question is "how busy were
 * we": adding refusals to a footfall file inflates it with arrivals that did
 * not happen.
 *
 * Nothing here refuses entry. Nobody is at the door — a DENY tells the member
 * why and leaves a row for staff to follow up.
 *
 * @param {{ fromDate?: string, toDate?: string, branch?: string,
 *           subjectType?: "MEMBER"|"TRAINER"|"ALL",
 *           includeDenied?: boolean|"true" }} params
 * @returns data: Array<{ Date, Branch, Type, Member, Mobile, "Checked In At",
 *   "Checked Out At", Minutes, "Auto Closed", Source, "Denied Reason" }>
 */
export const exportAttendance = async (params = {}) =>
  api.get(`${ENDPOINTS.EXPORTS.ATTENDANCE}${qs(params)}`);

export default {
  exportTransactions,
  exportMembers,
  exportAttendance,
};

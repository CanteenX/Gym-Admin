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
 * Logged check-ins — sessions members recorded, not verified visits. Defaults
 * to the last 30 days server-side when no range is given.
 *
 * @param {{ fromDate?: string, toDate?: string, branch?: string }} params
 * @returns data: Array<{ Date, Branch, Member, Mobile, "Checked In At",
 *   "Checked Out At", Minutes, "Auto Closed" }>
 */
export const exportAttendance = async (params = {}) =>
  api.get(`${ENDPOINTS.EXPORTS.ATTENDANCE}${qs(params)}`);

export default {
  exportTransactions,
  exportMembers,
  exportAttendance,
};

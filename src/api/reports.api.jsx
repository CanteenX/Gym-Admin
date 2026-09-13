/**
 * Reporting API service. Read-only.
 *
 * ============================================================================
 * EVERY FIGURE BEHIND THESE COMES FROM THE `Transaction` LEDGER.
 * ============================================================================
 * Never recompute any of it client-side from a member record. `Member.payments`
 * is the CURRENT PERIOD balance and is cleared on renewal, so a total summed
 * from it silently drops every rupee collected before each member's last
 * renewal — no error, no log, just a plausible wrong number.
 *
 * ============================================================================
 * "Common" IS NOT A BRANCH.
 * ============================================================================
 * The P&L response is three separate keys on purpose:
 *
 *   branches[]   one row per physical gym. NEVER includes Common.
 *   common       shared overhead (rent, software, the accountant, the owner's
 *                salary) held outside any branch — or `null` for a branch
 *                admin, who is not allowed to see it.
 *   consolidated branches + common, and therefore super-admin only. `null` for
 *                a branch admin, because "branch income minus branch expenses"
 *                is not the business's profit and must not be labelled as if it
 *                were.
 *
 * A screen must never add `common` into a branch's figures, and must never
 * render an all-zero Common card when it comes back null — that would imply
 * those costs are nil rather than not visible.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

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
 * Money IN by month and branch.
 *
 * @param {{ months?: number, branch?: string }} params
 * @returns data: { months, from, branches[], series[], byBranch[], total, source }
 *   series[]  { key, label, total, receipts, renewals, joinings, byBranch{} }
 *             — dense, so a month with no collections is a zero rather than a
 *               gap the line silently skips.
 *   byBranch[] { branch, total, receipts }
 */
export const getCollectionsReport = async (params = {}) =>
  api.get(`${ENDPOINTS.REPORTS.COLLECTIONS}${qs(params)}`);

/**
 * Income, expenses and net — per branch, with shared overhead kept separate.
 *
 * @param {{ fromDate?: string, toDate?: string, branch?: string }} params
 * @returns data: { from, to, branches[], common, consolidated, source }
 *   branches[]   { branch, income, expense, net, expenseByCategory[] }
 *   common       { branch: "Common", income, expense, net, expenseByCategory[], note } | null
 *   consolidated { income, expense, net } | null
 */
export const getProfitAndLoss = async (params = {}) =>
  api.get(`${ENDPOINTS.REPORTS.PROFIT_LOSS}${qs(params)}`);

/**
 * Active memberships bucketed by how near their end date is.
 *
 * @param {{ branch?: string, perBucket?: number }} params
 * @returns data: { asOf, total, truncated, buckets[], byBranch[] }
 *   buckets[]  { key, label, count, members[] } — `members` is a short sample
 *              capped at `perBucket`, so `count` is the real figure.
 *   byBranch[] { branch, expired, d0_7, d8_15, d16_30, d31_60, d60_plus }
 */
export const getExpiryPipeline = async (params = {}) =>
  api.get(`${ENDPOINTS.REPORTS.EXPIRY_PIPELINE}${qs(params)}`);

/**
 * Tenure cohorts plus outstanding-dues ageing.
 *
 * Dues are `Member.totalFee` minus ledger receipts since the member's
 * startDate — see the file header for why they are not summed from
 * `Member.payments[]`.
 *
 * @param {{ branch?: string }} params
 * @returns data: { asOf, totalMembers, truncated, tenure[], receivables[],
 *                  totalOutstanding, byBranch[], topDebtors[], source }
 *   tenure[]      { key, label, count, amount }  (amount is 0 — tenure is a head count)
 *   receivables[] { key, label, count, amount }
 *   byBranch[]    { branch, members, outstanding }
 *   topDebtors[]  { _id, fullName, mobileNumber, branch, planCode, startDate,
 *                   endDate, totalFee, paid, balance, ageDays }
 */
export const getMemberAgeing = async (params = {}) =>
  api.get(`${ENDPOINTS.REPORTS.MEMBER_AGEING}${qs(params)}`);

export default {
  getCollectionsReport,
  getProfitAndLoss,
  getExpiryPipeline,
  getMemberAgeing,
};

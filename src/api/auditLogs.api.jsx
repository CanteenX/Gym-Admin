/**
 * Audit trail API service. READ-ONLY, and deliberately so.
 *
 * There is no create, update or delete endpoint on the server side either — a
 * trail an operator can edit is not a trail. Rows are written only by the
 * mongoose plugin in services/auditLog.js.
 *
 * BRANCH SCOPING, AND THE ONE CONSEQUENCE WORTH KNOWING
 * `AuditLog.branch` is the branch of the CHANGED DOCUMENT, falling back to the
 * actor's branch. Rows with `branch: null` — changes to business-wide masters
 * (menus, plans, branches, website copy) — are visible to a SUPER ADMIN ONLY.
 * So a branch admin's list is genuinely narrower than the owner's, and the
 * filter lists returned by FILTERS are narrowed the same way rather than
 * advertising collections they cannot read.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * House `…-by-params` list convention. The response does NOT use the $facet
 * envelope the other list screens use — `data` is a plain array and the total
 * sits beside it as `total` / `count` — so callers read `res.data.total`, not
 * `unwrapList`.
 *
 * @param {{ skip?: number, per_page?: number, sorton?: string, sortdir?: string,
 *           match?: string, action?: string, collectionName?: string,
 *           documentId?: string, actorId?: string, fromDate?: string,
 *           toDate?: string, branch?: string }} params
 *   per_page is capped at 200 server-side: rows carry before/after payloads, so
 *   a large page is a multi-megabyte response rather than merely a slow one.
 *   `sorton` is allowlisted to createdAt | action | collectionName | branch |
 *   actor.name; anything else falls back to createdAt.
 * @returns res.data: { isOk, data: AuditLogRow[], total, count }
 */
export const searchAuditLogs = async (params) =>
  api.post(ENDPOINTS.AUDIT_LOGS.SEARCH, params);

/**
 * The distinct values the viewer's dropdowns need, scoped to this session.
 *
 * @returns data: { collections: string[], actions: string[],
 *                  actors: Array<{ id, name, email, changes }> }
 */
export const getAuditLogFilters = async () =>
  api.get(ENDPOINTS.AUDIT_LOGS.FILTERS);

/**
 * One row with its full before/after.
 *
 * Scoped the same way as the list, so an id from another branch answers 404
 * rather than the row — an id is not an authorisation.
 *
 * @returns data: { _id, actor { id, name, email, role, branch, isSuperAdmin },
 *   action, collectionName, documentId, documentLabel, before, after,
 *   changedFields[], branch, ip, userAgent, method, path, truncated, createdAt }
 */
export const getAuditLogById = async (id) =>
  api.get(ENDPOINTS.AUDIT_LOGS.BY_ID(id));

export default {
  searchAuditLogs,
  getAuditLogFilters,
  getAuditLogById,
};

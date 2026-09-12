/**
 * Site Leads API Service
 *
 * Enquiries captured by the public site's contact form. Staff only ever
 * triage them here - creation is the public POST /site/leads, which this panel
 * deliberately never calls.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchSiteLeads = async (params) => {
    return api.post(ENDPOINTS.SITE_LEADS.SEARCH, params);
};

/**
 * Triage a lead. All three fields are optional and independent, so the same
 * endpoint covers "mark contacted", "assign to Riya" and "add a note" without
 * a round trip per action.
 *
 * @param {string} id
 * @param {{ status?: string, assignedTo?: string|null, note?: string }} data
 *   `note` is appended to notes[]; it never replaces the existing ones.
 */
export const updateSiteLead = async (id, data) => {
    return api.put(ENDPOINTS.SITE_LEADS.BY_ID(id), data);
};

export default {
    searchSiteLeads,
    updateSiteLead,
};

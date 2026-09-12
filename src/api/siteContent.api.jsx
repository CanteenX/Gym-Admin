/**
 * Site Content API Service
 *
 * The marketing site's editable copy: one row per (pageKey, sectionKey) pair,
 * e.g. ("home", "hero"). The public site reads these under ISR, so a save here
 * is live within seconds without a rebuild.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/** Paged list. Params follow the house style: skip, per_page, match, sorton, sortdir. */
export const searchSiteContent = async (params) => {
    return api.post(ENDPOINTS.SITE_CONTENT.SEARCH, params);
};

export const createSiteContent = async (data) => {
    return api.post(ENDPOINTS.SITE_CONTENT.BASE, data);
};

export const updateSiteContent = async (id, data) => {
    return api.put(ENDPOINTS.SITE_CONTENT.BY_ID(id), data);
};

export const deleteSiteContent = async (id) => {
    return api.delete(ENDPOINTS.SITE_CONTENT.BY_ID(id));
};

export default {
    searchSiteContent,
    createSiteContent,
    updateSiteContent,
    deleteSiteContent,
};

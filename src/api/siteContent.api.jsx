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

/**
 * Replaces a block's image, and returns the saved row.
 *
 * ADDITIVE: `imageUrl` is still a plain string that can be typed in by hand, so
 * a row pointing at an external CDN keeps working untouched. This is the option
 * for staff who have a file rather than a link.
 *
 * The row must already exist — the endpoint is keyed by `:id` — so a NEW section
 * is created first and the file uploaded against the id that comes back.
 *
 * The server stores whatever its storage backend returns and answers with the
 * updated document, so the caller should take `imageUrl` from the response (or
 * refetch) rather than guessing the path. On the Supabase backend that value is
 * an absolute https url; fileUrl() passes it through untouched.
 *
 * @param {string} id - the row's _id
 * @param {File} file - the image; the field name `image` is fixed by the route's
 *   multer instance, so any other name silently drops the file
 */
export const uploadSiteContentImage = async (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(ENDPOINTS.SITE_CONTENT.IMAGE(id), fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export default {
    searchSiteContent,
    createSiteContent,
    updateSiteContent,
    deleteSiteContent,
    uploadSiteContentImage,
};

/**
 * Page-wise SEO API service.
 *
 * One SeoMeta row per real route of the public site ("/", "/programs",
 * "/contact", plus the portal routes). The Next.js app reads these in
 * generateMetadata() under ISR, so a save here changes the <title>,
 * <meta name="description"> and the OG tags the crawler sees - which is why
 * every write on the server side also revalidates the row's own path.
 *
 * Never call axios from a page: the shared instance in ./index carries
 * withCredentials (the staff session cookie) and the 401 redirect.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/** Paged list. Params follow the house style: skip, per_page, match, sorton, sortdir. */
export const searchSeoMeta = async (params) => {
    return api.post(ENDPOINTS.SITE_SEO.SEARCH, params);
};

export const createSeoMeta = async (data) => {
    return api.post(ENDPOINTS.SITE_SEO.BASE, data);
};

export const updateSeoMeta = async (id, data) => {
    return api.put(ENDPOINTS.SITE_SEO.BY_ID(id), data);
};

export const deleteSeoMeta = async (id) => {
    return api.delete(ENDPOINTS.SITE_SEO.BY_ID(id));
};

export default {
    searchSeoMeta,
    createSeoMeta,
    updateSeoMeta,
    deleteSeoMeta,
};

/**
 * Site Adverts API Service
 *
 * Create and update are multipart because the banner image goes through the
 * server's secureUpload middleware (magic-byte verified, stored as WebP). The
 * `image` field name is fixed by the route's multer `fields()` call - sending
 * it under any other name means the file is dropped and the advert saves with
 * no image.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

export const searchSiteAds = async (params) => {
    return api.post(ENDPOINTS.SITE_ADS.SEARCH, params);
};

/**
 * @param {FormData} data - advert fields plus the required `image` file
 */
export const createSiteAd = async (data) => {
    return api.post(ENDPOINTS.SITE_ADS.BASE, data, MULTIPART);
};

/**
 * @param {FormData} data - advert fields; `image` optional, omit to keep the current one
 */
export const updateSiteAd = async (id, data) => {
    return api.put(ENDPOINTS.SITE_ADS.BY_ID(id), data, MULTIPART);
};

export const deleteSiteAd = async (id) => {
    return api.delete(ENDPOINTS.SITE_ADS.BY_ID(id));
};

export default {
    searchSiteAds,
    createSiteAd,
    updateSiteAd,
    deleteSiteAd,
};

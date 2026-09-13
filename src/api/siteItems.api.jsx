/**
 * Site Items API Service
 *
 * The repeating lists the marketing site renders: programme cards, pricing
 * plans, FAQs, trainers, the class timetable, testimonials and transformations.
 * One row per card, keyed by `collectionKey` and ordered by `sortOrder`.
 *
 * JSON, NOT multipart, for create and update — unlike siteAds.api. The row
 * carries a nested `fields` object (a plan's price and features, a class's day
 * and time) and a multipart form cannot express one; the server does accept a
 * JSON *string* in that case, but sending real JSON keeps the types intact
 * (a rating stays a number, `features` stays an array) instead of flattening
 * everything to strings at the boundary. The photo therefore travels on its own
 * multipart endpoint below.
 *
 * Never call axios from a page: the shared instance in ./index carries
 * withCredentials (the staff session cookie) and the 401 redirect.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Paged list. Params follow the house style: skip, per_page, match, sorton,
 * sortdir, plus an optional `collectionKey`.
 *
 * The response carries `collections` and `fieldSpecs` ALONGSIDE the usual
 * envelope. Read them rather than hardcoding the per-collection extras in the
 * editor — that is the whole reason the server ships them, and it is what stops
 * the form drifting from what the API will accept.
 */
export const searchSiteItems = async (params) => {
    return api.post(ENDPOINTS.SITE_ITEMS.SEARCH, params);
};

export const createSiteItem = async (data) => {
    return api.post(ENDPOINTS.SITE_ITEMS.BASE, data);
};

export const updateSiteItem = async (id, data) => {
    return api.put(ENDPOINTS.SITE_ITEMS.BY_ID(id), data);
};

export const deleteSiteItem = async (id) => {
    return api.delete(ENDPOINTS.SITE_ITEMS.BY_ID(id));
};

/**
 * Replaces a row's photo. The row must already exist, so a new row is saved
 * first and its photo uploaded against the id that comes back.
 *
 * @param {string} id - the row's _id
 * @param {File} file - the image; the field name `image` is fixed by the
 *   route's multer instance, so any other name silently drops the file
 * @param {string} [slot] - a declared `image` field of the collection
 *   ("beforeImage" / "afterImage"). Omit to set the row's main `imageUrl`.
 */
export const uploadSiteItemImage = async (id, file, slot = "") => {
    const fd = new FormData();
    fd.append("image", file);
    // Sent in the BODY as well as the query string: the server reads either,
    // and a body field survives any proxy that rewrites query strings.
    if (slot) fd.append("slot", slot);
    return api.post(ENDPOINTS.SITE_ITEMS.IMAGE(id), fd, {
        headers: { "Content-Type": "multipart/form-data" },
        params: slot ? { slot } : {},
    });
};

export default {
    searchSiteItems,
    createSiteItem,
    updateSiteItem,
    deleteSiteItem,
    uploadSiteItemImage,
};

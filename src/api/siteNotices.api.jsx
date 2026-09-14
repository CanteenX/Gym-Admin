/**
 * Site Notices API Service — announcements and banners.
 *
 * ONE MODULE FOR BOTH KINDS because there is one collection and one set of
 * endpoints behind them; `kind` is a field, not a route. The two ADMIN SCREENS
 * are still separate (/cms/announcements, /cms/banners) because they are
 * separate permissions on the server: posting "the gym is shut on Thursday" and
 * publishing a 20%-off campaign are different jobs with different blast radii.
 *
 * TWO THINGS HERE DIFFER FROM siteAds.api.jsx AND BOTH ARE DELIBERATE SERVER
 * DECISIONS, not oversights to be "fixed" by copying the adverts screen:
 *
 * 1. CREATE AND UPDATE ARE JSON, NOT MULTIPART. The server resolves which CMS
 *    permission a write is checked against by reading `kind` out of the body.
 *    On a multipart request the body is still unparsed at that moment — the
 *    uploader runs after the permission check, so an unauthenticated request is
 *    rejected before multer writes anything to disk — so `kind` would read as
 *    empty and the write could only ever be authorised against the all-pages
 *    grant. Sending JSON is what keeps the narrow per-screen grants meaningful.
 *
 * 2. THE IMAGE IS A SECOND CALL, against `:id`. By then the row exists, so the
 *    server can read its stored kind back and refuse the upload on an
 *    announcement (400) — an announcement renders as text and has no image
 *    slot, so accepting the file would take the editor's upload and show them
 *    nothing.
 *
 * The multer field name is pinned to `image` by the route. Sending it under any
 * other name means the file is silently dropped and the banner saves with no
 * creative.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

/**
 * The paged admin list. Rows come back carrying a derived `isLive` and a
 * `status` (LIVE / SCHEDULED / EXPIRED / INACTIVE) computed by the server from
 * the SAME expression the public endpoint filters on — so the badge the panel
 * draws cannot disagree with what the website is actually serving.
 *
 * ALWAYS PASS `kind`, and pass it TOP-LEVEL rather than inside `match`. The
 * permission middleware reads the top-level field first and authorises the
 * request against that screen's menu; omitting it resolves to the all-pages
 * grant and would hand a banners-only editor every announcement in the list.
 * `match` is reserved for the free-text search string.
 *
 * @param {{skip:number, per_page:number, sorton:string, sortdir:string,
 *          match?:string, kind:"ANNOUNCEMENT"|"BANNER",
 *          placement?:string, isActive?:boolean|string}} params
 */
export const searchSiteNotices = async (params) => {
    return api.post(ENDPOINTS.SITE_NOTICES.SEARCH, params);
};

/**
 * @param {object} data JSON body — `kind` and `title` are required, `body` is
 *   required for an ANNOUNCEMENT and `placement` for a BANNER.
 */
export const createSiteNotice = async (data) => {
    return api.post(ENDPOINTS.SITE_NOTICES.BASE, data);
};

/**
 * Every field optional; an absent field is left untouched. An empty string IS
 * meaningful for the text fields an editor can deliberately clear (ctaUrl,
 * ctaLabel, imageUrl) and for the two dates, where "" means open-ended.
 *
 * @param {object} data JSON body
 */
export const updateSiteNotice = async (id, data) => {
    return api.put(ENDPOINTS.SITE_NOTICES.BY_ID(id), data);
};

/**
 * Attach a creative to an existing BANNER. Refused with a 400 on an
 * announcement — see the header note.
 *
 * @param {FormData} data must carry the file under the field name `image`
 */
export const uploadSiteNoticeImage = async (id, data) => {
    return api.post(ENDPOINTS.SITE_NOTICES.IMAGE(id), data, MULTIPART);
};

export const deleteSiteNotice = async (id) => {
    return api.delete(ENDPOINTS.SITE_NOTICES.BY_ID(id));
};

export default {
    searchSiteNotices,
    createSiteNotice,
    updateSiteNotice,
    uploadSiteNoticeImage,
    deleteSiteNotice,
};

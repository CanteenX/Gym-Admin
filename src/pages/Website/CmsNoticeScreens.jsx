/**
 * The two `/cms/*` notice routes.
 *
 * A SEPARATE FILE FROM CmsScreens.jsx on purpose. Everything in there is a thin
 * wrapper around WebsitePages - a locked pageKey or collectionKey handed to the
 * generic SiteContent/SiteItem editor. These two are not that: SiteNotice is
 * its own collection with its own endpoints, its own kind-conditional fields
 * and, above all, its own scheduling UI, so they get a real screen.
 *
 * THE PATHS BELOW MUST STAY BYTE-IDENTICAL to CMS_NOTICE_MENUS and
 * CMS_MENU_TREE in Gym-Server/config/cmsMenus.js:
 *
 *     CMS_NOTICE_MENUS.ANNOUNCEMENT === "/cms/announcements"
 *     CMS_NOTICE_MENUS.BANNER       === "/cms/banners"
 *
 * That string is the join key on BOTH sides - PermissionProtected resolves the
 * MenuMaster row by URL on the client, and cmsPermission resolves the same row
 * by URL on the server. A mismatch does not error: the menu simply fails to
 * resolve, the route is denied for every non-super-admin, and the sidebar keeps
 * showing an entry that leads nowhere.
 *
 * TWO ROUTES RATHER THAN ONE SCREEN WITH A TAB because the server grants them
 * separately, and the separation is the point: posting "the gym is shut on
 * Thursday" is desk work, publishing a 20%-off campaign changes what the gym
 * charges. A shared row would make anyone who can do the first able to do the
 * second. Query-string tabs could not work either - MenuContext strips `?` from
 * the browser path but not from `menu.url`.
 */
import SiteNoticesScreen from "./notices/SiteNoticesScreen";

/** Route: /cms/announcements */
export const CmsAnnouncements = () => <SiteNoticesScreen kind="ANNOUNCEMENT" />;

/** Route: /cms/banners */
export const CmsBanners = () => <SiteNoticesScreen kind="BANNER" />;

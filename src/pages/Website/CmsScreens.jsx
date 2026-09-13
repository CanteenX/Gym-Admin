/**
 * Thin `/cms/*` route wrappers.
 *
 * MenuMaster rows (Gym-Server/config/cmsMenus.js) and these paths must stay
 * byte-identical — PermissionProtected and cmsPermission both join on URL.
 * Query-string tabs cannot work: MenuContext strips `?` from the browser path
 * but not from `menu.url`.
 */
import WebsitePages from "./WebsitePages";

const sections = (pageKey) => (
  <WebsitePages lockedPageKey={pageKey} modes="sections" />
);

const items = (collectionKey) => (
  <WebsitePages lockedCollectionKey={collectionKey} modes="items" />
);

const both = (pageKey, collectionKey) => (
  <WebsitePages
    lockedPageKey={pageKey}
    lockedCollectionKey={collectionKey}
    modes="both"
  />
);

export const CmsHome = () => sections("home");
export const CmsAbout = () => sections("about");
export const CmsContact = () => sections("contact");
export const CmsHeader = () => sections("header");
export const CmsFooter = () => sections("footer");
export const CmsSocial = () => sections("social");

export const CmsPrograms = () => both("programs", "programs");
export const CmsFaqs = () => both("faqs", "faqs");

export const CmsPricing = () => items("plans");
export const CmsTrainers = () => items("trainers");
export const CmsTestimonials = () => items("testimonials");
export const CmsClasses = () => items("classes");
// The before/after gallery. Added after the original twelve routes — until it
// had a screen it fell back to the /website-pages all-pages grant, so editing
// it meant holding permission on every other CMS page too.
export const CmsTransformations = () => items("transformations");

// ---- SITE CHROME ----
// The five lists and the one form that were still hardcoded in
// Gym-frontend/src/lib/site.ts until the server gained CMS rows for them.
// Every path below is byte-identical to CMS_COLLECTION_MENUS / CMS_PAGE_MENUS
// in Gym-Server/config/cmsMenus.js — see allRoutes.jsx for what a mismatch
// costs. These five are identity mappings (collectionKey === the last path
// segment) even where the sidebar LABEL differs ("Navigation" for navlinks,
// "Branch Cards" for branches, "Background Media" for media): a menuName may
// differ from its URL, a URL may not differ from the admin route.
export const CmsStats = () => items("stats");
export const CmsMarquee = () => items("marquee");
export const CmsNavlinks = () => items("navlinks");
// The two branch CARDS on the public site (phone, hours, blurb, map link), NOT
// the operational Branch Master at /branch-master whose `name` is the tenancy
// key stored on every member, trainer and transaction.
export const CmsBranches = () => items("branches");
export const CmsMedia = () => items("media");

// A form, not a list: the brand facts (name, tagline, bio, city, region,
// country) the JSON-LD publishes, stored as SiteContent rows under pageKey
// "site".
export const CmsSite = () => sections("site");

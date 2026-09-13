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

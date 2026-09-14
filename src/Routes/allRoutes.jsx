// Every page is code-split. Eager imports meant the whole admin bundle -
// including the rich-text editor and charting library used by a handful of
// pages - had to download and parse before the LOGIN FORM could paint.
import { lazy } from "react";
import { Navigate } from "react-router-dom";
const Login = lazy(() => import("../pages/Authentication/Login"));
const UserProfile = lazy(() => import("../pages/Authentication/user-profile"));
const CompanyDetails = lazy(() => import("../pages/Setup/CompanyDetails"));
const Department = lazy(() => import("../pages/Setup/Department"));
const Employee = lazy(() => import("../pages/Setup/Employee"));
const Country = lazy(() => import("../pages/Master/Country"));
const State = lazy(() => import("../pages/Master/State"));
const City = lazy(() => import("../pages/Master/City"));
const EmailSetup = lazy(() => import("../pages/CMS/EmailSetup"));
const EmailFor = lazy(() => import("../pages/CMS/EmailFor"));
const EmailTo = lazy(() => import("../pages/CMS/EmailTo"));
const EmailTemplate = lazy(() => import("../pages/CMS/EmailTemplate"));
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard"));
const MenuGroup = lazy(() => import("../pages/Master/MenuGroup"));
const MenuMaster = lazy(() => import("../pages/Master/MenuMaster"));
const EmployeeRoles = lazy(() => import("../pages/Setup/EmployeeRoles"));
const RoleMaster = lazy(() => import("../pages/Master/RoleMaster"));
const CurrencyMaster = lazy(() => import("../pages/Master/CurrencyMaster"));
const LoginAttemptLogs = lazy(() => import("../pages/Master/LoginAttemptLogs"));
const BlogCategory = lazy(() => import("../pages/CMS/BlogCategory"));
const BlogTag = lazy(() => import("../pages/CMS/BlogTag"));
const BlogMaster = lazy(() => import("../pages/CMS/BlogMaster"));
const FaqCategory = lazy(() => import("../pages/Setup/FaqCategory"));
const Faq = lazy(() => import("../pages/Setup/Faq"));
const GuidesGallery = lazy(() => import("../pages/HelpGuides/GuidesGallery"));
const ManageGuides = lazy(() => import("../pages/HelpGuides/ManageGuides"));
const Members = lazy(() => import("../pages/Members/Members"));
const Trainers = lazy(() => import("../pages/Trainers/Trainers"));
const CashFlow = lazy(() => import("../pages/Accounts/CashFlow"));
const ExpenseCategories = lazy(() => import("../pages/Accounts/ExpenseCategories"));
const MembershipPlans = lazy(() => import("../pages/Master/MembershipPlans"));
const BranchMaster = lazy(() => import("../pages/Master/BranchMaster"));
const MemberExercisePlan = lazy(() => import("../pages/Master/MemberExercisePlan"));
const ClassSessions = lazy(() => import("../pages/Classes/ClassSessions"));
const WebsitePages = lazy(() => import("../pages/Website/WebsitePages"));
const WebsiteAdverts = lazy(() => import("../pages/Website/WebsiteAdverts"));
const WebsiteLeads = lazy(() => import("../pages/Website/WebsiteLeads"));
const SeoManager = lazy(() => import("../pages/Website/SeoManager"));
// Per-page CMS routes. Paths must stay byte-identical to cmsMenus.js.
const CmsHome = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsHome })),
);
const CmsAbout = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsAbout })),
);
const CmsContact = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsContact })),
);
const CmsPrograms = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsPrograms })),
);
const CmsPricing = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsPricing })),
);
const CmsFaqs = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsFaqs })),
);
const CmsTrainers = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsTrainers })),
);
const CmsTestimonials = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({
    default: m.CmsTestimonials,
  })),
);
const CmsClasses = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsClasses })),
);
const CmsTransformations = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({
    default: m.CmsTransformations,
  })),
);
const CmsHeader = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsHeader })),
);
const CmsFooter = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsFooter })),
);
const CmsSocial = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsSocial })),
);
// ---- SITE CHROME ----
// Five SiteItem lists and one SiteContent form, seeded by
// Gym-Server/scripts/seedCmsMenus.js. Same byte-identical rule as every /cms/*
// path above.
const CmsStats = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsStats })),
);
const CmsMarquee = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsMarquee })),
);
const CmsNavlinks = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({
    default: m.CmsNavlinks,
  })),
);
const CmsBranches = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({
    default: m.CmsBranches,
  })),
);
const CmsMedia = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsMedia })),
);
const CmsSite = lazy(() =>
  import("../pages/Website/CmsScreens").then((m) => ({ default: m.CmsSite })),
);
// Announcements and banners. A DIFFERENT MODULE from CmsScreens because these
// two are not thin WebsitePages wrappers — SiteNotice is its own collection
// with its own endpoints and its own scheduling UI, so they are real screens.
const CmsAnnouncements = lazy(() =>
  import("../pages/Website/CmsNoticeScreens").then((m) => ({
    default: m.CmsAnnouncements,
  })),
);
const CmsBanners = lazy(() =>
  import("../pages/Website/CmsNoticeScreens").then((m) => ({
    default: m.CmsBanners,
  })),
);
// Insights. These three menuUrls are seeded by Gym-Server/scripts/seedInsightsMenus.js
// and must stay character-identical to the paths below: checkPermission (server)
// and PermissionProtected (client) both join on menuUrl, so a mismatch 403s a
// screen that still appears in the sidebar.
const AttendanceOverview = lazy(() => import("../pages/Insights/AttendanceOverview"));
const Reports = lazy(() => import("../pages/Insights/Reports"));
const AuditLog = lazy(() => import("../pages/Insights/AuditLog"));


const authProtectedRoutes = [
    { path: "/profile", component: <UserProfile /> },
    { path: "/company-details", component: <CompanyDetails /> },
    { path: "/department", component: <Department /> },
    { path: "/employee", component: <Employee /> },
    { path: "/employee-roles", component: <EmployeeRoles /> },
    { path: "/country", component: <Country /> },
    { path: "/state", component: <State /> },
    { path: "/city", component: <City /> },
    { path: "/email-setup", component: <EmailSetup /> },
    { path: "/email-for", component: <EmailFor /> },
    { path: "/email-to", component: <EmailTo /> },
    { path: "/email-template", component: <EmailTemplate /> },
    { path: "/blog-category", component: <BlogCategory /> },
    { path: "/blog-tag", component: <BlogTag /> },
    { path: "/blog-master", component: <BlogMaster /> },
    { path: "/faq-category", component: <FaqCategory /> },
    { path: "/faq", component: <Faq /> },
    { path: "/guides-gallery", component: <GuidesGallery /> },
    { path: "/manage-guides", component: <ManageGuides /> },
    { path: "/members", component: <Members /> },
    { path: "/trainers", component: <Trainers /> },
    { path: "/cash-flow", component: <CashFlow /> },
    { path: "/expense-categories", component: <ExpenseCategories /> },
    { path: "/membership-plans", component: <MembershipPlans /> },
    { path: "/branch-master", component: <BranchMaster /> },
    { path: "/member-exercise-plan", component: <MemberExercisePlan /> },
    // Bookable classes. The path must stay spelled "/class-sessions": it is the
    // menuUrl checkPermission resolves on the server AND the key
    // PermissionProtected matches against MenuContext, so the two only agree
    // while the route, the MenuMaster row and the permission string are
    // identical. Renaming it here silently 403s every non-super-admin.
    { path: "/class-sessions", component: <ClassSessions /> },
    // Public-website CMS. These three menuUrls must exist in MenuMaster or
    // PermissionProtected denies them for every non-super-admin.
    { path: "/website-pages", component: <WebsitePages /> },
    { path: "/website-adverts", component: <WebsiteAdverts /> },
    { path: "/website-leads", component: <WebsiteLeads /> },
    { path: "/seo-manager", component: <SeoManager /> },
    // Per-page CMS screens. Paths must match Gym-Server/config/cmsMenus.js
    // exactly — that file is the join key for both sidebar and cmsPermission.
    { path: "/cms/home", component: <CmsHome /> },
    { path: "/cms/about", component: <CmsAbout /> },
    { path: "/cms/contact", component: <CmsContact /> },
    { path: "/cms/programs", component: <CmsPrograms /> },
    { path: "/cms/pricing", component: <CmsPricing /> },
    { path: "/cms/faqs", component: <CmsFaqs /> },
    { path: "/cms/trainers", component: <CmsTrainers /> },
    { path: "/cms/testimonials", component: <CmsTestimonials /> },
    { path: "/cms/classes", component: <CmsClasses /> },
    // Byte-identical to CMS_COLLECTION_MENUS.transformations / CMS_MENU_TREE in
    // Gym-Server/config/cmsMenus.js. A mismatch here does not error — the menu
    // simply fails to resolve, PermissionProtected denies the route, and the
    // sidebar still shows the entry.
    { path: "/cms/transformations", component: <CmsTransformations /> },
    { path: "/cms/header", component: <CmsHeader /> },
    { path: "/cms/footer", component: <CmsFooter /> },
    { path: "/cms/social", component: <CmsSocial /> },
    // Site chrome. Byte-identical to CMS_COLLECTION_MENUS (stats, marquee,
    // navlinks, branches, media) and CMS_PAGE_MENUS.site in
    // Gym-Server/config/cmsMenus.js. The sidebar labels differ from the URLs on
    // purpose there — "Navigation" is /cms/navlinks, "Branch Cards" is
    // /cms/branches, "Background Media" is /cms/media — so match the URL, never
    // the label.
    { path: "/cms/stats", component: <CmsStats /> },
    { path: "/cms/marquee", component: <CmsMarquee /> },
    { path: "/cms/navlinks", component: <CmsNavlinks /> },
    { path: "/cms/branches", component: <CmsBranches /> },
    { path: "/cms/media", component: <CmsMedia /> },
    { path: "/cms/site", component: <CmsSite /> },
    // Site-wide notices. Byte-identical to CMS_NOTICE_MENUS in
    // Gym-Server/config/cmsMenus.js — "/cms/announcements" and "/cms/banners".
    // Two routes rather than one screen with a tab because the server grants
    // them separately: whoever can post a closure should not thereby be able to
    // publish a discount.
    { path: "/cms/announcements", component: <CmsAnnouncements /> },
    { path: "/cms/banners", component: <CmsBanners /> },
    // Insights — read-only staff screens. /reports additionally gates its CSV
    // export buttons on the `print` permission, which the export routes check
    // instead of `read`.
    { path: "/attendance-overview", component: <AttendanceOverview /> },
    { path: "/reports", component: <Reports /> },
    { path: "/audit-log", component: <AuditLog /> },
    { path: "/dashboard", component: <Dashboard /> },
    { path: "/menu-group", component: <MenuGroup /> },
    { path: "/menu-master", component: <MenuMaster /> },
    { path: "/role-master", component: <RoleMaster /> },
    { path: "/currency-master", component: <CurrencyMaster /> },
    { path: "/login-attempt-logs", component: <LoginAttemptLogs /> },

    {
        path: "/",
        exact: true,
        component: <Navigate to="/dashboard" />,
    },
    { path: "*", component: <Navigate to="/dashboard" /> },
];

const publicRoutes = [
    { path: "/", component: <Login /> },
    // { path: "*", component: <Navigate to="/" /> },
];

export { authProtectedRoutes, publicRoutes };

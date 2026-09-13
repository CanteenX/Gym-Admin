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
const WebsitePages = lazy(() => import("../pages/Website/WebsitePages"));
const WebsiteAdverts = lazy(() => import("../pages/Website/WebsiteAdverts"));
const WebsiteLeads = lazy(() => import("../pages/Website/WebsiteLeads"));
const SeoManager = lazy(() => import("../pages/Website/SeoManager"));


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
    // Public-website CMS. These three menuUrls must exist in MenuMaster or
    // PermissionProtected denies them for every non-super-admin.
    { path: "/website-pages", component: <WebsitePages /> },
    { path: "/website-adverts", component: <WebsiteAdverts /> },
    { path: "/website-leads", component: <WebsiteLeads /> },
    { path: "/seo-manager", component: <SeoManager /> },
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

import { Navigate } from "react-router-dom";
import Login from "../pages/Authentication/Login";
import UserProfile from "../pages/Authentication/user-profile";
import CompanyDetails from "../pages/Setup/CompanyDetails";
import Department from "../pages/Setup/Department";
import Employee from "../pages/Setup/Employee";
import Country from "../pages/Master/Country";
import State from "../pages/Master/State";
import City from "../pages/Master/City";
import EmailSetup from "../pages/CMS/EmailSetup";
import EmailFor from "../pages/CMS/EmailFor";
import EmailTo from "../pages/CMS/EmailTo";
import EmailTemplate from "../pages/CMS/EmailTemplate";
import Dashboard from "../pages/Dashboard/Dashboard";
import MenuGroup from "../pages/Master/MenuGroup";
import MenuMaster from "../pages/Master/MenuMaster";
import EmployeeRoles from "../pages/Setup/EmployeeRoles";
import RoleMaster from "../pages/Master/RoleMaster";
import CurrencyMaster from "../pages/Master/CurrencyMaster";
import LoginAttemptLogs from "../pages/Master/LoginAttemptLogs";
import BlogCategory from "../pages/CMS/BlogCategory";
import BlogTag from "../pages/CMS/BlogTag";
import BlogMaster from "../pages/CMS/BlogMaster";
import FaqCategory from "../pages/Setup/FaqCategory";
import Faq from "../pages/Setup/Faq";
import GuidesGallery from "../pages/HelpGuides/GuidesGallery";
import ManageGuides from "../pages/HelpGuides/ManageGuides";
import Members from "../pages/Members/Members";
import Trainers from "../pages/Trainers/Trainers";
import CashFlow from "../pages/Accounts/CashFlow";
import ExpenseCategories from "../pages/Accounts/ExpenseCategories";
import MembershipPlans from "../pages/Master/MembershipPlans";
import MemberExercisePlan from "../pages/Master/MemberExercisePlan";


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
    { path: "/member-exercise-plan", component: <MemberExercisePlan /> },
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

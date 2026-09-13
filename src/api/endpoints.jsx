/**
 * API Endpoint Constants
 * All API endpoints defined in one place for easy maintenance
 */

// API Version prefix
const V1 = "/api/v1";

export const ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        COMPANY_LOGIN: `${V1}/auth/company/login`,
        EMPLOYEE_LOGIN: `${V1}/auth/employee/login`,
        ME: `${V1}/auth/me`,
        LOGOUT: `${V1}/auth/logout`,
        OTP_SEND: `${V1}/auth/otp/send`,
        OTP_VERIFY: `${V1}/auth/otp/verify`,
        PASSWORD_RESET: `${V1}/auth/password/reset`,
        LOGIN_STATUS_BY_EMAIL: `${V1}/auth/login-status-by-email`,
        LOGIN_STATUS: (userId) => `${V1}/auth/login-status/${userId}`,
        VERIFY_SESSION: `${V1}/auth/verify-session`
    },

    // Company endpoints
    COMPANIES: {
        BASE: `${V1}/companies`,
        ME: `${V1}/companies/getCompanyDetails`,
        BY_ID: (id) => `${V1}/companies/${id}`,
        PUBLIC: `${V1}/companies/public`,
    },

    // Department endpoints
    DEPARTMENTS: {
        BASE: `${V1}/departments`,
        BY_ID: (id) => `${V1}/departments/${id}`,
        SEARCH: `${V1}/departments/search`,
    },

    // Employee endpoints
    EMPLOYEES: {
        BASE: `${V1}/employees`,
        BY_ID: (id) => `${V1}/employees/${id}`,
        SEARCH: `${V1}/employees/search`,
        RESET_PASSWORD: (id) => `${V1}/employees/${id}/reset-password`,
    },

    // Location endpoints
    COUNTRIES: {
        BASE: `${V1}/countries`,
        BY_ID: (id) => `${V1}/countries/${id}`,
        SEARCH: `${V1}/countries/search`,
        STATES: (countryId) => `${V1}/countries/${countryId}/states`,
    },

    STATES: {
        BASE: `${V1}/states`,
        BY_ID: (id) => `${V1}/states/${id}`,
        SEARCH: `${V1}/states/search`,
        CITIES: (stateId) => `${V1}/states/${stateId}/cities`,
    },

    CITIES: {
        BASE: `${V1}/cities`,
        BY_ID: (id) => `${V1}/cities/${id}`,
        SEARCH: `${V1}/cities/search`,
    },

    LOCATIONS: {
        BASE: `${V1}/locations`,
    },

    // Menu endpoints
    MENU_GROUPS: {
        BASE: `${V1}/menu-groups`,
        BY_ID: (id) => `${V1}/menu-groups/${id}`,
        SEARCH: `${V1}/menu-groups/search`,
    },

    MENUS: {
        BASE: `${V1}/menus`,
        BY_ID: (id) => `${V1}/menus/${id}`,
        SEARCH: `${V1}/menus/search`,
        BY_GROUPS: `${V1}/menus/by-groups`,
    },

    // Role endpoints
    ROLES: {
        BASE: `${V1}/roles`,
        BY_ID: (id) => `${V1}/roles/${id}`,
        SEARCH: `${V1}/roles/search`,
        ADMIN_CREATED: `${V1}/roles/admin-created`,       // ← add
        EMPLOYEE_CREATED: `${V1}/roles/employee-created`,
    },

    // Currency endpoints
    CURRENCIES: {
        BASE: `${V1}/currencies`,
        BY_ID: (id) => `${V1}/currencies/${id}`,
        SEARCH: `${V1}/currencies/search`,
    },

    // Email endpoints
    EMAIL_SETUPS: {
        BASE: `${V1}/email-setups`,
        BY_ID: (id) => `${V1}/email-setups/${id}`,
        SEARCH: `${V1}/email-setups/search`,
    },

    EMAIL_FOR: {
        BASE: `${V1}/email-for`,
        BY_ID: (id) => `${V1}/email-for/${id}`,
        SEARCH: `${V1}/email-for/search`,
    },

    EMAIL_TO: {
        BASE: `${V1}/email-to`,
        BY_ID: (id) => `${V1}/email-to/${id}`,
        SEARCH: `${V1}/email-to/search`,
    },

    EMAIL_TEMPLATES: {
        BASE: `${V1}/email-templates`,
        BY_ID: (id) => `${V1}/email-templates/${id}`,
        SEARCH: `${V1}/email-templates/search`,
        UPLOAD_SIGNATURE: `${V1}/email-templates/upload-signature`,
    },

    // Employee Roles endpoints
    EMPLOYEE_ROLES: {
        BASE: `${V1}/employee-roles`,
        BY_ID: (id) => `${V1}/employee-roles/${id}`,
    },

    // Admin endpoints
    ADMIN: {
        LOGIN_ATTEMPTS: `${V1}/admin/auth/login-attempts`,
        RESET_ATTEMPTS: `${V1}/admin/auth/reset-attempts`,
        UNLOCK_ACCOUNT: `${V1}/admin/auth/unlock`,
        BLOCK_USER: `${V1}/admin/auth/block`,
        UNBLOCK_USER: `${V1}/admin/auth/unblock`,
    },

    // Blog endpoints
    BLOG_CATEGORIES: {
        BASE: `${V1}/blog-categories`,
        BY_ID: (id) => `${V1}/blog-categories/${id}`,
        SEARCH: `${V1}/blog-categories-by-params`,
        LIST_ALL: `${V1}/blog-categories-list`,
    },

    BLOG_TAGS: {
        BASE: `${V1}/blog-tags`,
        BY_ID: (id) => `${V1}/blog-tags/${id}`,
        SEARCH: `${V1}/blog-tags-by-params`,
        LIST_ALL: `${V1}/blog-tags-list`,
    },

    BLOGS: {
        BASE: `${V1}/blogs`,
        BY_ID: (id) => `${V1}/blogs/${id}`,
        SEARCH: `${V1}/blogs-by-params`,
        STATUS: (id) => `${V1}/blogs/${id}/status`,
        STATS: `${V1}/blogs-stats`,
    },

    FAQ_CATEGORIES: {
        BASE: `${V1}/faq-categories`,
        BY_ID: (id) => `${V1}/faq-categories/${id}`,
        SEARCH: `${V1}/faq-categories-by-params`,
        LIST_ALL: `${V1}/faq-categories-list`,
    },

    FAQS: {
        BASE: `${V1}/faqs`,
        BY_ID: (id) => `${V1}/faqs/${id}`,
        SEARCH: `${V1}/faqs-by-params`,
    },

    GUIDES: {
        BASE: `${V1}/guides`,
        BY_ID: (id) => `${V1}/guides/${id}`,
        SEARCH: `${V1}/guides/list`,
    },

    // Gym membership endpoints
    MEMBERS: {
        BASE: `${V1}/members`,
        BY_ID: (id) => `${V1}/members/${id}`,
        SEARCH: `${V1}/members-by-params`,
        DASHBOARD_STATS: `${V1}/members-dashboard-stats`,
        PLANS: `${V1}/member-plans`,
        RENEW: (id) => `${V1}/members/${id}/renew`,
        PAYMENTS: (id) => `${V1}/members/${id}/payments`,
        SET_PASSWORD: (id) => `${V1}/members/${id}/set-password`,
        REVOKE_PORTAL: (id) => `${V1}/members/${id}/portal-access`,
        WORKOUT_PLAN: (id) => `${V1}/members/${id}/workout-plan`,
    },

    // Gym membership plan master endpoints
    MEMBERSHIP_PLANS: {
        BASE: `${V1}/membership-plans`,
        BY_ID: (id) => `${V1}/membership-plans/${id}`,
        SEARCH: `${V1}/membership-plans-by-params`,
        LIST_ALL: `${V1}/membership-plans-list`,
    },

    // Cash flow ledger endpoints
    TRANSACTIONS: {
        SEARCH: `${V1}/transactions-by-params`,
        SUMMARY: `${V1}/transactions-summary`,
        INCOME: `${V1}/transactions-income`,
        EXPENSE: `${V1}/transactions-expense`,
        BY_ID: (id) => `${V1}/transactions/${id}`,
        RECEIPT: (id) => `${V1}/transactions/${id}/receipt`,
    },

    // Expense category master endpoints
    EXPENSE_CATEGORIES: {
        BASE: `${V1}/expense-categories`,
        BY_ID: (id) => `${V1}/expense-categories/${id}`,
        SEARCH: `${V1}/expense-categories-by-params`,
        LIST_ALL: `${V1}/expense-categories-list`,
    },

    // Workout / exercise plan endpoints
    WORKOUT_PLANS: {
        BASE: `${V1}/workout-plans`,
        BY_ID: (id) => `${V1}/workout-plans/${id}`,
    },

    // Branch master endpoints
    BRANCHES: {
        // POST /branches creates; the GET list lives at /branches-list, matching
        // how members/trainers/expense-categories name their list routes. These
        // are deliberately different paths, not a typo — pointing LIST_ALL at
        // /branches returns 404 and every branch dropdown silently renders empty.
        BASE: `${V1}/branches`,
        BY_ID: (id) => `${V1}/branches/${id}`,
        SEARCH: `${V1}/branches-by-params`,
        LIST_ALL: `${V1}/branches-list`,
    },

    // Public-website CMS endpoints.
    //
    // All three domains share the /site prefix because the server mounts them
    // flat under /api/v1 like every other route file, and the prefix is what
    // keeps the public (unauthenticated) reads - /site/content, /site/ads,
    // /site/leads POST - grouped with the staff-only writes they mirror.
    SITE_CONTENT: {
        BASE: `${V1}/site/content`,
        BY_ID: (id) => `${V1}/site/content/${id}`,
        SEARCH: `${V1}/site/content-by-params`,
    },

    SITE_ADS: {
        BASE: `${V1}/site/ads`,
        BY_ID: (id) => `${V1}/site/ads/${id}`,
        SEARCH: `${V1}/site/ads-by-params`,
    },

    // Page-wise SEO metadata. GET /site/seo is deliberately public (the Next.js
    // app reads it from generateMetadata() with no staff session); the list,
    // create, update and delete paths below are the permission-checked staff
    // side of the same domain, which is why they share the /site prefix.
    SITE_SEO: {
        BASE: `${V1}/site/seo`,
        BY_ID: (id) => `${V1}/site/seo/${id}`,
        SEARCH: `${V1}/site/seo-by-params`,
    },

    SITE_LEADS: {
        BASE: `${V1}/site/leads`,
        BY_ID: (id) => `${V1}/site/leads/${id}`,
        SEARCH: `${V1}/site/leads-by-params`,
    },

    // Gym trainer endpoints
    TRAINERS: {
        BASE: `${V1}/trainers`,
        BY_ID: (id) => `${V1}/trainers/${id}`,
        SEARCH: `${V1}/trainers-by-params`,
        LIST_ALL: `${V1}/trainers-list`,
        MEMBERS: (id) => `${V1}/trainers/${id}/members`,
        ASSIGN_MEMBERS: (id) => `${V1}/trainers/${id}/assign-members`,
        UNASSIGN_MEMBER: (id, memberId) =>
            `${V1}/trainers/${id}/members/${memberId}`,
        UNASSIGNED_MEMBERS: `${V1}/trainers-unassigned-members`,
    },
};

export default ENDPOINTS;

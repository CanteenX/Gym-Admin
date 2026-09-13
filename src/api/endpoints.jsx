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

    // ------------------------------------------------- Bookable class sessions
    //
    // The diary, not the brochure. SITE_ITEMS with collectionKey "classes" is
    // the printed timetable the marketing site renders verbatim ("Mon — Sat",
    // "6:00 AM"); these are real instants with a capacity and a booking count,
    // which is what a booking needs. Pointing one at the other returns rows
    // that look almost right and cannot be booked.
    //
    // Paths are flat under /api/v1 like everything else, and the LIST path is
    // "/classes-by-params" while BASE is "/classes" — deliberately different
    // shapes, matching members / trainers / branches.
    //
    // Every staff path here is permission-checked against the menuUrl
    // "/class-sessions" (read for the two lists and the roster, write to
    // create, edit to update a class or mark a booking, delete to remove a
    // class), so the route path in Routes/allRoutes.jsx must stay spelled
    // exactly that way or PermissionProtected and checkPermission disagree.
    CLASS_SESSIONS: {
        BASE: `${V1}/classes`,
        BY_ID: (id) => `${V1}/classes/${id}`,
        SEARCH: `${V1}/classes-by-params`,
        ROSTER: (id) => `${V1}/classes/${id}/roster`,
    },

    // Bookings are read and marked, never created from the panel: a place is
    // taken by the person attending (the website's free-trial form or the
    // member portal), because the capacity counter is only ever moved by
    // services/bookingCapacity.js through those paths.
    CLASS_BOOKINGS: {
        SEARCH: `${V1}/class-bookings-by-params`,
        BY_ID: (id) => `${V1}/class-bookings/${id}`,
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

    // Repeating structured records for the marketing site - programme cards,
    // pricing plans, FAQs, trainers, the class timetable, testimonials and
    // transformations. One collection, keyed by `collectionKey`, rather than a
    // route per list. IMAGE is a separate multipart POST because the row itself
    // is JSON (its `fields` bag is a nested object, which multipart cannot
    // carry), and `?slot=` targets a declared image field inside that bag.
    SITE_ITEMS: {
        BASE: `${V1}/site/items`,
        BY_ID: (id) => `${V1}/site/items/${id}`,
        SEARCH: `${V1}/site/items-by-params`,
        IMAGE: (id) => `${V1}/site/items/${id}/image`,
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
        // Portal credentials. These live in memberAuth.routes.js on the server,
        // NOT in trainers.routes.js, because every handler that writes a
        // password is kept in one file — but they act on a trainer, so the
        // paths belong under this key rather than under a portal one.
        SET_PASSWORD: (id) => `${V1}/trainers/${id}/set-password`,
        REVOKE_PORTAL: (id) => `${V1}/trainers/${id}/portal-access`,
    },

    // ---------------------------------------------------------------- Insights
    //
    // The three read-only staff screens seeded under the "Insights" menu group:
    // /attendance-overview, /reports and /audit-log. These menuUrls are the join
    // key checkPermission and PermissionProtected both match on, so the route
    // paths in Routes/allRoutes.jsx must stay identical to them.

    // Staff-facing attendance reads. Nothing here writes.
    //
    // WORDING: the third path is "not-checked-in", never "not-visited".
    // Check-in is self-reported and unattended (a printed branch QR can be
    // photographed, and the portal button needs no QR at all), so a missing row
    // means "did not log a session", not "did not come in". The server repeats
    // that caveat in a `basis` string on every response; the screens must too.
    ATTENDANCE_STAFF: {
        FOOTFALL: `${V1}/attendance/footfall`,
        LIVE: `${V1}/attendance/live`,
        NOT_CHECKED_IN: `${V1}/attendance/not-checked-in`,
        // Returns the PAYLOAD for the printed branch sticker — a URL and some
        // copy — never an image. The server has no QR encoder and is not
        // getting one for a string this short; the panel encodes it client-side
        // (src/utils/qrCode.js) because it has to lay the sheet out around the
        // symbol anyway.
        QR: (branch) => `${V1}/attendance/qr/${encodeURIComponent(branch)}`,
        // The ONE write on the staff side of attendance, and the only path in
        // this block that is not read-only.
        //
        // It clears a refusal that reception has since sorted out: the member
        // was told on their own phone that their membership needed attention,
        // walked to the desk, and paid or had the record corrected. Nobody was
        // stopped on the way in — there is no barrier — so this is not
        // "granting entry", it is closing off a flag that is no longer true.
        //
        // Guarded by `edit` on /attendance-overview rather than `read`, which
        // is why it sits beside the reads instead of in a separate block: same
        // menu row, different permission flag.
        MARK_ALLOWED: (id) => `${V1}/attendance/${id}/mark-allowed`,
    },

    // Read-only reporting. Every money figure behind these comes from the
    // Transaction ledger, never from Member.payments[] (which is cleared on
    // renewal), so nothing here should ever be recomputed client-side from a
    // member record.
    REPORTS: {
        COLLECTIONS: `${V1}/reports/collections`,
        PROFIT_LOSS: `${V1}/reports/profit-loss`,
        EXPIRY_PIPELINE: `${V1}/reports/expiry-pipeline`,
        MEMBER_AGEING: `${V1}/reports/member-ageing`,
    },

    // CSV exports. These sit behind the /reports menu row but check the PRINT
    // flag, not read — a file that leaves the building is a separate decision
    // from being allowed to look at the numbers on screen. `?format=json`
    // returns a capped in-memory array instead of a stream, which is the shape
    // Components/Common/ExportCSVModal renders and downloads.
    EXPORTS: {
        TRANSACTIONS: `${V1}/exports/transactions`,
        MEMBERS: `${V1}/exports/members`,
        ATTENDANCE: `${V1}/exports/attendance`,
    },

    // Audit trail viewer. Read-only by design — there is deliberately no
    // create/update/delete endpoint, because a trail an operator can edit is
    // not a trail.
    //
    // FILTERS is spelled "/audit-logs-filters", not "/audit-logs/filters": the
    // server keeps it a different path SHAPE from /audit-logs/:id so it cannot
    // be swallowed as an id.
    AUDIT_LOGS: {
        SEARCH: `${V1}/audit-logs-by-params`,
        FILTERS: `${V1}/audit-logs-filters`,
        BY_ID: (id) => `${V1}/audit-logs/${id}`,
    },
};

export default ENDPOINTS;

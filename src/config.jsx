/**
 * Admin panel runtime config.
 *
 * In production the admin SPA is served from /admin on the SAME origin as the
 * API, so baseURL is empty and axios issues relative requests. That also makes
 * the express-session cookie first-party, which removes the SameSite/CORS
 * problems a cross-origin admin panel would otherwise hit.
 *
 * Every path in endpoints.jsx already starts with /api/v1, so no prefix is lost.
 */
export default {
    api: {
        API_URL:
            import.meta.env.MODE === "production"
                ? (import.meta.env.VITE_API_URL ?? "")
                : "http://localhost:7002",
    },
};

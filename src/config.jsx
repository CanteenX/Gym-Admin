export default {
    api: {
        API_URL:
            import.meta.env.MODE === "production"
                ? "https://demo.barodaweb.org"
                : "http://localhost:7002",
    },
};

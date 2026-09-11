export default {
    api: {
        API_URL:
            import.meta.env.MODE === "production"
                ? "https://admin.midcitygym.in"
                : "http://localhost:7002",
    },
};

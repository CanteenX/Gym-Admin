import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";

/**
 * Vite's BASE_URL always carries a trailing slash ("/admin/"), but React Router
 * matches the basename as a literal prefix: stripBasename("/admin", "/admin/")
 * fails the startsWith test, returns null, and the router renders NOTHING.
 *
 * So visiting /admin (no trailing slash) served the correct HTML and then
 * painted a blank page, while /admin/ worked - which is exactly the kind of
 * difference that looks like a broken deployment.
 *
 * Trimming the slash makes both URLs match. "/" is preserved for the legacy
 * deployment that serves this build from the domain root.
 */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <BrowserRouter basename={basename}>
        <App />
    </BrowserRouter>
);

import React, { useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { MenuContext } from "../context/MenuContext";

/**
 * PermissionProtected Component
 * Enforces strict RBAC: Routes are only accessible if:
 * 1. URL maps to a registered menu item in the complete menu structure, AND
 * 2. User has read permission for that menu, OR
 * 3. Route is whitelisted (accessible to all authenticated users)
 *
 * Permission is resolved synchronously during render so route changes
 * do not flash a full-screen spinner (which looked like a page refresh).
 */

const WHITELISTED_ROUTES = ["/dashboard", "/profile", "/"];

const normalizeUrl = (url) => url.split("?")[0].replace(/\/+$/, "") || "/";

const PermissionProtected = ({ children }) => {
    const { role } = useContext(AuthContext);
    const menuContext = useContext(MenuContext);
    const location = useLocation();

    const {
        isAdmin,
        loading: menuLoading,
        menuData,
        getPermissionsForMenu,
        findMenuIdByUrlInComplete,
    } = menuContext || {};

    const access = useMemo(() => {
        try {
            const normalizedPath = normalizeUrl(location.pathname);
            const isWhitelisted = WHITELISTED_ROUTES.some((route) => {
                const normalizedRoute = normalizeUrl(route);
                return (
                    normalizedPath === normalizedRoute || normalizedPath === "/"
                );
            });

            if (isWhitelisted) {
                return { status: "allowed" };
            }

            if (!menuContext) {
                return { status: "error", message: "MenuContext not available" };
            }

            if (!role) {
                return { status: "denied" };
            }

            if (isAdmin) {
                return { status: "allowed" };
            }

            const hasLoadedMenus = Boolean(menuData && menuData.length > 0);
            if (menuLoading && !hasLoadedMenus) {
                return { status: "loading" };
            }

            if (typeof findMenuIdByUrlInComplete !== "function") {
                console.error(
                    "SECURITY: findMenuIdByUrlInComplete is not available - DENYING access"
                );
                return { status: "denied" };
            }

            if (typeof getPermissionsForMenu !== "function") {
                console.error(
                    "SECURITY: getPermissionsForMenu is not available - DENYING access"
                );
                return { status: "denied" };
            }

            const menuId = findMenuIdByUrlInComplete(location.pathname);

            if (!menuId) {
                console.warn(
                    `SECURITY: URL '${location.pathname}' is not registered in menu system - ACCESS DENIED`
                );
                return { status: "denied" };
            }

            const permissions = getPermissionsForMenu(menuId);
            const allowed = permissions?.read === true;

            return { status: allowed ? "allowed" : "denied" };
        } catch (err) {
            console.error("Error in PermissionProtected:", err);
            return { status: "error", message: err.message };
        }
    }, [
        role,
        location.pathname,
        menuContext,
        isAdmin,
        menuLoading,
        menuData,
        getPermissionsForMenu,
        findMenuIdByUrlInComplete,
    ]);

    if (access.status === "error") {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ minHeight: "50vh" }}
            >
                <div className="alert alert-danger">
                    <strong>Error:</strong> {access.message}
                    <p className="mt-2 mb-0">Check console for details</p>
                </div>
            </div>
        );
    }

    // Only block the content area while menus are loading for the first time
    if (access.status === "loading") {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ minHeight: "50vh" }}
            >
                <output className="spinner-border text-primary">
                    <span className="visually-hidden">Loading...</span>
                </output>
            </div>
        );
    }

    if (access.status === "denied") {
        console.warn(`Access DENIED to route: ${location.pathname}`);
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

PermissionProtected.propTypes = {
    children: PropTypes.node,
};

export { PermissionProtected };

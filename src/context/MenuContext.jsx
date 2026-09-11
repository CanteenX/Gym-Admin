/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { getCurrentUser } from "../api/auth.api";
import { getMenusByGroups } from "../api/menus.api";
import { getEmployeeRolesByRoleId } from "../api/employeeRoles.api";
import { AuthContext } from "./AuthContext";

const MenuContext = createContext();

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Recursive helper function to filter menu items at any nesting level
const filterMenuItems = (menuItems, roles) => {
    if (!Array.isArray(menuItems) || !Array.isArray(roles)) {
        return [];
    }

    return menuItems.filter(menu => {
        const hasReadPermission = roles.some(role =>
            role.menuId === menu.id && role.read
        );

        if (menu.children && menu.children.length > 0) {
            menu.children = filterMenuItems(menu.children, roles);
            return hasReadPermission || menu.children.length > 0;
        }

        return hasReadPermission;
    });
};

// Helper function to filter menus based on user permissions
const filterMenusByPermission = (menuGroups, roles) => {
    if (!Array.isArray(menuGroups) || !Array.isArray(roles)) {
        return [];
    }

    return menuGroups.filter(group => {
        if (group.isLink) {
            return roles.some(role =>
                role.menuGroupId === group.groupId && role.read
            );
        }

        const filteredMenus = filterMenuItems(group.menus || [], roles);

        if (filteredMenus.length > 0) {
            group.menus = filteredMenus;
            return true;
        }

        return false;
    });
};

const MenuProvider = ({ children }) => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [employeeRoleId, setEmployeeRoleId] = useState(null);
    const [isStatusFetched, setIsStatusFetched] = useState(false);
    const [employeeRoles, setEmployeeRoles] = useState(null);
    const [currentPagePermissions, setCurrentPagePermissions] = useState({
        menuId: null,
        read: false,
        write: false,
        delete: false,
        edit: false,
        print: false,
        mail: false
    });

    const [menuCache, setMenuCache] = useState({
        adminMenus: null,
        roleMenus: {},
        completeMenus: null,
        timestamp: null
    });

    const { role: authRole, isSessionVerified } = useContext(AuthContext);

    const checkUserRole = useCallback(async () => {
        setIsStatusFetched(false);
        try {
            if (!authRole) {
                return false;
            }

            const response = await getCurrentUser();

            if (response.data.isOk) {
                const userData = response.data.data;
                setIsStatusFetched(true);
                setIsAdmin(userData.role === "ADMIN");
                setEmployeeRoleId(userData.roleId);
                return userData.role === "ADMIN";
            }

            return false;
        } catch (err) {
            console.error("Error checking user role:", err);
            return false;
        }
    }, [authRole]);

    const fetchEmployeeRoles = useCallback(async (roleId) => {
        try {
            if (!roleId) return null;

            const response = await getEmployeeRolesByRoleId(roleId);

            if (response.data.isOk) {
                setEmployeeRoles(response.data.data[0]);
                return response.data.data[0];
            }

            return null;
        } catch (err) {
            console.error("Error fetching employee roles:", err);
            return null;
        }
    }, []);

    const isCacheValid = useCallback(() => {
        if (!menuCache.timestamp) return false;
        const now = Date.now();
        return (now - menuCache.timestamp) < CACHE_DURATION;
    }, [menuCache.timestamp]);

    const invalidateMenuCache = useCallback(() => {
        setMenuCache({
            adminMenus: null,
            roleMenus: {},
            completeMenus: null,
            timestamp: null
        });
    }, []);

    const getCachedMenuData = useCallback((adminStatus) => {
        if (adminStatus && menuCache.adminMenus) {
            return menuCache.adminMenus;
        }
        if (!adminStatus && employeeRoleId && menuCache.roleMenus[employeeRoleId]) {
            return menuCache.roleMenus[employeeRoleId];
        }
        return null;
    }, [menuCache.adminMenus, menuCache.roleMenus, employeeRoleId]);

    const processFetchedMenus = useCallback(async (menuGroups, adminStatus, now) => {
        setMenuCache(prev => ({
            ...prev,
            completeMenus: menuGroups,
            timestamp: now
        }));

        if (adminStatus) {
            setMenuData(menuGroups);
            setMenuCache(prev => ({
                ...prev,
                adminMenus: menuGroups,
                completeMenus: menuGroups,
                timestamp: now
            }));
            return;
        }

        if (employeeRoleId) {
            const roles = await fetchEmployeeRoles(employeeRoleId);
            if (roles?.roles) {
                const filteredMenuGroups = filterMenusByPermission(menuGroups, roles.roles);
                setMenuData(filteredMenuGroups);
                setMenuCache(prev => ({
                    ...prev,
                    roleMenus: {
                        ...prev.roleMenus,
                        [employeeRoleId]: filteredMenuGroups
                    },
                    completeMenus: menuGroups,
                    timestamp: now
                }));
            }
        }
    }, [employeeRoleId, fetchEmployeeRoles]);

    const updateCurrentPagePermissions = useCallback((menuId) => {
        if (isAdmin) {
            setCurrentPagePermissions({
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            });
            return;
        }

        if (!employeeRoles?.roles || !menuId) {
            setCurrentPagePermissions({
                menuId: null,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            });
            return;
        }

        const menuPermission = employeeRoles.roles.find(role => role.menuId === menuId);

        if (menuPermission) {
            setCurrentPagePermissions({
                menuId,
                read: menuPermission.read || false,
                write: menuPermission.write || false,
                delete: menuPermission.delete || false,
                edit: menuPermission.edit || false,
                print: menuPermission.print || false,
                mail: menuPermission.mail || false
            });
        } else {
            setCurrentPagePermissions({
                menuId,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            });
        }
    }, [isAdmin, employeeRoles]);

    const getPermissionsForMenu = useCallback((menuId) => {
        if (isAdmin) {
            return {
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            };
        }

        if (!employeeRoles?.roles || !menuId) {
            return {
                menuId,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            };
        }

        const menuPermission = employeeRoles.roles.find(role => role.menuId === menuId);

        if (menuPermission) {
            return {
                menuId,
                read: menuPermission.read || false,
                write: menuPermission.write || false,
                delete: menuPermission.delete || false,
                edit: menuPermission.edit || false,
                print: menuPermission.print || false,
                mail: menuPermission.mail || false
            };
        }

        return {
            menuId,
            read: false,
            write: false,
            delete: false,
            edit: false,
            print: false,
            mail: false
        };
    }, [isAdmin, employeeRoles]);

    const findMenuIdByUrl = useCallback((url) => {
        if (!url || !Array.isArray(menuData)) {
            return null;
        }

        const cleanUrl = url.split('?')[0].replace(/\/+$/, '') || '/';
        let foundMenuId = null;

        const directLinkGroup = menuData.find(group => {
            if (!group.isLink || !group.url) return false;
            const groupUrl = group.url.replace(/\/+$/, '') || '/';
            return groupUrl === cleanUrl;
        });

        if (directLinkGroup) {
            return directLinkGroup.groupId;
        }

        const searchMenus = (menus) => {
            if (!Array.isArray(menus) || foundMenuId) return;

            for (const menu of menus) {
                if (menu.url) {
                    const menuUrl = menu.url.replace(/\/+$/, '') || '/';
                    if (menuUrl === cleanUrl) {
                        foundMenuId = menu.id;
                        return;
                    }
                }

                if (menu.children && menu.children.length > 0) {
                    searchMenus(menu.children);
                }
            }
        };

        for (const group of menuData) {
            if (group.menus && group.menus.length > 0) {
                searchMenus(group.menus);
                if (foundMenuId) break;
            }
        }

        return foundMenuId;
    }, [menuData]);

    const findMenuIdByUrlInComplete = useCallback((url) => {
        try {
            if (!url || !menuCache.completeMenus || !Array.isArray(menuCache.completeMenus)) {
                return null;
            }

            const cleanUrl = url.split('?')[0].replace(/\/+$/, '') || '/';
            let foundMenuId = null;

            const directLinkGroup = menuCache.completeMenus.find(group => {
                if (!group.isLink || !group.url) return false;
                const groupUrl = group.url.replace(/\/+$/, '') || '/';
                return groupUrl === cleanUrl;
            });

            if (directLinkGroup) {
                return directLinkGroup.groupId;
            }

            const searchMenus = (menus) => {
                if (!Array.isArray(menus) || foundMenuId) return;

                for (const menu of menus) {
                    if (menu?.url) {
                        const menuUrl = menu.url.replace(/\/+$/, '') || '/';
                        if (menuUrl === cleanUrl) {
                            foundMenuId = menu.id;
                            return;
                        }
                    }

                    if (menu?.children?.length > 0) {
                        searchMenus(menu.children);
                    }
                }
            };

            for (const group of menuCache.completeMenus) {
                if (group?.menus?.length > 0) {
                    searchMenus(group.menus);
                    if (foundMenuId) break;
                }
            }

            return foundMenuId;
        } catch (err) {
            console.error("Error in findMenuIdByUrlInComplete:", err);
            return null;
        }
    }, [menuCache.completeMenus]);

    const updatePermissionsByCurrentUrl = useCallback(() => {
        const currentPath = globalThis.location.pathname;
        const menuId = findMenuIdByUrlInComplete(currentPath);
        if (menuId) {
            updateCurrentPagePermissions(menuId);
        }
    }, [findMenuIdByUrlInComplete, updateCurrentPagePermissions]);

    const fetchMenus = useCallback(async (forceRefresh = false) => {
        try {
            if (!authRole) {
                setError("No authentication found");
                setLoading(false);
                return;
            }

            setLoading(true);
            const adminStatus = await checkUserRole();

            if (!forceRefresh && isCacheValid()) {
                const cachedData = getCachedMenuData(adminStatus);
                if (cachedData) {
                    setMenuData(cachedData);
                    setLoading(false);
                    return;
                }
            }

            const response = await getMenusByGroups();

            if (response.data.isOk) {
                await processFetchedMenus(response.data.data, adminStatus, Date.now());
                updatePermissionsByCurrentUrl();
            } else {
                setError(response?.data?.message || "Failed to get menu data");
            }
        } catch (err) {
            console.error("Error fetching menus:", err);
            setError(err.message || "Failed to fetch menus");
        } finally {
            setLoading(false);
        }
    }, [authRole, checkUserRole, isCacheValid, getCachedMenuData, processFetchedMenus, updatePermissionsByCurrentUrl]);

    // Fetch menus once when session is verified and role exists
    useEffect(() => {
        if (isSessionVerified && authRole) {
            fetchMenus();
        }
    }, [isSessionVerified, authRole, fetchMenus]);

    useEffect(() => {
        if (!loading && menuData.length > 0) {
            updatePermissionsByCurrentUrl();
        }
    }, [loading, menuData, updatePermissionsByCurrentUrl]);

    const contextValue = useMemo(() => ({
        menuData,
        loading,
        error,
        fetchMenus,
        isAdmin,
        employeeRoles,
        invalidateMenuCache,
        currentPagePermissions,
        updateCurrentPagePermissions,
        getPermissionsForMenu,
        findMenuIdByUrl,
        findMenuIdByUrlInComplete,
        updatePermissionsByCurrentUrl
    }), [
        menuData,
        loading,
        error,
        fetchMenus,
        isAdmin,
        employeeRoles,
        invalidateMenuCache,
        currentPagePermissions,
        updateCurrentPagePermissions,
        getPermissionsForMenu,
        findMenuIdByUrl,
        findMenuIdByUrlInComplete,
        updatePermissionsByCurrentUrl
    ]);

    return (
        <MenuContext.Provider value={contextValue}>
            {children}
        </MenuContext.Provider>
    );
};

MenuProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export { MenuContext, MenuProvider };
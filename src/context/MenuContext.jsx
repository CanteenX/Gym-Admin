/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
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
                return { isFullAdmin: false, roleId: null };
            }

            const response = await getCurrentUser();

            if (response.data.isOk) {
                const userData = response.data.data;
                setIsStatusFetched(true);
                /**
                 * A super admin is a full admin here, whichever table they
                 * live in.
                 *
                 * This used to test `role === "ADMIN"` alone, which is true
                 * only for CompanyMaster logins. An Employee created with the
                 * "Super Admin (both branches)" box ticked logs in as
                 * role "EMPLOYEE", so it fell through to the per-menu
                 * permission path — and if its role had no EmployeeRoles
                 * document, every route resolved to "no read permission" and
                 * PermissionProtected bounced it to /dashboard, which failed
                 * the same way. The symptom was being logged straight back out
                 * with a perfectly valid session and 200s on every API call.
                 *
                 * The server already treats both the same way: checkPermission
                 * short-circuits for ADMIN, and requireSuperAdmin reads
                 * req.session.user.isSuperAdmin regardless of table.
                 */
                /**
                 * The flag ONLY — not the role string.
                 *
                 * `role === "ADMIN"` means "logged in from the CompanyMaster
                 * table", which is not the same as "may do anything". The
                 * server's gates (checkPermission and cmsPermission) both key
                 * on isSuperAdmin, so accepting the role here would hand a
                 * branch-level company admin the full sidebar and let
                 * PermissionProtected wave them through — and then every API
                 * call would 403. A client that disagrees with the server about
                 * who is privileged is worse than one that is merely strict.
                 */
                const isFullAdmin = userData.isSuperAdmin === true;
                setIsAdmin(isFullAdmin);
                /**
                 * Only write when the value actually CHANGES.
                 *
                 * This is what kept a non-admin stuck on "Loading menus...".
                 * `employeeRoleId` is a dependency of processFetchedMenus, which
                 * is a dependency of fetchMenus, which the mount effect depends
                 * on. Setting it unconditionally here — inside a function that
                 * fetchMenus itself calls — rebuilt fetchMenus, retriggered the
                 * effect, and called checkUserRole again, forever. `loading`
                 * was set true at the top of every pass and the finally-block's
                 * setLoading(false) never won the race.
                 *
                 * Admins never saw it: processFetchedMenus returns early for
                 * them, before employeeRoleId is ever read.
                 */
                const nextRoleId = userData.roleId ?? null;
                setEmployeeRoleId((prev) =>
                    String(prev ?? "") === String(nextRoleId ?? "") ? prev : nextRoleId,
                );
                // The roleId is RETURNED as well as stored: the setState above
                // has not landed by the time fetchMenus needs it in the same
                // pass, so callers must use this value rather than the state.
                return { isFullAdmin, roleId: nextRoleId };
            }

            // Every exit returns the same SHAPE — fetchMenus destructures this,
            // and a bare `false` would throw before the menus were ever fetched.
            return { isFullAdmin: false, roleId: null };
        } catch (err) {
            console.error("Error checking user role:", err);
            return { isFullAdmin: false, roleId: null };
        }
    }, [authRole]);

    const fetchEmployeeRoles = useCallback(async (roleId) => {
        try {
            if (!roleId) return null;

            const response = await getEmployeeRolesByRoleId(roleId);

            if (response.data.isOk) {
                /**
                 * The server returns the EmployeeRoles document itself, not an
                 * array — there is exactly one per role. This used to read
                 * `data[0]`, which silently became undefined, so the sidebar
                 * filter got no permission rows and rendered "No menu items
                 * available" despite a clean 200 carrying all 29 rows.
                 *
                 * Tolerating both shapes keeps this working if an older server
                 * build is ever in front of it.
                 */
                const payload = response.data.data;
                const roleDoc = Array.isArray(payload) ? payload[0] : payload;
                setEmployeeRoles(roleDoc ?? null);
                return roleDoc ?? null;
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

    /**
     * `roleIdOverride` is passed in by fetchMenus rather than read from state.
     *
     * THE RACE: checkUserRole() calls setEmployeeRoleId() a few lines earlier in
     * the same fetchMenus pass, but React state updates are not synchronous — so
     * on first load the `employeeRoleId` captured in this callback's closure is
     * still null. The non-admin branch below was therefore skipped entirely,
     * setMenuData never ran, and the sidebar rendered "No menu items available"
     * with a perfectly good 29-row permission payload sitting unused.
     *
     * Admins are unaffected: their branch returns above this point.
     */
    const processFetchedMenus = useCallback(async (menuGroups, adminStatus, now, roleIdOverride = null) => {
        const effectiveRoleId = roleIdOverride || employeeRoleId;
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

        if (effectiveRoleId) {
            const roles = await fetchEmployeeRoles(effectiveRoleId);
            if (roles?.roles) {
                const filteredMenuGroups = filterMenusByPermission(menuGroups, roles.roles);
                setMenuData(filteredMenuGroups);
                setMenuCache(prev => ({
                    ...prev,
                    roleMenus: {
                        ...prev.roleMenus,
                        [effectiveRoleId]: filteredMenuGroups
                    },
                    completeMenus: menuGroups,
                    timestamp: now
                }));
            } else {
                // A role with no permission rows genuinely has no menus. Set an
                // empty array so the sidebar shows its real empty state instead
                // of sitting on a spinner forever.
                setMenuData([]);
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
            // checkUserRole returns the roleId alongside the admin flag because
            // its setEmployeeRoleId has not taken effect yet in this same pass.
            const { isFullAdmin: adminStatus, roleId } = await checkUserRole();

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
                await processFetchedMenus(response.data.data, adminStatus, Date.now(), roleId);
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

    /**
     * Fetch menus ONCE per verified session.
     *
     * `fetchMenus` is deliberately NOT a dependency. It is a useCallback whose
     * identity changes whenever employeeRoleId or employeeRoles change — both
     * of which fetchMenus itself sets — so depending on it made this effect
     * re-arm every time it ran. For a non-admin that was an unbreakable loop
     * and the sidebar sat on "Loading menus..." indefinitely.
     *
     * The ref key is what actually guards re-entry: a genuine change of user
     * (different role, or a fresh session) produces a new key and refetches,
     * while a mere identity change of the callback does not.
     */
    const lastFetchKey = useRef(null);
    useEffect(() => {
        if (!isSessionVerified || !authRole) return;
        const key = `${authRole}`;
        if (lastFetchKey.current === key) return;
        lastFetchKey.current = key;
        fetchMenus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSessionVerified, authRole]);

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
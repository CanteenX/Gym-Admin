/**
 * Roles API Service
 * Handles all role-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create a new role
 * @param {Object} data - Role data
 * @returns {Promise}
 */
export const createRole = async (data) => {
    return api.post(ENDPOINTS.ROLES.BASE, data);
};

/**
 * Get all roles
 * @returns {Promise}
 */
export const getAllRoles = async () => {
    return api.get(ENDPOINTS.ROLES.BASE);
};

/**
 * Roles the signed-in user may actually ASSIGN to a member of staff.
 *
 * Not the same list as getAllRoles(), and the difference is the point.
 * ENDPOINTS.ROLES.BASE is gated on the /role-master menu, which is reserved to
 * the super admin — so for a branch admin it returns 403, the Role dropdown
 * came back empty, and since a role is required no branch admin could save any
 * employee at all.
 *
 * This endpoint is bounded by the caller's own permissions instead: it returns
 * only roles they could legitimately hand out. The server enforces the same
 * bound again on save (middlewares/roleCeiling.js), so this is a convenience
 * over a real boundary, not the boundary itself.
 */
export const getAssignableRoles = async () => {
    return api.get(ENDPOINTS.ROLES.ASSIGNABLE);
};

/**
 * Get all roles created by admin
 * @returns {Promise}
 */
export const getAdminCreatedRoles = async () => {
    return api.get(ENDPOINTS.ROLES.ADMIN_CREATED);
};

/**
 * Get all roles created by employees grouped by employee
 * @returns {Promise}
 */
export const getEmployeeCreatedRoles = async () => {
    return api.get(ENDPOINTS.ROLES.EMPLOYEE_CREATED);
};

/**
 * Get role by ID
 * @param {string} id - Role ID
 * @returns {Promise}
 */
export const getRoleById = async (id) => {
    return api.get(ENDPOINTS.ROLES.BY_ID(id));
};

/**
 * Update role
 * @param {string} id - Role ID
 * @param {Object} data - Updated role data
 * @returns {Promise}
 */
export const updateRole = async (id, data) => {
    return api.put(ENDPOINTS.ROLES.BY_ID(id), data);
};

/**
 * Delete role
 * @param {string} id - Role ID
 * @returns {Promise}
 */
export const deleteRole = async (id) => {
    return api.delete(ENDPOINTS.ROLES.BY_ID(id));
};

/**
 * Search roles with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchRoles = async (params) => {
    return api.post(ENDPOINTS.ROLES.SEARCH, params);
};

export default {
    createRole,
    getAllRoles,
    getAssignableRoles,
    getRoleById,
    updateRole,
    deleteRole,
    searchRoles,
    getAdminCreatedRoles,
    getEmployeeCreatedRoles,
};

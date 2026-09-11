/**
 * Members API Service
 * Gym membership records, renewals, payments and dashboard reminders.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create a member.
 * @param {FormData} data - member fields plus optional photo / idProof files
 */
export const createMember = async (data) => {
    return api.post(ENDPOINTS.MEMBERS.BASE, data, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/**
 * Update a member.
 * @param {FormData} data - member fields plus optional photo / idProof files
 */
export const updateMember = async (id, data) => {
    return api.put(ENDPOINTS.MEMBERS.BY_ID(id), data, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const deleteMember = async (id) => {
    return api.delete(ENDPOINTS.MEMBERS.BY_ID(id));
};

export const getMemberById = async (id) => {
    return api.get(ENDPOINTS.MEMBERS.BY_ID(id));
};

export const searchMembers = async (params) => {
    return api.post(ENDPOINTS.MEMBERS.SEARCH, params);
};

export const getMemberDashboardStats = async () => {
    return api.get(ENDPOINTS.MEMBERS.DASHBOARD_STATS);
};

export const listMemberPlans = async () => {
    return api.get(ENDPOINTS.MEMBERS.PLANS);
};

export const renewMembership = async (id, data) => {
    return api.post(ENDPOINTS.MEMBERS.RENEW(id), data);
};

export const addMemberPayment = async (id, data) => {
    return api.post(ENDPOINTS.MEMBERS.PAYMENTS(id), data);
};

/**
 * Enable member-portal access by setting their first password.
 * The member is prompted to change it on first login.
 */
export const setMemberPassword = async (id, password, loginId) => {
    return api.put(ENDPOINTS.MEMBERS.SET_PASSWORD(id), { password, loginId });
};

/** Remove portal access without deleting the member. */
export const revokeMemberPortalAccess = async (id) => {
    return api.delete(ENDPOINTS.MEMBERS.REVOKE_PORTAL(id));
};

export default {
    createMember,
    updateMember,
    deleteMember,
    getMemberById,
    searchMembers,
    getMemberDashboardStats,
    listMemberPlans,
    renewMembership,
    addMemberPayment,
    setMemberPassword,
    revokeMemberPortalAccess,
};

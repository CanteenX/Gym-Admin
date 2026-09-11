/**
 * Membership Plans API Service
 * The plan master behind the member form's plan dropdown — codes, durations,
 * default fees and whether a plan requires a dedicated trainer.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createMembershipPlan = async (data) => {
    return api.post(ENDPOINTS.MEMBERSHIP_PLANS.BASE, data);
};

export const updateMembershipPlan = async (id, data) => {
    return api.put(ENDPOINTS.MEMBERSHIP_PLANS.BY_ID(id), data);
};

export const deleteMembershipPlan = async (id) => {
    return api.delete(ENDPOINTS.MEMBERSHIP_PLANS.BY_ID(id));
};

export const searchMembershipPlans = async (params) => {
    return api.post(ENDPOINTS.MEMBERSHIP_PLANS.SEARCH, params);
};

/** Active plans in display order — for dropdowns. */
export const listAllMembershipPlans = async () => {
    return api.get(ENDPOINTS.MEMBERSHIP_PLANS.LIST_ALL);
};

export default {
    createMembershipPlan,
    updateMembershipPlan,
    deleteMembershipPlan,
    searchMembershipPlans,
    listAllMembershipPlans,
};

/**
 * Branch Master API Service
 * The branch master behind every branch dropdown in the admin.
 *
 * A branch row with `isPhysical: false` (e.g. "Common") is NOT a gym — it is a
 * cost bucket for shared expenses such as rent, software and owner salary.
 * Member / trainer / employee pickers must therefore request `physicalOnly`
 * so nobody can be enrolled against a cost bucket. Cash flow and expense
 * pickers deliberately include it.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createBranch = async (data) => {
    return api.post(ENDPOINTS.BRANCHES.BASE, data);
};

export const updateBranch = async (id, data) => {
    return api.put(ENDPOINTS.BRANCHES.BY_ID(id), data);
};

/**
 * The server always refuses this — branches are deactivated, never deleted.
 * Callers must surface the returned message verbatim.
 */
export const deleteBranch = async (id) => {
    return api.delete(ENDPOINTS.BRANCHES.BY_ID(id));
};

export const getBranchById = async (id) => {
    return api.get(ENDPOINTS.BRANCHES.BY_ID(id));
};

export const searchBranches = async (params) => {
    return api.post(ENDPOINTS.BRANCHES.SEARCH, params);
};

/**
 * Active branches in display order — for dropdowns.
 * @param {boolean} physicalOnly - true excludes non-physical (cost bucket)
 *   branches. Pass true for member / trainer / employee pickers.
 */
export const listBranches = async (physicalOnly = false) => {
    return api.get(ENDPOINTS.BRANCHES.LIST_ALL, {
        params: physicalOnly ? { physicalOnly: true } : {},
    });
};

export default {
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchById,
    searchBranches,
    listBranches,
};

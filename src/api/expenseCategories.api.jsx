/**
 * Expense Category Master API Service
 * Editable categories that drive the outgoing side of the cash flow ledger.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createExpenseCategory = async (data) => {
    return api.post(ENDPOINTS.EXPENSE_CATEGORIES.BASE, data);
};

export const updateExpenseCategory = async (id, data) => {
    return api.put(ENDPOINTS.EXPENSE_CATEGORIES.BY_ID(id), data);
};

export const deleteExpenseCategory = async (id) => {
    return api.delete(ENDPOINTS.EXPENSE_CATEGORIES.BY_ID(id));
};

export const searchExpenseCategories = async (params) => {
    return api.post(ENDPOINTS.EXPENSE_CATEGORIES.SEARCH, params);
};

/** Active categories for dropdowns, in display order. */
export const listAllExpenseCategories = async () => {
    return api.get(ENDPOINTS.EXPENSE_CATEGORIES.LIST_ALL);
};

export default {
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    searchExpenseCategories,
    listAllExpenseCategories,
};

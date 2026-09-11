/**
 * Cash Flow API Service
 *
 * The ledger is the permanent financial record — separate from the per-member
 * `payments` array, which only tracks the current period's balance.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchTransactions = async (params) => {
    return api.post(ENDPOINTS.TRANSACTIONS.SEARCH, params);
};

/** Monthwise series, expense split by category, and headline tiles. */
export const getCashFlowSummary = async (months = 6, branch = "") => {
    const query = new URLSearchParams();
    if (months) query.set("months", months);
    if (branch) query.set("branch", branch);
    return api.get(`${ENDPOINTS.TRANSACTIONS.SUMMARY}?${query.toString()}`);
};

/** Records a payment and reserves the next receipt number. */
export const recordIncome = async (data) => {
    return api.post(ENDPOINTS.TRANSACTIONS.INCOME, data);
};

export const recordExpense = async (data) => {
    return api.post(ENDPOINTS.TRANSACTIONS.EXPENSE, data);
};

export const updateTransaction = async (id, data) => {
    return api.put(ENDPOINTS.TRANSACTIONS.BY_ID(id), data);
};

/** Soft-cancels the entry; receipt numbers are never reused. */
export const cancelTransaction = async (id) => {
    return api.delete(ENDPOINTS.TRANSACTIONS.BY_ID(id));
};

export const getReceipt = async (id) => {
    return api.get(ENDPOINTS.TRANSACTIONS.RECEIPT(id));
};

export default {
    searchTransactions,
    getCashFlowSummary,
    recordIncome,
    recordExpense,
    updateTransaction,
    cancelTransaction,
    getReceipt,
};

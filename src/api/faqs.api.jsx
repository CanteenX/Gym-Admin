/**
 * FAQs API Service
 * Handles all FAQ Category and FAQ Master API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ============ FAQ CATEGORY OPERATIONS ============
export const createFaqCategory = async (data) => {
    return api.post(ENDPOINTS.FAQ_CATEGORIES.BASE, data);
};

export const updateFaqCategory = async (id, data) => {
    return api.put(ENDPOINTS.FAQ_CATEGORIES.BY_ID(id), data);
};

export const deleteFaqCategory = async (id) => {
    return api.delete(ENDPOINTS.FAQ_CATEGORIES.BY_ID(id));
};

export const listAllFaqCategories = async () => {
    return api.get(ENDPOINTS.FAQ_CATEGORIES.LIST_ALL);
};

export const searchFaqCategories = async (params) => {
    return api.post(ENDPOINTS.FAQ_CATEGORIES.SEARCH, params);
};

// ============ FAQ OPERATIONS ============
export const createFaq = async (data) => {
    return api.post(ENDPOINTS.FAQS.BASE, data);
};

export const updateFaq = async (id, data) => {
    return api.put(ENDPOINTS.FAQS.BY_ID(id), data);
};

export const deleteFaq = async (id) => {
    return api.delete(ENDPOINTS.FAQS.BY_ID(id));
};

export const searchFaqs = async (params) => {
    return api.post(ENDPOINTS.FAQS.SEARCH, params);
};

export default {
    createFaqCategory,
    updateFaqCategory,
    deleteFaqCategory,
    listAllFaqCategories,
    searchFaqCategories,
    createFaq,
    updateFaq,
    deleteFaq,
    searchFaqs,
};

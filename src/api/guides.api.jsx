/**
 * Guides API Service
 * Handles all Help and Guide API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createGuide = async (formData) => {
    // Check if it's FormData, otherwise send as JSON
    const isFormData = formData instanceof FormData;
    return api.post(ENDPOINTS.GUIDES.BASE, formData, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
};

export const getGuideById = async (id) => {
    return api.get(ENDPOINTS.GUIDES.BY_ID(id));
};

export const updateGuide = async (id, formData) => {
    const isFormData = formData instanceof FormData;
    return api.put(ENDPOINTS.GUIDES.BY_ID(id), formData, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
};

export const deleteGuide = async (id) => {
    return api.delete(ENDPOINTS.GUIDES.BY_ID(id));
};

export const searchGuides = async (params) => {
    return api.post(ENDPOINTS.GUIDES.SEARCH, params);
};

export default {
    createGuide,
    getGuideById,
    updateGuide,
    deleteGuide,
    searchGuides,
};

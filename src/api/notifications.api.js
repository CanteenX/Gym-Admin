import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Fetch audience counts for tabs (Total, Paid, Push Subscribers).
 */
export const getAudienceCounts = async () => {
    return api.get(ENDPOINTS.NOTIFICATIONS.AUDIENCE_COUNTS);
};

/**
 * Autocomplete / live search members for "A specific user" tab.
 */
export const searchMembersForNotification = async (query) => {
    return api.get(`${ENDPOINTS.NOTIFICATIONS.SEARCH_MEMBERS}?q=${encodeURIComponent(query)}`);
};

/**
 * Dispatch custom notification to target audience.
 */
export const sendCustomNotification = async (payload) => {
    return api.post(ENDPOINTS.NOTIFICATIONS.SEND, payload);
};

/**
 * Fetch delivery history table.
 */
export const getNotificationHistory = async (page = 1, limit = 20) => {
    return api.get(`${ENDPOINTS.NOTIFICATIONS.HISTORY}?page=${page}&limit=${limit}`);
};

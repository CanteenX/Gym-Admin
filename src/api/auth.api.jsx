/**
 * Auth API Service
 * Handles all authentication-related API calls
 * 
 * Uses cookie-based session authentication (express-session)
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Company login
 * @param {Object} credentials - { email, password, locationConsent, ipConsent, clientIP, clientLatitude, clientLongitude }
 * @param {Object} customHeaders - Custom headers with client location info
 * @returns {Promise}
 */
export const loginCompany = async (credentials, customHeaders = {}) => {
    return api.post(ENDPOINTS.AUTH.COMPANY_LOGIN, credentials, {
        headers: {
            ...customHeaders,
        },
        validateStatus: function (status) {
            // Accept all 2xx, 4xx for proper handling of login attempts
            return (status >= 200 && status < 300) || (status >= 400 && status < 500);
        },
    });
};

/**
 * Employee login
 * @param {Object} credentials - { email, password }
 * @returns {Promise}
 */
export const loginEmployee = async (credentials) => {
    return api.post(ENDPOINTS.AUTH.EMPLOYEE_LOGIN, credentials);
};

/**
 * Get current logged-in user
 * @returns {Promise}
 */
export const getCurrentUser = async () => {
    return api.get(ENDPOINTS.AUTH.ME);
};

/**
 * Verify if session is valid
 * @returns {Promise}
 */
export const verifySession = async () => {
    return api.get(ENDPOINTS.AUTH.VERIFY_SESSION);
};

/**
 * Send OTP for password reset
 * @param {Object} data - { email }
 * @returns {Promise}
 */
export const sendOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_SEND, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Verify OTP
 * @param {Object} data - { email, otp }
 * @returns {Promise}
 */
export const verifyOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_VERIFY, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Reset password with OTP
 * @param {Object} data - { email, otp, newPassword }
 * @returns {Promise}
 */
export const resetPassword = async (data) => {
    return api.post(ENDPOINTS.AUTH.PASSWORD_RESET, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Logout - invalidates session on server and clears local storage
 */
export const logout = async () => {
    try {
        // Call server to invalidate session (cookie will be cleared by server)
        await api.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
        console.error("Logout API error:", error);
    } finally {
        // Always clear local storage regardless of API result
        localStorage.removeItem("role");
        globalThis.location.href = "/";
    }
};

export default {
    loginCompany,
    loginEmployee,
    getCurrentUser,
    sendOtp,
    verifyOtp,
    resetPassword,
    logout,
};

/**
 * Get login attempt status by email
 * @param {Object} data - { email }
 * @returns {Promise}
 */
export const getLoginStatusByEmail = async (email) => {
    return api.post(ENDPOINTS.AUTH.LOGIN_STATUS_BY_EMAIL, { email }, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Employees API Service
 * Handles all employee-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create a new employee
 * @param {Object} data - Employee data
 * @returns {Promise}
 */
export const createEmployee = async (data) => {
    return api.post(ENDPOINTS.EMPLOYEES.BASE, data);
};

/**
 * Get all employees
 * @returns {Promise}
 */
export const getAllEmployees = async () => {
    return api.get(ENDPOINTS.EMPLOYEES.BASE);
};

/**
 * Get employee by ID
 * @param {string} id - Employee ID
 * @returns {Promise}
 */
export const getEmployeeById = async (id) => {
    return api.get(ENDPOINTS.EMPLOYEES.BY_ID(id));
};

/**
 * Update employee
 * @param {string} id - Employee ID
 * @param {Object} data - Updated employee data
 * @returns {Promise}
 */
export const updateEmployee = async (id, data) => {
    return api.put(ENDPOINTS.EMPLOYEES.BY_ID(id), data);
};

/**
 * Delete employee
 * @param {string} id - Employee ID
 * @returns {Promise}
 */
export const deleteEmployee = async (id) => {
    return api.delete(ENDPOINTS.EMPLOYEES.BY_ID(id));
};

/**
 * Search employees with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchEmployees = async (params) => {
    return api.post(ENDPOINTS.EMPLOYEES.SEARCH, params);
};

/**
 * Reset employee password
 * @param {string} id - Employee ID
 * @param {Object} data - New password data
 * @returns {Promise}
 */
export const resetEmployeePassword = async (id, data) => {
    return api.post(ENDPOINTS.EMPLOYEES.RESET_PASSWORD(id), data);
};

export default {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    resetEmployeePassword,
};

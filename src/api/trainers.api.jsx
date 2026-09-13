/**
 * Trainers API Service
 * Gym trainers and their member rosters.
 *
 * The roster is derived from Member.trainerId on the server — assigning and
 * unassigning here writes that same field.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createTrainer = async (data) => {
    return api.post(ENDPOINTS.TRAINERS.BASE, data);
};

export const updateTrainer = async (id, data) => {
    return api.put(ENDPOINTS.TRAINERS.BY_ID(id), data);
};

export const deleteTrainer = async (id) => {
    return api.delete(ENDPOINTS.TRAINERS.BY_ID(id));
};

export const searchTrainers = async (params) => {
    return api.post(ENDPOINTS.TRAINERS.SEARCH, params);
};

/** Active trainers, name + branch only — for dropdowns. */
export const listAllTrainers = async () => {
    return api.get(ENDPOINTS.TRAINERS.LIST_ALL);
};

export const getTrainerMembers = async (id) => {
    return api.get(ENDPOINTS.TRAINERS.MEMBERS(id));
};

export const assignMembersToTrainer = async (id, memberIds) => {
    return api.post(ENDPOINTS.TRAINERS.ASSIGN_MEMBERS(id), { memberIds });
};

export const unassignMemberFromTrainer = async (id, memberId) => {
    return api.delete(ENDPOINTS.TRAINERS.UNASSIGN_MEMBER(id, memberId));
};

export const listUnassignedMembers = async (params = {}) => {
    return api.post(ENDPOINTS.TRAINERS.UNASSIGNED_MEMBERS, params);
};

/**
 * ============================================================================
 * PORTAL CREDENTIALS — the exact mirror of members.api.jsx, one noun along.
 * ============================================================================
 * Phase 3 gave trainers a portal login so a trainer shift can be attached to
 * something (`Attendance.subjectType === "TRAINER"`). Credentials are set
 * through these two endpoints and NEVER as part of the trainer payload, for
 * the same reason as members: a password must not be changeable by accident
 * while somebody edits a phone number.
 *
 * Portal users — members and trainers alike — authenticate with a JWT signed
 * by MEMBER_JWT_SECRET_KEY. Staff use an express-session cookie. The two key
 * sets stay distinct, which is why there is no shared "set password" helper
 * that could ever be pointed at an Employee.
 *
 * Both routes require a staff session server-side. That is not incidental:
 * they WRITE a password, so an unguarded one is account takeover for anyone
 * who can guess an _id — which is exactly how the member equivalents shipped
 * before it was caught.
 */

/**
 * Enable trainer-portal access by setting their first password.
 * The trainer is asked to change it on first login.
 *
 * @param {string} id
 * @param {string} password minimum 6 characters (enforced server-side too)
 * @param {string} [loginId] blank clears it and falls back to the mobile number
 */
export const setTrainerPassword = async (id, password, loginId) => {
    return api.put(ENDPOINTS.TRAINERS.SET_PASSWORD(id), { password, loginId });
};

/** Remove portal access without deleting the trainer or their roster. */
export const revokeTrainerPortalAccess = async (id) => {
    return api.delete(ENDPOINTS.TRAINERS.REVOKE_PORTAL(id));
};

export default {
    createTrainer,
    updateTrainer,
    deleteTrainer,
    searchTrainers,
    listAllTrainers,
    getTrainerMembers,
    assignMembersToTrainer,
    unassignMemberFromTrainer,
    listUnassignedMembers,
    setTrainerPassword,
    revokeTrainerPortalAccess,
};

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
};

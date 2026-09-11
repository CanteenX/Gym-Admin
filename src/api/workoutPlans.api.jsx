/**
 * Workout Plans API Service
 * The exercise plan master behind the member workout schedule — one shared
 * gym default plan (Day 1..Day 6) plus any number of alternative plans that
 * staff can assign to individual members.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/** All plans, each with its embedded days/exercises. */
export const listWorkoutPlans = async () => {
    return api.get(ENDPOINTS.WORKOUT_PLANS.BASE);
};

/** A single plan with its full day + exercise detail, for the editor. */
export const getWorkoutPlanById = async (id) => {
    return api.get(ENDPOINTS.WORKOUT_PLANS.BY_ID(id));
};

export const createWorkoutPlan = async (data) => {
    return api.post(ENDPOINTS.WORKOUT_PLANS.BASE, data);
};

/** Full replacement of the plan, days included. */
export const updateWorkoutPlan = async (id, data) => {
    return api.put(ENDPOINTS.WORKOUT_PLANS.BY_ID(id), data);
};

/**
 * Delete a plan. The server refuses with a 400 when the plan is the gym
 * default or still has members assigned — surface its message verbatim.
 */
export const deleteWorkoutPlan = async (id) => {
    return api.delete(ENDPOINTS.WORKOUT_PLANS.BY_ID(id));
};

/**
 * Point a member at a specific plan.
 * @param {string|null} workoutPlanId - null resets the member to the gym default.
 */
export const assignMemberWorkoutPlan = async (memberId, workoutPlanId) => {
    return api.put(ENDPOINTS.MEMBERS.WORKOUT_PLAN(memberId), { workoutPlanId });
};

export default {
    listWorkoutPlans,
    getWorkoutPlanById,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    assignMemberWorkoutPlan,
};

/**
 * Holiday Master API Service
 * The days (and runs of days) the gym is CLOSED.
 *
 * `endDate: null` is a single-day holiday; `endDate` set is an INCLUSIVE range
 * — a three-day Diwali closure is ONE row, not three. Never expand a range
 * into separate rows on the way in; the calendar expands it on the way out.
 *
 * `branch: null` means ALL branches, the same sentinel Employee.branch uses.
 * It is NOT "unknown" and must never be rendered as blank. A branch admin does
 * not get to choose: the server files their holiday under their own branch and
 * ignores whatever `branch` the body carries, so the picker is only shown to a
 * super admin (see pages/Master/HolidayMaster.jsx).
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Paged list, house `…-by-params` convention.
 *
 * @param {object} params - { skip, per_page, match, sorton, sortdir, from, to,
 *   branch, isActive }. `sorton` is one of date|title|branch|createdAt and
 *   anything else falls back to `date` server-side.
 *
 * `from`/`to` filter by OVERLAP, not by start date — a closure that began
 * before `from` and is still running is still returned. That is the whole
 * point of the range filter and the reason a plain date-between query was not
 * used.
 */
export const searchHolidays = async (params) => {
    return api.post(ENDPOINTS.HOLIDAYS.SEARCH, params);
};

/**
 * One month's ACTIVE holidays, for a calendar grid.
 *
 * Returns `{ year, month, from, to, holidays }` — note `from`/`to` widen past
 * the month itself so a range straddling the boundary comes back whole.
 * Deactivated holidays are excluded server-side, which is why the calendar
 * never needs an isActive filter of its own.
 *
 * @param {{year: number, month: number, branch?: string}} params - `month` is
 *   1-12, NOT a JS month index. Passing `getMonth()` silently shows the wrong
 *   month.
 */
export const getHolidayCalendar = async ({ year, month, branch }) => {
    return api.get(ENDPOINTS.HOLIDAYS.CALENDAR, {
        params: branch ? { year, month, branch } : { year, month },
    });
};

export const createHoliday = async (data) => {
    return api.post(ENDPOINTS.HOLIDAYS.BASE, data);
};

export const updateHoliday = async (id, data) => {
    return api.put(ENDPOINTS.HOLIDAYS.BY_ID(id), data);
};

export const deleteHoliday = async (id) => {
    return api.delete(ENDPOINTS.HOLIDAYS.BY_ID(id));
};

export default {
    searchHolidays,
    getHolidayCalendar,
    createHoliday,
    updateHoliday,
    deleteHoliday,
};

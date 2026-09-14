import { adLiveState } from "../adLiveState";

/**
 * What a notice is actually doing right now, as something the list can draw.
 *
 * THIS IS THE SCREEN'S WHOLE REASON FOR EXISTING, so it gets its own file. The
 * incident: the owner set a start and an end two minutes apart, the notice did
 * exactly what it was told and expired before they went to look at the site,
 * and it was reported as broken software. Nothing was broken — the panel simply
 * never said "expired" anywhere, so the only way to find out was to go hunting
 * on the website and guess.
 *
 * `isActive` is NOT the answer and treating it as one is the bug: a notice can
 * be ticked active and still be invisible because its window has not opened yet
 * or has already closed.
 *
 * WHERE THE VERDICT COMES FROM, and why there are two paths:
 *
 *   A SAVED ROW carries `status` from the server, derived by
 *   Gym-Server/models/liveWindow.js — the SAME expression the public endpoint
 *   filters on. Trusting it means the badge cannot drift from what the website
 *   is really serving, even if the two clocks disagree by a few seconds, which
 *   is precisely the disagreement that would send somebody hunting again.
 *
 *   AN UNSAVED FORM has no server row yet, so the preview falls back to
 *   adLiveState() — the panel's existing client-side copy of the same rule,
 *   reused rather than re-written for the reason its own header gives. This
 *   file therefore adds NO new implementation of the window rule; it only
 *   chooses the words and the colour.
 */

/**
 * The four states liveWindow.js can return, and how each one is said.
 *
 * The COPY is notice-specific (an advert "shows on the website", a notice is
 * something "members are seeing"), which is the only reason this map is not
 * simply adLiveState's return value. Each hint answers the question the state
 * provokes — "so what do I do about it?" — because "Expired" on its own is the
 * same dead end as no badge at all.
 */
const STATE_UI = Object.freeze({
  LIVE: {
    key: "LIVE",
    label: "Live now",
    badgeClass: "bg-success",
    icon: "ri-broadcast-line",
    hint: "Members are seeing this on the website right now",
  },
  SCHEDULED: {
    key: "SCHEDULED",
    label: "Scheduled",
    badgeClass: "bg-warning text-dark",
    icon: "ri-time-line",
    hint: "Not showing yet — its start date is still in the future",
  },
  EXPIRED: {
    key: "EXPIRED",
    label: "Expired",
    badgeClass: "bg-danger",
    icon: "ri-calendar-close-line",
    hint: "Its end date has passed, so it has stopped showing. Clear or extend the end date to bring it back",
  },
  INACTIVE: {
    key: "INACTIVE",
    label: "Switched off",
    badgeClass: "bg-secondary",
    icon: "ri-close-circle-line",
    hint: "Switched off by hand — tick Active to show it again",
  },
});

/**
 * Presentation for a status string on its own, for callers that already have
 * one (a filter chip, a legend) and no row to go with it.
 *
 * @param {string} status LIVE | SCHEDULED | EXPIRED | INACTIVE
 * @returns {{key:string,label:string,badgeClass:string,icon:string,hint:string}|null}
 */
export const noticeStateFor = (status) =>
  STATE_UI[String(status || "").toUpperCase()] || null;

/**
 * The verdict for one row or one set of in-progress form values.
 *
 * @param {{status?:string, isActive?:boolean, startAt?:string|Date, endAt?:string|Date}} row
 * @param {number} [now] epoch ms, injectable so this is testable
 * @returns {{key:string,label:string,badgeClass:string,icon:string,hint:string}}
 */
export const noticeLiveState = (row, now = Date.now()) => {
  // A saved row: take the server's word for it (see the header).
  const fromServer = noticeStateFor(row?.status);
  if (fromServer) return fromServer;

  // An unsaved form: the panel's existing client-side rule decides WHICH state,
  // this file only decides how it is worded.
  const derived = adLiveState(row, now);
  return STATE_UI[derived.key] || STATE_UI.INACTIVE;
};

export default noticeLiveState;

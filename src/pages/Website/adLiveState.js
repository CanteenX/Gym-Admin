/**
 * Resolves what an advert is actually doing right now.
 *
 * `isActive` alone is not the answer and treating it as one is the bug this
 * exists to prevent: an advert can be ticked active and still be invisible on
 * the site because its window has not opened yet or has already closed. The
 * public GET /site/ads applies all three conditions, so the panel has to show
 * the same verdict or staff will keep re-saving an advert that was never going
 * to render.
 *
 * Live means: isActive AND (no startAt or startAt <= now) AND
 * (no endAt or endAt >= now).
 *
 * @param {{ isActive?: boolean, startAt?: string|Date, endAt?: string|Date }} ad
 * @param {number} [now] - epoch ms, injectable so this is testable
 * @returns {{ key: string, label: string, badgeClass: string, icon: string, hint: string }}
 */
export const adLiveState = (ad, now = Date.now()) => {
  const time = (value) => {
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  };

  if (!ad?.isActive) {
    return {
      key: "INACTIVE",
      label: "Inactive",
      badgeClass: "bg-secondary",
      icon: "ri-close-circle-line",
      hint: "Switched off — not shown on the website",
    };
  }

  const start = time(ad.startAt);
  const end = time(ad.endAt);

  if (start !== null && start > now) {
    return {
      key: "SCHEDULED",
      label: "Scheduled",
      badgeClass: "bg-warning text-dark",
      icon: "ri-time-line",
      hint: "Active, but its start date is in the future",
    };
  }

  if (end !== null && end < now) {
    return {
      key: "EXPIRED",
      label: "Expired",
      badgeClass: "bg-danger",
      icon: "ri-close-circle-line",
      hint: "Active, but its end date has passed",
    };
  }

  return {
    key: "LIVE",
    label: "Live now",
    badgeClass: "bg-success",
    icon: "ri-broadcast-line",
    hint: "Showing on the website right now",
  };
};

export default adLiveState;

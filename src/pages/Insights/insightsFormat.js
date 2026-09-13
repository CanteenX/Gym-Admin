/**
 * Formatting and theming helpers shared by the three Insights screens.
 *
 * Kept out of the page files so the numbers on the attendance screen, the
 * reports and the CSV previews cannot drift into three different renderings of
 * the same rupee value.
 */
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

export const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** Compact rupees for a chart axis, where a full number will not fit. */
export const currencyAxis = (n) => {
  const value = Number(n || 0);
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
};

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

/** Short day label for a footfall axis: "12 Sep". */
export const formatDayShort = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

/** A date input wants yyyy-mm-dd in LOCAL time, not a UTC slice of an instant. */
export const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysAgoInput = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
};

export const minutesLabel = (minutes) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/**
 * Chart colours, resolved from the theme's CSS custom properties at call time.
 *
 * NOT hex literals. `getChartColorsArray` reads the `--vz-*` custom properties
 * off :root, which is where the Bootstrap theme publishes every palette colour,
 * so a re-theme moves the charts with it instead of leaving two hardcoded blues
 * behind. Resolved lazily rather than at module scope because the stylesheet is
 * not guaranteed to have been applied when this module is first imported.
 */
export const chartTokens = () => {
  const resolved = getChartColorsArray(
    JSON.stringify([
      "--vz-primary",
      "--vz-success",
      "--vz-danger",
      "--vz-warning",
      "--vz-info",
      "--vz-border-color",
    ]),
  );
  /**
   * getChartColorsArray hands the token name BACK when the property does not
   * resolve (a stylesheet not applied yet, a renamed variable). "--vz-primary"
   * is not a colour, so an SVG fill set to it silently paints nothing — a chart
   * with invisible bars and no error anywhere. currentColor is the safe
   * fallback: it inherits the card's text colour, which is still a theme value
   * rather than a literal.
   */
  const safe = resolved.map((c) =>
    typeof c === "string" && c && !c.startsWith("--") ? c : "currentColor",
  );
  const [primary, success, danger, warning, info, grid] = safe;
  return { primary, success, danger, warning, info, grid };
};

/** Stable colour per branch, drawn from the theme palette in a fixed order. */
export const branchColor = (index) => {
  const t = chartTokens();
  const wheel = [t.primary, t.success, t.warning, t.info, t.danger];
  return wheel[index % wheel.length];
};

export default {
  currency,
  currencyAxis,
  formatDate,
  formatDateTime,
  formatTime,
  formatDayShort,
  toInputDate,
  daysAgoInput,
  minutesLabel,
  chartTokens,
  branchColor,
};

import PropTypes from "prop-types";
import { absoluteUrlFor, normaliseSlug } from "./seoRules";

/**
 * Google truncates by rendered width, and the width available differs per
 * device - which is the whole reason this preview has a toggle. A title that
 * fits the desktop result can still be cut on a phone, and the description is
 * cut far harder there. Showing only one of the two (as the screen this is
 * modelled on does) hides half the problem.
 *
 * These are character proxies for those widths, the same proxies the counters
 * use, not a pixel-accurate simulation.
 */
const VIEWS = {
  desktop: { titleChars: 60, descChars: 160, frame: 600, label: "Desktop" },
  mobile: { titleChars: 50, descChars: 120, frame: 360, label: "Mobile" },
};

const truncate = (value, max) => {
  const raw = String(value || "");
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
};

const GooglePreview = ({ values, view, onViewChange }) => {
  const cfg = VIEWS[view] || VIEWS.desktop;
  const url = absoluteUrlFor(values.slug) || "https://example.com/";
  const crumbs = normaliseSlug(values.slug)
    .split("/")
    .filter(Boolean)
    .join(" › ");
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // absoluteUrlFor built this, but a malformed slug must not blank the pane.
    host = url;
  }

  const title =
    truncate(values.metaTitle, cfg.titleChars) ||
    truncate(values.pageTitle, cfg.titleChars) ||
    "Untitled page";
  const description =
    truncate(values.metaDescription, cfg.descChars) ||
    "No meta description yet - Google will pull a sentence from the page instead.";

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h6 className="mb-0">Google result</h6>
        <div
          className="btn-group btn-group-sm"
          role="group"
          aria-label="Preview device"
        >
          {Object.entries(VIEWS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`btn ${view === key ? "btn-success" : "btn-light"}`}
              aria-pressed={view === key}
              onClick={() => onViewChange(key)}
            >
              <i
                className={
                  key === "mobile" ? "ri-smartphone-line" : "ri-computer-line"
                }
                aria-hidden="true"
              ></i>{" "}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="border rounded p-3 bg-light"
        style={{ maxWidth: `${cfg.frame}px` }}
      >
        <div className="d-flex align-items-center gap-2 mb-1">
          <span
            className="d-inline-flex align-items-center justify-content-center bg-white border rounded-circle"
            style={{ width: 26, height: 26 }}
            aria-hidden="true"
          >
            <i className={values.icon || "ri-global-line"}></i>
          </span>
          <span className="small text-body text-break">
            {host}
            {crumbs ? ` › ${crumbs}` : ""}
          </span>
        </div>
        <p
          className="mb-1 text-primary text-wrap"
          style={{ fontSize: view === "mobile" ? "1rem" : "1.1rem" }}
        >
          {title}
        </p>
        <p className="mb-0 small text-body text-wrap">{description}</p>
        {values.noIndex ? (
          <p className="mb-0 mt-2 small text-danger fw-semibold">
            <i className="ri-eye-off-line" aria-hidden="true"></i> Hidden from
            search - this result will not appear at all.
          </p>
        ) : null}
      </div>
      <small className="text-muted">
        Cut at {cfg.titleChars} characters of title and {cfg.descChars} of
        description, the {cfg.label.toLowerCase()} limits.
      </small>
    </div>
  );
};

GooglePreview.propTypes = {
  values: PropTypes.object.isRequired,
  view: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
  onViewChange: PropTypes.func.isRequired,
};

export default GooglePreview;

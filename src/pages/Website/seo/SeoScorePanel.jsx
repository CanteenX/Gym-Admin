import PropTypes from "prop-types";
import { evaluateSeo } from "./seoRules";

/**
 * Moves focus to the field a rule is complaining about.
 *
 * Takes an element id rather than a ref so the rules stay pure data - a rule
 * knows the id of the control it judges and nothing else about React. When the
 * id belongs to a wrapper (the icon picker is a dropdown, not an input) the
 * first focusable descendant is used instead, so the click still lands
 * somewhere usable rather than doing nothing.
 */
const FOCUSABLE = "input, textarea, select, button, [tabindex]";

const focusField = (id) => {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const target = el.matches(FOCUSABLE) ? el : el.querySelector(FOCUSABLE);
  (target || el).scrollIntoView({ behavior: "smooth", block: "center" });
  if (target) target.focus({ preventScroll: true });
};

const statusOf = (rule) => {
  if (rule.passed) {
    return { word: "Pass", icon: "ri-checkbox-circle-line", tone: "text-success" };
  }
  if (rule.soft) {
    return { word: "Tip", icon: "ri-error-warning-line", tone: "text-warning" };
  }
  return { word: "Fix", icon: "ri-close-circle-line", tone: "text-danger" };
};

/**
 * SEO score plus the checklist that explains it.
 *
 * Every rule is a button: clicking it jumps to the field that would fix it.
 * A checklist you cannot act on just makes you hunt for the field yourself,
 * which is exactly how a score gets ignored.
 */
const SeoScorePanel = ({ values }) => {
  const { rules, score, band, hidden, passedCount, totalCount } =
    evaluateSeo(values);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
        <h6 className="mb-0">SEO score</h6>
        <span className={`badge bg-${band.tone}`}>
          {score}/100 &middot; {band.label}
        </span>
      </div>
      <div
        className="progress mb-2"
        style={{ height: "6px" }}
        aria-hidden="true"
      >
        <div
          className={`progress-bar bg-${band.tone}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-muted small mb-2">
        {passedCount} of {totalCount} checks pass.{" "}
        {hidden
          ? "This page is hidden from search, so only the checks that still matter are listed."
          : "Click a check to jump straight to the field it is about."}
      </p>

      <ul className="list-group list-group-flush">
        {rules.map((rule) => {
          const status = statusOf(rule);
          return (
            <li className="list-group-item px-0 py-1" key={rule.id}>
              <button
                type="button"
                className="btn btn-link text-decoration-none text-start p-0 w-100"
                onClick={() => focusField(rule.targetId)}
              >
                <span className="d-flex align-items-start gap-2">
                  <i
                    className={`${status.icon} ${status.tone} mt-1`}
                    aria-hidden="true"
                  ></i>
                  <span className="flex-grow-1">
                    <span className="d-block text-body text-wrap">
                      {rule.label}
                    </span>
                    <span className="d-block small text-muted text-wrap">
                      {rule.detail}
                    </span>
                  </span>
                  <span className={`small fw-semibold ${status.tone}`}>
                    {status.word}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

SeoScorePanel.propTypes = {
  values: PropTypes.object.isRequired,
};

export default SeoScorePanel;

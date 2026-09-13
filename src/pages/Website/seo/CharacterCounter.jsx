import PropTypes from "prop-types";
import { counterState } from "./seoRules";

/**
 * Live character counter for a length-limited SEO field.
 *
 * Three things it does that a plain "fills up" bar does not:
 *  - it names its state in WORDS ("Good" / "Getting long" / "Too long"), so the
 *    warning survives greyscale, a colour vision deficiency and a screenshot;
 *  - it turns amber BEFORE the limit, not at it - at 75/60 a bar that merely
 *    fills has already stopped telling you anything;
 *  - it is wired to the input with aria-describedby and announced politely, so
 *    a screen reader user hears "Too long" rather than seeing nothing at all.
 *
 * `id` must be `${inputId}-counter` so the input can point at it.
 */
const CharacterCounter = ({ inputId, value, limit }) => {
  const state = counterState(value, limit);
  const pct = Math.min(100, Math.round((state.count / limit) * 100));

  return (
    <div className="mt-1">
      <div
        className="progress"
        style={{ height: "4px" }}
        // Decorative: the same information is in the text below, which is what
        // assistive technology reads.
        aria-hidden="true"
      >
        <div
          className={`progress-bar ${state.bar}`}
          style={{ width: `${pct}%` }}
        ></div>
      </div>
      <div
        id={`${inputId}-counter`}
        className="d-flex flex-wrap justify-content-between gap-1 mt-1"
        aria-live="polite"
      >
        <small className={`${state.tone} fw-semibold`}>
          {state.count} / {limit} characters &middot; {state.label}
        </small>
        {state.hint ? (
          <small className={`${state.tone} text-wrap`}>{state.hint}</small>
        ) : null}
      </div>
    </div>
  );
};

CharacterCounter.propTypes = {
  inputId: PropTypes.string.isRequired,
  value: PropTypes.string,
  limit: PropTypes.number.isRequired,
};

export default CharacterCounter;

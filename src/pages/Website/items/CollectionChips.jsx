import PropTypes from "prop-types";
import { COLLECTION_HINTS } from "./itemSpecs";

/**
 * The list picker: one chip per collection with its row count, the one-line
 * description of the list being browsed, and — only where the collection's
 * spec supports it — the grid/table switch.
 *
 * Chips rather than a dropdown because the counts are half the information: a
 * list that should hold 24 rows and shows 23 is a hole in the published
 * timetable, and that has to be visible without opening anything.
 *
 * They are <button aria-pressed> rather than links: this filters what is on
 * screen, it does not navigate, and a chip that lies about being a link breaks
 * middle-click and the back button.
 */
const CollectionChips = ({
  chips,
  activeKey,
  gridAvailable,
  view,
  onSelect,
  onViewChange,
}) => (
  <>
    <div
      className="d-flex flex-wrap gap-1 mb-2"
      role="group"
      aria-label="Choose a website list"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={`btn btn-sm ${
            activeKey === chip.key ? "btn-success" : "btn-light"
          }`}
          aria-pressed={activeKey === chip.key}
          onClick={() => onSelect(chip.key)}
        >
          {chip.label}{" "}
          <span className="badge bg-light text-body ms-1">{chip.count}</span>
        </button>
      ))}
    </div>

    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <small className="text-muted">
        {COLLECTION_HINTS[activeKey] ||
          "Rows of this list, in the order the website prints them."}
      </small>
      {gridAvailable ? (
        <div
          className="btn-group btn-group-sm"
          role="group"
          aria-label="Choose how to view this list"
        >
          <button
            type="button"
            className={`btn ${view === "grid" ? "btn-success" : "btn-light"}`}
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
          >
            <i className="ri-layout-grid-line" aria-hidden="true"></i> Grid
          </button>
          <button
            type="button"
            className={`btn ${view === "table" ? "btn-success" : "btn-light"}`}
            aria-pressed={view === "table"}
            onClick={() => onViewChange("table")}
          >
            <i className="ri-list-unordered" aria-hidden="true"></i> Table
          </button>
        </div>
      ) : null}
    </div>
  </>
);

CollectionChips.propTypes = {
  chips: PropTypes.array.isRequired,
  activeKey: PropTypes.string.isRequired,
  gridAvailable: PropTypes.bool,
  view: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onViewChange: PropTypes.func.isRequired,
};

export default CollectionChips;

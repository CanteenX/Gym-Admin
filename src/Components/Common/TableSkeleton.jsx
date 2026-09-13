import React from "react";
import PropTypes from "prop-types";

/**
 * Shimmering placeholder rows shown while a table's data is in flight.
 *
 * This exists because react-data-table-component's own `progressComponent`
 * default is a bare `<div style="font-size:24px;font-weight:700">Loading...</div>`
 * (see node_modules/react-data-table-component/dist/*). Two things are wrong
 * with it on a real screen:
 *   1. Big bold text where rows were reads as an error state, not as progress.
 *   2. It collapses the table to a single line, so the whole page jumps when
 *      the rows finally land.
 * Bars of roughly the right shape hold the layout still and read as "content
 * is on its way", which is what the owner actually asked for.
 *
 * Accessibility: the bars are pure decoration, so the block that holds them is
 * `aria-hidden`. A screen reader reciting a wall of empty boxes is strictly
 * worse than silence. The single visually-hidden `role="status"` line is the
 * only thing announced, and it is what gives this component its accessible
 * name - the browser a11y gate in scripts/e2e/gate.mjs fails unnamed controls,
 * and also skips contrast sampling inside `[aria-hidden=true]`, which is the
 * correct outcome for low-opacity decorative bars.
 *
 * Colour comes from Bootstrap's own `.placeholder` (currentColor at reduced
 * opacity) and the shimmer from `.placeholder-glow`, so there is no colour
 * literal here and it follows the theme - including dark mode - for free.
 */

/**
 * Cycled so the bars are not all the same length; a uniform grid of identical
 * blocks looks like a rendering bug rather than like text. Bootstrap width
 * utilities, so no inline sizing and nothing to keep in sync with the palette.
 */
const CELL_WIDTHS = ["w-75", "w-50", "w-100", "w-50", "w-75", "w-100"];

const TableSkeleton = ({
  rows = 5,
  columns = 5,
  label = "Loading",
  header = true,
}) => {
  const rowIndexes = Array.from({ length: Math.max(1, rows) }, (_, i) => i);
  const columnIndexes = Array.from({ length: Math.max(1, columns) }, (_, i) => i);

  return (
    <div className="w-100 px-3 py-2 placeholder-glow">
      {/* The only thing a screen reader hears, and the accessible name. */}
      <span className="visually-hidden" role="status">
        {label}
      </span>

      <div aria-hidden="true">
        {/* Header bar, so the skeleton reads as a table and not as a list.
            Off for stacked card lists, which have no column headings to echo. */}
        {header && (
          <div className="d-flex align-items-center gap-3 py-2 border-bottom">
            {columnIndexes.map((col) => (
              <div className="flex-fill" key={`head-${col}`}>
                <span
                  className={`placeholder rounded ${CELL_WIDTHS[col % CELL_WIDTHS.length]}`}
                />
              </div>
            ))}
          </div>
        )}

        {rowIndexes.map((row) => (
          <div
            className="d-flex align-items-center gap-3 py-3 border-bottom"
            key={`row-${row}`}
          >
            {columnIndexes.map((col) => (
              <div className="flex-fill" key={`cell-${row}-${col}`}>
                <span
                  className={`placeholder rounded ${
                    CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

TableSkeleton.propTypes = {
  /** How many placeholder rows to draw. Keep it close to the real page size. */
  rows: PropTypes.number,
  /** How many placeholder cells per row. Usually the real column count. */
  columns: PropTypes.number,
  /** Announced to assistive tech. Kept generic so no screen copy changes. */
  label: PropTypes.string,
  /** Draw the column-heading bar. Off for stacked card lists. */
  header: PropTypes.bool,
};

export default TableSkeleton;

import PropTypes from "prop-types";
import React from "react";
import { Table } from "reactstrap";

/**
 * The text alternative for a chart.
 *
 * ============================================================================
 * WHY EVERY CHART ON THESE SCREENS IS PAIRED WITH ONE OF THESE
 * ============================================================================
 * Recharts renders to SVG inside a sized <div>. To a screen reader that is a
 * decorative blob: the axis ticks are <text> nodes with no reading order, the
 * series are paths, and the numbers a sighted user reads off the bars exist
 * nowhere as prose. A canvas-based chart is worse still — literally a bitmap.
 *
 * So the figures are ALSO published as a real table. It is inside a <details>
 * rather than `.visually-hidden` for two reasons: a closed <details> is
 * `display: none`, so its contents cannot be measured as page content by the
 * browser gate or read twice by a screen reader; and it is genuinely useful to
 * a sighted user who wants the exact number rather than a bar's height.
 *
 * Pair this with `role="img"` + `aria-label` on the chart wrapper itself
 * (see the callers) so the chart announces a one-line summary and the table
 * carries the detail.
 */
const ChartDataTable = ({ caption, columns, rows, summaryLabel, emptyText }) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <details className="mt-2">
      <summary className="text-muted small" style={{ cursor: "pointer" }}>
        {summaryLabel || "Show the numbers behind this chart"}
      </summary>
      <div className="table-responsive mt-2">
        <Table size="sm" bordered className="mb-0 align-middle">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="small text-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-muted small">
                  {emptyText || "No data for this period."}
                </td>
              </tr>
            ) : (
              safeRows.map((row, i) => (
                <tr key={row.key || row.id || `row-${i}`}>
                  {columns.map((c, ci) =>
                    // The first column is the row's own label, so it is the
                    // row header - that is what lets a screen reader announce
                    // "March 2026, Collections, 84,000" instead of a bare
                    // number with no idea which month it belongs to.
                    ci === 0 ? (
                      <th
                        key={c.key}
                        scope="row"
                        className="small text-nowrap fw-normal"
                      >
                        {c.format ? c.format(row[c.key], row) : row[c.key]}
                      </th>
                    ) : (
                      <td key={c.key} className="small text-nowrap">
                        {c.format ? c.format(row[c.key], row) : row[c.key]}
                      </td>
                    ),
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </details>
  );
};

ChartDataTable.propTypes = {
  /** Read by a screen reader in place of the chart's title. */
  caption: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      format: PropTypes.func,
    }),
  ).isRequired,
  rows: PropTypes.array,
  summaryLabel: PropTypes.string,
  emptyText: PropTypes.string,
};

export default ChartDataTable;

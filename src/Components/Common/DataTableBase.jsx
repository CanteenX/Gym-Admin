import React from "react";
import PropTypes from "prop-types";
import DataTable from "react-data-table-component";
import TableSkeleton from "./TableSkeleton";

/**
 * Every list screen's DataTable, with one thing changed: the loading state.
 *
 * 37 screens pass `progressPending={loading}` to react-data-table-component
 * and none of them pass a `progressComponent`, so all 37 fall back to the
 * library default - a bare bold "Loading..." line. Fixing that at each call
 * site would mean 37 near-identical edits that the next new screen would
 * silently miss, so the default is corrected once, here, and the screens just
 * import this instead of the library.
 *
 * This is a pass-through in every other respect. It adds no styling, no state
 * and no behaviour; a screen that wants its own progress UI can still pass
 * `progressComponent` and win, because the caller's value is preferred below.
 */
const DataTableBase = ({ progressComponent, columns, ...rest }) => (
  <DataTable
    columns={columns}
    progressComponent={
      progressComponent ?? (
        <TableSkeleton
          /**
           * Match the real table's shape so the skeleton and the rows that
           * replace it occupy the same width. Capped because a very wide
           * table would otherwise shrink each bar to a dash.
           */
          columns={Array.isArray(columns) ? Math.min(columns.length, 6) : 5}
        />
      )
    }
    {...rest}
  />
);

DataTableBase.propTypes = {
  /** Caller-supplied progress UI. Wins over the skeleton default. */
  progressComponent: PropTypes.node,
  /** Forwarded to DataTable, and used to size the skeleton to match. */
  columns: PropTypes.array,
};

export default DataTableBase;

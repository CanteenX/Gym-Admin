import React from "react";
import {
  branchLabel,
  holidayDayCount,
  holidaySpanLabel,
} from "../../../Components/Common/holidayFormat";

/**
 * Columns for the holiday list.
 *
 * A factory rather than a constant because the Action column is built from the
 * viewer's permissions AND from whether each individual row is theirs to
 * change — neither of which a module-level array can see.
 *
 * @param {object} args
 * @param {{edit: boolean, delete: boolean}} args.permissions - menu permissions
 *   for /holiday-master, already resolved by the screen.
 * @param {(row: object) => boolean} args.canModifyRow - mirrors the server's
 *   write scoping: a branch admin may read an all-branches closure but not
 *   change one.
 * @param {(row: object) => void} args.onEdit
 * @param {(row: object) => void} args.onDelete
 */
export const buildHolidayColumns = ({
  permissions,
  canModifyRow,
  onEdit,
  onDelete,
}) => [
  {
    name: "Holiday",
    cell: (row) => (
      <div className="py-2">
        <div className="fw-semibold">{row.title}</div>
        {row.note && <div className="text-muted small">{row.note}</div>}
      </div>
    ),
    minWidth: "220px",
  },
  {
    name: "When",
    cell: (row) => {
      const days = holidayDayCount(row);
      return (
        <div className="py-2">
          {/* "12 Nov 2026" vs "12–14 Nov 2026" — the range form is the only
              thing on this row that distinguishes a one-day closure from a
              three-day one, because they are the same single record. */}
          <div>{holidaySpanLabel(row)}</div>
          {days > 1 && <div className="text-muted small">{days} days closed</div>}
        </div>
      );
    },
    minWidth: "190px",
  },
  {
    name: "Branch",
    cell: (row) => (
      // `branch: null` is ALL branches, never "unknown". Rendering it blank is
      // how a gym-wide closure gets mistaken for somebody else's problem.
      <span
        className={`badge ${row.branch ? "bg-info-subtle text-info" : "bg-primary-subtle text-primary"}`}
      >
        {branchLabel(row.branch)}
      </span>
    ),
    width: "150px",
  },
  {
    name: "Status",
    cell: (row) => (
      <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
    width: "110px",
  },
  {
    name: "Action",
    cell: (row) => {
      const mine = canModifyRow(row);
      const showEdit = permissions.edit && mine;
      const showDelete = permissions.delete && mine;

      if (!showEdit && !showDelete) {
        /**
         * Two different silences, told apart on purpose. Someone who holds no
         * edit or delete rights at all gets a dash — there is nothing to
         * explain. Someone who holds them but is looking at another branch's
         * (or an all-branches) closure gets told why the buttons are missing,
         * because otherwise the row looks broken rather than off-limits.
         */
        return (
          <span className="text-muted small py-1">
            {permissions.edit || permissions.delete ? "Other branch" : "—"}
          </span>
        );
      }

      return (
        <div className="d-flex align-items-center gap-1 py-1">
          {showEdit && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => onEdit(row)}
              aria-label={`Edit ${row.title}`}
              title="Edit"
            >
              <i className="ri-pencil-line" aria-hidden="true"></i>
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(row)}
              aria-label={`Delete ${row.title}`}
              title="Delete"
            >
              <i className="ri-delete-bin-line" aria-hidden="true"></i>
            </button>
          )}
        </div>
      );
    },
    minWidth: "140px",
  },
];

export default buildHolidayColumns;

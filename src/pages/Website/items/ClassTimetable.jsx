import { useMemo } from "react";
import PropTypes from "prop-types";

/**
 * The grid view for a list whose rows are positioned on a day and a time.
 *
 * WHY IT EXISTS: the timetable is 24 rows — one per cell of a 6-day × 4-slot
 * grid — and as a flat table it is 24 near-identical lines where the only thing
 * that distinguishes "Zumba" from "Zumba" is two words in the details column.
 * Finding the Thursday 5pm cell means reading all of them. Drawn as the grid it
 * actually is, the row you want is where your eye already is, and an empty cell
 * is a visible hole with an Add button in it rather than an absence you have to
 * notice.
 *
 * WHY IT IS STILL SPEC-DRIVEN: the axes are not hardcoded to "classes". The
 * caller offers this view when the collection's own fieldSpec declares the two
 * keys below, so a list that stops having them falls back to the table instead
 * of rendering an empty grid.
 */
export const GRID_COLUMN_KEY = "day";
export const GRID_ROW_KEY = "time";

/** True when this collection's spec can be laid out as a grid. */
export const supportsGrid = (defs) =>
  defs.some((d) => d.key === GRID_COLUMN_KEY) &&
  defs.some((d) => d.key === GRID_ROW_KEY);

/**
 * Axis values in the order the rows themselves imply.
 *
 * First appearance across rows already sorted by sortOrder — NOT alphabetical,
 * which would print Fri before Mon, and not a hardcoded weekday list, which
 * would drop a gym that opens a Sunday slot or writes "Mon — Sat" in one cell.
 */
const axisValues = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = row?.fields?.[key];
    if (!value) return acc;
    const text = String(value);
    return acc.includes(text) ? acc : [...acc, text];
  }, []);

const ClassTimetable = ({ rows, permissions, busyId, onEdit, onAdd }) => {
  const columns = useMemo(() => axisValues(rows, GRID_COLUMN_KEY), [rows]);
  const times = useMemo(() => axisValues(rows, GRID_ROW_KEY), [rows]);

  /** Rows missing either axis cannot be placed — they must still be reachable. */
  const unplaced = useMemo(
    () =>
      rows.filter(
        (row) => !row?.fields?.[GRID_COLUMN_KEY] || !row?.fields?.[GRID_ROW_KEY],
      ),
    [rows],
  );

  const cellRows = (time, day) =>
    rows.filter(
      (row) =>
        String(row?.fields?.[GRID_ROW_KEY] || "") === time &&
        String(row?.fields?.[GRID_COLUMN_KEY] || "") === day,
    );

  if (!columns.length || !times.length) {
    return (
      <p className="text-muted mb-0">
        No row carries both a day and a time yet, so there is no grid to draw.
        Switch to the table view to add the first one.
      </p>
    );
  }

  return (
    <>
      <div className="table-responsive table-card mt-1 mb-1">
        <table className="table table-bordered align-middle mb-0">
          <caption className="text-muted small px-2">
            Every cell of the published timetable. Select a class to edit it, or
            an empty cell to add one.
          </caption>
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ minWidth: 92 }}>
                Time
              </th>
              {columns.map((day) => (
                <th key={day} scope="col" style={{ minWidth: 130 }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <th scope="row" className="fw-semibold">
                  {time}
                </th>
                {columns.map((day) => {
                  const cells = cellRows(time, day);
                  if (!cells.length) {
                    return (
                      <td key={day}>
                        {permissions.write ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-light w-100"
                            onClick={() => onAdd({ day, time })}
                            aria-label={`Add a class on ${day} at ${time}`}
                            title="Add a class here"
                          >
                            <i className="ri-add-line" aria-hidden="true"></i>
                          </button>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td key={day}>
                      {cells.map((row) => (
                        <button
                          key={row._id}
                          type="button"
                          className={`btn btn-sm w-100 text-start mb-1 ${
                            row.isActive === false ? "btn-light" : "btn-soft-success"
                          }`}
                          disabled={!permissions.edit || busyId === row._id}
                          onClick={() => onEdit(row)}
                          aria-label={`Edit ${row.title} on ${day} at ${time}`}
                          title="Edit this class"
                        >
                          <span className="text-wrap">{row.title}</span>
                          {row.isActive === false ? (
                            <span className="badge bg-secondary ms-1">
                              Hidden
                            </span>
                          ) : null}
                          {row.branch ? (
                            <small className="d-block text-muted">
                              {row.branch}
                            </small>
                          ) : null}
                        </button>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unplaced.length ? (
        <div className="mt-2">
          <p className="text-muted small mb-1">
            Not on the grid — these rows are missing a day or a time:
          </p>
          <div className="d-flex flex-wrap gap-1">
            {unplaced.map((row) => (
              <button
                key={row._id}
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => onEdit(row)}
                aria-label={`Edit ${row.title}, which has no day or time`}
                title="Edit"
              >
                {row.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

ClassTimetable.propTypes = {
  rows: PropTypes.array.isRequired,
  permissions: PropTypes.object.isRequired,
  busyId: PropTypes.string,
  onEdit: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default ClassTimetable;

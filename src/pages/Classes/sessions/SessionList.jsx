import React, { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "react-data-table-component";
import {
  capacityState,
  formatDateTime,
  formatDuration,
  sessionTiming,
} from "../classesFormat";

/**
 * The class diary as a table.
 *
 * ============================================================================
 * THE ACTION BUTTONS ARE ICON-ONLY, AND THAT IS NOT A STYLE CHOICE.
 * ============================================================================
 * With text labels the SEO table ran 58px wider than its scroll container at
 * 1440px and clipped "Delete" out of view — a destructive action hidden behind
 * a horizontal scroll nobody expects. This table carries one MORE action than
 * that one (Roster), so the same three-icon layout is used, each with
 * `aria-label` + `title`: the accessible name survives and hovering still says
 * what the button does.
 *
 * `remainingCapacity` comes from the server and is rendered as received — see
 * capacityState() in ../classesFormat for why it is never recomputed here.
 */
const SessionList = ({
  rows,
  loading,
  permissions,
  totalRows,
  perPage,
  pageNo,
  onSort,
  onChangePage,
  onChangeRowsPerPage,
  onOpenRoster,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "70px",
      },
      {
        name: "Class",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 fw-semibold text-wrap">{row.title}</p>
            {row.trainer?.fullName ? (
              <small className="text-muted text-wrap d-block">
                <i className="ri-user-star-line" aria-hidden="true"></i>{" "}
                {row.trainer.fullName}
              </small>
            ) : (
              <small className="text-muted d-block">No trainer assigned</small>
            )}
            {row.allowGuests === false ? (
              <small className="text-muted d-block">Members only</small>
            ) : null}
          </div>
        ),
        sortable: true,
        sortField: "title",
        minWidth: "210px",
      },
      {
        name: "When",
        cell: (row) => (
          <div className="py-1 small">
            <div className="text-wrap">{formatDateTime(row.start) || "—"}</div>
            <small className="text-muted">
              {formatDuration(row.durationMinutes)}
            </small>
          </div>
        ),
        sortable: true,
        sortField: "start",
        minWidth: "180px",
      },
      {
        name: "Branch",
        selector: (row) => row.branch || "—",
        sortable: true,
        sortField: "branch",
        width: "110px",
      },
      {
        name: "Seats",
        cell: (row) => {
          const seats = capacityState(row);
          return (
            <div className="py-1">
              <span className={`badge ${seats.tone}`} title={seats.hint}>
                {seats.label}
              </span>
              <small className="d-block text-muted">
                {seats.booked} / {seats.capacity} booked
              </small>
            </div>
          );
        },
        sortable: true,
        sortField: "capacity",
        width: "130px",
      },
      {
        name: "State",
        cell: (row) => {
          const timing = sessionTiming(row);
          return (
            <div className="py-1">
              <span
                className={`badge ${
                  row.isActive
                    ? "bg-success-subtle text-success"
                    : "bg-light text-body"
                }`}
                title={
                  row.isActive
                    ? "Listed on the website and open for booking."
                    : "Switched off — hidden from the website, existing bookings kept."
                }
              >
                {row.isActive ? "Active" : "Off"}
              </span>
              {timing.label ? (
                <small className="d-block text-muted" title={timing.hint}>
                  {timing.label}
                </small>
              ) : null}
            </div>
          );
        },
        width: "120px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => onOpenRoster(row)}
              aria-label={`Open the roster for ${row.title}`}
              title="Roster"
            >
              <i className="ri-team-line" aria-hidden="true"></i>
            </button>
            {permissions.edit && (
              <button
                type="button"
                className="btn btn-sm btn-success edit-item-btn"
                onClick={() => onEdit(row)}
                aria-label={`Edit the class ${row.title}`}
                title="Edit"
              >
                <i className="ri-pencil-line" aria-hidden="true"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                type="button"
                className="btn btn-sm btn-danger remove-item-btn"
                onClick={() => onDelete(row)}
                aria-label={`Delete the class ${row.title}`}
                title="Delete"
              >
                <i className="ri-delete-bin-line" aria-hidden="true"></i>
              </button>
            )}
          </div>
        ),
        width: "140px",
      },
    ],
    [permissions, pageNo, perPage, onOpenRoster, onEdit, onDelete],
  );

  return (
    <div className="table-responsive table-card mt-1 mb-1">
      <DataTable
        columns={columns}
        data={rows}
        progressPending={loading}
        sortServer
        onSort={onSort}
        pagination
        paginationServer
        paginationTotalRows={totalRows}
        paginationPerPage={perPage}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        onChangeRowsPerPage={onChangeRowsPerPage}
        onChangePage={onChangePage}
        noDataComponent={
          <div className="text-center py-4 text-muted">
            No classes match these filters. Click <strong>Add Class</strong> to
            schedule one.
          </div>
        }
      />
    </div>
  );
};

SessionList.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  totalRows: PropTypes.number,
  perPage: PropTypes.number,
  pageNo: PropTypes.number,
  onSort: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onOpenRoster: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SessionList;

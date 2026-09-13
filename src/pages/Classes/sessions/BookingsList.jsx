import React, { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "@/Components/Common/DataTableBase";
import {
  bookingStatusMeta,
  bookingSubject,
  formatDateTime,
  membershipState,
  SOURCE_LABELS,
} from "../classesFormat";

/**
 * Bookings across every class, for the "who is coming this week" question that
 * a single class's roster cannot answer.
 *
 * Read-only: marking a place ATTENDED / NO_SHOW / CANCELLED happens on the
 * roster, where the rest of that class is visible. Doing it from a flat list
 * invites marking the right name in the wrong class.
 *
 * The subject column goes through bookingSubject(), so a free-trial row whose
 * `member` is null renders as a prospect instead of throwing.
 */
const BookingsList = ({
  rows,
  loading,
  totalRows,
  perPage,
  pageNo,
  onSort,
  onChangePage,
  onChangeRowsPerPage,
  onOpenRoster,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "70px",
      },
      {
        name: "Person",
        cell: (row) => {
          const who = bookingSubject(row);
          const membership = membershipState(who.endDate);
          return (
            <div className="py-1">
              <p className="mb-0 fw-semibold text-wrap">{who.name}</p>
              <small className="text-muted d-block text-wrap">
                {who.phone || "no phone"}
              </small>
              <span className={`badge ${who.tone}`}>
                <i className={who.icon} aria-hidden="true"></i> {who.label}
              </span>
              {membership ? (
                <span
                  className={`badge ms-1 ${membership.tone}`}
                  title={membership.hint}
                >
                  {membership.label}
                </span>
              ) : null}
            </div>
          );
        },
        sortable: true,
        sortField: "name",
        minWidth: "210px",
      },
      {
        name: "Class",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 text-wrap">{row.session?.title || "—"}</p>
            <small className="text-muted">{row.branch || "—"}</small>
          </div>
        ),
        minWidth: "170px",
      },
      {
        name: "When",
        cell: (row) => (
          <div className="py-1 small text-wrap">
            {formatDateTime(row.sessionStart) || "—"}
          </div>
        ),
        sortable: true,
        sortField: "sessionStart",
        minWidth: "180px",
      },
      {
        name: "Status",
        cell: (row) => {
          const status = bookingStatusMeta(row.status);
          return (
            <div className="py-1">
              <span className={`badge ${status.tone}`}>
                <i className={status.icon} aria-hidden="true"></i>{" "}
                {status.label}
              </span>
              <small className="d-block text-muted">
                {SOURCE_LABELS[row.source] || row.source}
              </small>
            </div>
          );
        },
        sortable: true,
        sortField: "status",
        width: "140px",
      },
      {
        name: "Action",
        cell: (row) =>
          row.session?._id ? (
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => onOpenRoster(row.session)}
              aria-label={`Open the roster for ${row.session.title || "this class"}`}
              title="Roster"
            >
              <i className="ri-team-line" aria-hidden="true"></i>
            </button>
          ) : (
            <span className="text-muted small">—</span>
          ),
        width: "90px",
      },
    ],
    [pageNo, perPage, onOpenRoster],
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
            No bookings match these filters.
          </div>
        }
      />
    </div>
  );
};

BookingsList.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  totalRows: PropTypes.number,
  perPage: PropTypes.number,
  pageNo: PropTypes.number,
  onSort: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onOpenRoster: PropTypes.func.isRequired,
};

export default BookingsList;

import { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "react-data-table-component";
import { fileUrl } from "@/utils/fileUrl";
import { fieldSummary, primaryImage } from "./itemSpecs";

/**
 * One list of one collection, in published order.
 *
 * ORDER IS A CONTROL, NOT A NUMBER TO RETYPE. The sort column carries the
 * arrows that swap a row with its neighbour, because "move this plan above that
 * one" is the edit people actually make; the number is still shown (and still
 * editable in the form) so the tens-apart convention stays visible.
 *
 * ACTIONS ARE ICON-ONLY, deliberately. With text buttons the SEO table ran 58px
 * wider than its scroll container at 1440px and clipped Delete out of view —
 * the destructive action hidden behind a scroll nobody expects. aria-label and
 * title keep the accessible name and add the hover tooltip.
 */
const SiteItemList = ({
  rows,
  defs,
  loading,
  permissions,
  canReorder,
  busyId,
  emptyLabel,
  onEdit,
  onDelete,
  onMove,
  onToggleActive,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Order",
        cell: (row) => {
          const index = rows.findIndex((r) => r._id === row._id);
          const busy = busyId === row._id;
          return (
            <div className="d-flex align-items-center gap-1 py-1">
              <span className="text-muted small" style={{ minWidth: 24 }}>
                {row.sortOrder ?? 0}
              </span>
              {permissions.edit && canReorder ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    disabled={index <= 0 || busy}
                    onClick={() => onMove(row, -1)}
                    aria-label={`Move ${row.title} up`}
                    title="Move up"
                  >
                    <i className="ri-arrow-up-line" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    disabled={index === -1 || index >= rows.length - 1 || busy}
                    onClick={() => onMove(row, 1)}
                    aria-label={`Move ${row.title} down`}
                    title="Move down"
                  >
                    <i className="ri-arrow-down-line" aria-hidden="true"></i>
                  </button>
                </>
              ) : null}
            </div>
          );
        },
        width: "150px",
      },
      {
        name: "Title",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 fw-semibold text-wrap">{row.title || "—"}</p>
            {row.subtitle ? (
              <small className="text-muted text-wrap">{row.subtitle}</small>
            ) : null}
          </div>
        ),
        minWidth: "170px",
        sortable: true,
        selector: (row) => row.title || "",
      },
      {
        name: "Details",
        /**
         * Driven by the same `defs` the form is: a field the server adds shows
         * up here without anyone editing this file, and a field it drops stops
         * being printed instead of lingering as a stale column.
         */
        cell: (row) => {
          const summary = fieldSummary(row, defs);
          const body = String(row.body || "");
          if (!summary.length && !body) {
            return <span className="text-muted small">—</span>;
          }
          return (
            <div className="py-1">
              {summary.map((entry) => (
                <small key={entry.key} className="d-block text-wrap">
                  <span className="text-muted">{entry.label}: </span>
                  {entry.text}
                </small>
              ))}
              {body ? (
                <small className="d-block text-muted text-wrap">
                  {body.slice(0, 70)}
                  {body.length > 70 ? "…" : ""}
                </small>
              ) : null}
            </div>
          );
        },
        minWidth: "210px",
      },
      {
        name: "Photo",
        cell: (row) => {
          const src = primaryImage(row, defs);
          return src ? (
            <img
              src={fileUrl(src)}
              alt={`${row.title} thumbnail`}
              style={{
                width: 48,
                height: 32,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ) : (
            <span className="text-muted small">—</span>
          );
        },
        width: "90px",
      },
      {
        name: "Branch",
        cell: (row) =>
          row.branch ? (
            <span className="badge bg-light text-body border">{row.branch}</span>
          ) : (
            <span className="text-muted small">All</span>
          ),
        width: "110px",
      },
      {
        name: "Published",
        cell: (row) => (
          <div className="form-check form-switch mb-0 py-1">
            <input
              type="checkbox"
              role="switch"
              className="form-check-input"
              id={`itemActive-${row._id}`}
              checked={row.isActive !== false}
              disabled={!permissions.edit || busyId === row._id}
              onChange={() => onToggleActive(row)}
              aria-label={`Published on the website: ${row.title}`}
            />
            <label
              className="form-check-label small"
              htmlFor={`itemActive-${row._id}`}
            >
              {row.isActive !== false ? "Live" : "Hidden"}
            </label>
          </div>
        ),
        width: "120px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit && (
              <button
                type="button"
                className="btn btn-sm btn-success edit-item-btn"
                onClick={() => onEdit(row)}
                aria-label={`Edit ${row.title}`}
                title="Edit"
              >
                <i className="ri-pencil-line" aria-hidden="true"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                type="button"
                className="btn btn-sm btn-danger remove-item-btn"
                onClick={() => onDelete(row._id)}
                aria-label={`Delete ${row.title}`}
                title="Delete"
              >
                <i className="ri-delete-bin-line" aria-hidden="true"></i>
              </button>
            )}
          </div>
        ),
        width: "104px",
      },
    ],
    [rows, defs, permissions, canReorder, busyId, onEdit, onDelete, onMove, onToggleActive],
  );

  return (
    <>
      {permissions.edit && !canReorder && rows.length > 1 ? (
        /**
         * The arrows are hidden while a search is active, not merely disabled
         * on a whim: a move renumbers the WHOLE list in tens, and a filtered
         * view is not the whole list — reordering two of five visible rows
         * would silently renumber them past rows the filter is hiding.
         */
        <p className="text-muted small mb-2">
          <i className="ri-information-line" aria-hidden="true"></i> Clear the
          search box to reorder rows — reordering renumbers the whole list, so
          it needs the whole list on screen.
        </p>
      ) : null}
      <div className="table-responsive table-card mt-1 mb-1">
        <DataTable
          columns={columns}
          data={rows}
          progressPending={loading}
          pagination
          paginationPerPage={25}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          noDataComponent={
            /* The call to action is gated on the permission that renders the
               button. Telling someone to click Add Row when their role never
               draws it is the empty state the Website screens already shipped
               once, and it reads as a broken page rather than a locked one. */
            <div className="text-center py-4 text-muted">
              Nothing in <strong>{emptyLabel}</strong> yet.
              {permissions.write ? (
                <>
                  {" "}
                  Click <strong>Add Row</strong> to create the first one.
                </>
              ) : (
                " Your role cannot add rows to this list."
              )}
            </div>
          }
        />
      </div>
    </>
  );
};

SiteItemList.propTypes = {
  rows: PropTypes.array.isRequired,
  defs: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  canReorder: PropTypes.bool,
  busyId: PropTypes.string,
  emptyLabel: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onToggleActive: PropTypes.func.isRequired,
};

export default SiteItemList;

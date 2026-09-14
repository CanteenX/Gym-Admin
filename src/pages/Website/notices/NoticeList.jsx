import { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "@/Components/Common/DataTableBase";
import { fileUrl } from "@/utils/fileUrl";
import { noticeLiveState } from "./noticeLiveState";
import { formatWhen, placementLabel } from "./noticeConfig";

/**
 * The list half of both notice screens.
 *
 * THE STATUS COLUMN IS THE POINT OF THIS TABLE. Everything else here is
 * ordinary CRUD furniture; the reason the screen exists at all is that a notice
 * can be saved, ticked active, and still be invisible on the website because
 * its window has closed - and until now there was nowhere in the panel that
 * said so. So the state badge is a column of its own rather than a subtitle
 * under the title, it sits next to the dates that explain it, and the dates
 * spell out "runs until switched off" rather than leaving an empty cell that
 * could equally mean "nobody filled this in".
 */

const bodyPreview = (text) => {
  const clean = String(text || "").trim();
  if (clean.length <= 90) return clean;
  return `${clean.slice(0, 90)}...`;
};

const NoticeList = ({
  config,
  rows,
  loading,
  permissions,
  pageNo,
  perPage,
  totalRows,
  onSort,
  onChangePage,
  onChangeRowsPerPage,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(() => {
    const cols = [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
    ];

    if (config.hasImage) {
      cols.push({
        name: "Creative",
        cell: (row) =>
          row.imageUrl ? (
            <img
              src={fileUrl(row.imageUrl)}
              alt={`${row.title || "Banner"} creative`}
              style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 4 }}
            />
          ) : (
            <span className="text-muted small">
              <i className="ri-image-line" aria-hidden="true"></i> none
            </span>
          ),
        width: "110px",
      });
    }

    cols.push({
      name: "Title",
      cell: (row) => (
        <div className="py-1">
          <p className="mb-0 fw-semibold text-wrap">{row.title}</p>
          {row.body ? (
            <small className="text-muted text-wrap d-block">
              {bodyPreview(row.body)}
            </small>
          ) : null}
          {row.ctaUrl ? (
            <small className="text-muted text-wrap d-block">
              <i className="ri-links-line" aria-hidden="true"></i>{" "}
              {row.ctaLabel || "Button"}: {row.ctaUrl}
            </small>
          ) : null}
        </div>
      ),
      sortable: true,
      sortField: "title",
      minWidth: "240px",
    });

    if (config.hasPlacement) {
      cols.push({
        name: "Placement",
        cell: (row) => (
          <span className="badge bg-primary-subtle text-primary text-wrap">
            {placementLabel(row.placement)}
          </span>
        ),
        sortable: true,
        sortField: "placement",
        minWidth: "170px",
      });
    }

    cols.push(
      {
        name: "Schedule",
        cell: (row) => {
          const ends = formatWhen(row.endAt);
          const expired = noticeLiveState(row).key === "EXPIRED";
          return (
            <div className="py-1 small">
              <div className="text-muted">
                From: {formatWhen(row.startAt) || "straight away"}
              </div>
              <div className={expired ? "text-danger fw-semibold" : "text-muted"}>
                {/* An empty end date is the common, deliberate case, so it is
                    spelled out. A past one is spelled out too, and in red -
                    "Until: 12 Sep" next to a row the site is not serving is
                    information the reader still has to do date arithmetic on. */}
                {ends
                  ? `${expired ? "Ended: " : "Until: "}${ends}`
                  : "Until: runs until switched off"}
              </div>
            </div>
          );
        },
        sortable: true,
        sortField: "endAt",
        minWidth: "230px",
      },
      {
        name: "Status",
        cell: (row) => {
          // The server sends `status` on every row, derived from the same
          // expression the public endpoint filters on - so this badge and the
          // website cannot disagree. See noticeLiveState.js.
          const state = noticeLiveState(row);
          return (
            <span
              className={`badge ${state.badgeClass} d-inline-flex align-items-center gap-1`}
              title={state.hint}
            >
              <i className={state.icon} aria-hidden="true"></i> {state.label}
            </span>
          );
        },
        minWidth: "150px",
      },
      {
        name: "Order",
        selector: (row) => row.sortOrder ?? 0,
        sortable: true,
        sortField: "sortOrder",
        width: "100px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success edit-item-btn d-flex align-items-center gap-1"
                onClick={() => onEdit(row)}
              >
                <i className="ri-pencil-line" aria-hidden="true"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
                onClick={() => onDelete(row._id)}
              >
                <i className="ri-delete-bin-line" aria-hidden="true"></i> Delete
              </button>
            )}
          </div>
        ),
        minWidth: "180px",
      },
    );

    return cols;
  }, [config, permissions, pageNo, perPage, onEdit, onDelete]);

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
          <div className="text-center py-4 text-muted">{config.emptyText}</div>
        }
      />
    </div>
  );
};

NoticeList.propTypes = {
  config: PropTypes.object.isRequired,
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  pageNo: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  totalRows: PropTypes.number.isRequired,
  onSort: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default NoticeList;

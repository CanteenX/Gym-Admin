import { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "@/Components/Common/DataTableBase";
import { fileUrl } from "@/utils/fileUrl";

/**
 * The section list of one page of the marketing site.
 *
 * Split out of WebsitePages.jsx when the repeating-content editor joined that
 * screen, for the same reason SeoList.jsx is split out of SeoManager.jsx: the
 * page is now two editors behind one permission row, and the orchestration is
 * hard enough to read without ~120 lines of column definitions in the middle of
 * it. The markup is unchanged.
 */
const SiteContentTable = ({
  rows,
  loading,
  permissions,
  pageLabel,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Order",
        selector: (row) => row.sortOrder ?? 0,
        width: "90px",
      },
      {
        name: "Section",
        cell: (row) => (
          <span className="fw-semibold text-wrap">{row.sectionKey}</span>
        ),
        minWidth: "150px",
      },
      {
        name: "Title",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 text-wrap">{row.title || "—"}</p>
            {row.subtitle ? (
              <small className="text-muted text-wrap">{row.subtitle}</small>
            ) : null}
          </div>
        ),
        minWidth: "220px",
      },
      {
        name: "Body",
        cell: (row) => (
          <span className="text-muted small text-wrap">
            {row.body
              ? `${String(row.body).slice(0, 80)}${String(row.body).length > 80 ? "…" : ""}`
              : "—"}
          </span>
        ),
        minWidth: "220px",
      },
      {
        name: "Image",
        cell: (row) =>
          row.imageUrl ? (
            <img
              src={fileUrl(row.imageUrl)}
              alt={`${row.sectionKey} section`}
              style={{
                width: 56,
                height: 36,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ) : (
            <span className="text-muted small">—</span>
          ),
        width: "100px",
      },
      {
        name: "Button",
        cell: (row) =>
          row.ctaLabel ? (
            <span className="badge bg-info text-wrap">{row.ctaLabel}</span>
          ) : (
            <span className="text-muted small">—</span>
          ),
        minWidth: "130px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Published" : "Hidden"}
          </span>
        ),
        width: "120px",
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
                <i className="ri-pencil-line"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
                onClick={() => onDelete(row._id)}
              >
                <i className="ri-delete-bin-line"></i> Delete
              </button>
            )}
          </div>
        ),
        minWidth: "180px",
      },
    ],
    [permissions, onEdit, onDelete],
  );

  return (
    <div className="table-responsive table-card mt-1 mb-1">
      <DataTable
        columns={columns}
        data={rows}
        progressPending={loading}
        pagination
        paginationPerPage={10}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        noDataComponent={
          <div className="text-center py-4 text-muted">
            No sections on the <strong>{pageLabel}</strong> page yet. Click{" "}
            <strong>Add Section</strong> to create one.
          </div>
        }
      />
    </div>
  );
};

SiteContentTable.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  pageLabel: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SiteContentTable;

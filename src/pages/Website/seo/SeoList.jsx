import { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "@/Components/Common/DataTableBase";
import { TITLE_LIMIT, completeness, keywordList } from "./seoRules";

/**
 * The list pane: category chips, then one row per route.
 *
 * The completeness column is a WORD in a coloured badge plus the count of
 * checks that pass, never a bare coloured dot. A dot needs a legend, disappears
 * in greyscale and is invisible to a red-green colour deficiency - and it is
 * the one column an editor scans to decide what to open.
 */
const SeoList = ({
  rows,
  loading,
  permissions,
  categories,
  activeCategory,
  onCategoryChange,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Page",
        cell: (row) => (
          <div className="py-1 d-flex align-items-start gap-2">
            {row.icon ? (
              <i className={`${row.icon} fs-5 text-muted`} aria-hidden="true"></i>
            ) : null}
            <div>
              <p className="mb-0 fw-semibold text-wrap">
                {row.pageTitle || "Untitled"}
              </p>
              <small className="text-muted text-wrap">{row.slug}</small>
            </div>
          </div>
        ),
        minWidth: "190px",
        sortable: true,
        selector: (row) => row.pageTitle || "",
      },
      {
        name: "Category",
        cell: (row) => (
          <span className="badge bg-light text-body border">
            {row.category || "Other"}
          </span>
        ),
        width: "130px",
      },
      {
        name: "Meta title",
        cell: (row) => {
          const value = String(row.metaTitle || "");
          if (!value) {
            return <span className="badge bg-danger">Not set</span>;
          }
          return (
            <div className="py-1">
              <p className="mb-0 text-wrap">{value}</p>
              <small
                className={
                  value.length > TITLE_LIMIT ? "text-danger" : "text-muted"
                }
              >
                {value.length} / {TITLE_LIMIT} characters
              </small>
            </div>
          );
        },
        minWidth: "220px",
      },
      {
        name: "Keywords",
        cell: (row) => {
          const keywords = keywordList(row.keywords);
          if (!keywords.length) {
            return <span className="text-muted small">None</span>;
          }
          return (
            <span className="text-muted small text-wrap">
              {keywords.slice(0, 3).join(", ")}
              {keywords.length > 3 ? ` +${keywords.length - 3}` : ""}
            </span>
          );
        },
        minWidth: "150px",
      },
      {
        name: "Search",
        cell: (row) =>
          row.noIndex ? (
            <span className="badge bg-secondary">No-index</span>
          ) : (
            <span className="badge bg-success">Indexed</span>
          ),
        width: "120px",
      },
      {
        name: "Completeness",
        cell: (row) => {
          const state = completeness(row);
          return (
            <div className="py-1">
              <span className={`badge ${state.tone}`}>{state.label}</span>
              <small className="d-block text-muted text-wrap">
                {state.detail}
              </small>
            </div>
          );
        },
        minWidth: "160px",
        sortable: true,
        selector: (row) => completeness(row).score,
      },
      {
        name: "Action",
        /**
         * Icon-only, and the labels are not decoration being dropped for looks:
         * with text buttons this table ran 58px wider than its scroll container
         * at 1440px, so "Delete" was the one column clipped out of view - the
         * destructive action hidden behind a horizontal scroll nobody expects.
         * aria-label + title keep the accessible name and add a hover tooltip.
         */
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success edit-item-btn"
                onClick={() => onEdit(row)}
                aria-label={`Edit SEO for ${row.pageTitle || row.slug}`}
                title="Edit"
              >
                <i className="ri-pencil-line" aria-hidden="true"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn"
                onClick={() => onDelete(row._id)}
                aria-label={`Delete SEO row for ${row.pageTitle || row.slug}`}
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
    [permissions, onEdit, onDelete],
  );

  return (
    <>
      <div
        className="d-flex flex-wrap gap-1 mb-3"
        role="group"
        aria-label="Filter pages by category"
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            className={`btn btn-sm ${
              activeCategory === cat.value ? "btn-success" : "btn-light"
            }`}
            aria-pressed={activeCategory === cat.value}
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}{" "}
            <span className="badge bg-light text-body ms-1">{cat.count}</span>
          </button>
        ))}
      </div>

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
              No pages here yet. Click <strong>Add Page</strong> to give a route
              its title, description and share card.
            </div>
          }
        />
      </div>
    </>
  );
};

SeoList.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  permissions: PropTypes.object.isRequired,
  categories: PropTypes.array.isRequired,
  activeCategory: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SeoList;

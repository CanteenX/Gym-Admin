import PropTypes from "prop-types";
import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
} from "reactstrap";

/**
 * Confirm-and-download dialog for a server-built export.
 *
 * ============================================================================
 * WHY THIS NO LONGER USES <CSVLink> FROM react-csv
 * ============================================================================
 * It did, and that is why nothing imported it: `react-csv` is not in
 * package.json and never was, so every attempt to render this component threw
 * at import time. The CSV is assembled here instead — it is a join, and a
 * dependency that fails the build is a worse trade than twenty lines.
 *
 * ============================================================================
 * WHY THE ROWS ARRIVE AS A PROP RATHER THAN BEING FETCHED HERE
 * ============================================================================
 * The export endpoints stream a CSV attachment by default, which a browser can
 * only take by NAVIGATING to the URL — and that navigation is cross-origin in
 * dev (panel on :5173, API on :7002) with no session cookie attached, so it
 * downloads a 401 error page named like a spreadsheet. The server therefore
 * offers `?format=json` for this caller specifically: the owning page fetches
 * it over the authenticated axios instance and hands the already
 * column-labelled rows down here.
 *
 * That path is held in memory server-side and capped (MAX_JSON_ROWS = 5000), so
 * `truncated` must be shown rather than silently handing over a short file that
 * somebody will reconcile against.
 *
 * ============================================================================
 * FORMULA INJECTION
 * ============================================================================
 * A cell beginning = + - @ (or a tab/CR) is executed as a formula by Excel and
 * Sheets when the file is opened. Member names and expense notes are free text
 * typed by staff, so they are prefixed with an apostrophe — the value still
 * reads correctly in the cell and is inert.
 */

/** Cells Excel/Sheets would evaluate as a formula rather than display. */
const RISKY_PREFIX = /^[=+\-@\t\r]/;

const escapeCell = (value) => {
  if (value === null || value === undefined) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const safe = RISKY_PREFIX.test(raw) ? `'${raw}` : raw;
  // Always quote: a value may contain a comma, a quote or a newline, and
  // deciding case by case is how one unquoted note shifts every later column.
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Columns come from the first row's key order, which is the order the server's
 * column definitions produced. Later rows are read through those same keys so a
 * row with a missing field lands as an empty cell instead of shifting columns.
 */
const toCsv = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row?.[h])).join(","));
  }
  // \r\n: Excel on Windows is the overwhelmingly common reader here.
  return `﻿${lines.join("\r\n")}\r\n`;
};

const ExportCSVModal = ({
  show,
  onCloseClick,
  data,
  filename,
  title,
  description,
  loading,
  error,
  truncated,
  maxRows,
}) => {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const preview = useMemo(() => rows.slice(0, 3), [rows]);
  const headers = useMemo(
    () => (preview.length > 0 ? Object.keys(preview[0]) : []),
    [preview],
  );

  const handleDownload = useCallback(() => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoked on the next tick rather than immediately: Safari has not started
    // reading the blob by the time click() returns and downloads nothing.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    onCloseClick?.();
  }, [rows, filename, onCloseClick]);

  return (
    <Modal isOpen={Boolean(show)} toggle={onCloseClick} centered size="lg">
      <ModalHeader toggle={onCloseClick}>{title || "Export CSV"}</ModalHeader>
      <ModalBody>
        {description ? <p className="text-muted">{description}</p> : null}

        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <p className="text-muted mt-3 mb-0">Preparing the export…</p>
          </div>
        ) : null}

        {!loading && error ? (
          <Alert color="danger" className="mb-0">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <Alert color="warning" className="mb-0">
            There is nothing to export for the filters you have chosen.
          </Alert>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <>
            <p className="mb-2">
              <span className="fw-semibold">
                {rows.length.toLocaleString("en-IN")}
              </span>{" "}
              {rows.length === 1 ? "row" : "rows"} will be written to{" "}
              <code>{filename || "export.csv"}</code>.
            </p>

            {truncated ? (
              <Alert color="warning">
                This export stopped at the server limit of{" "}
                {(maxRows || rows.length).toLocaleString("en-IN")} rows, so it is
                not the complete set. Narrow the date range or the branch and
                export again.
              </Alert>
            ) : null}

            <p className="text-muted small mb-2">
              First {preview.length} {preview.length === 1 ? "row" : "rows"}, so
              you can check the columns before downloading:
            </p>
            <div className="table-responsive">
              <Table size="sm" bordered className="mb-0 align-middle">
                <caption className="visually-hidden">
                  Preview of the first {preview.length} rows of the export
                </caption>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} scope="col" className="text-nowrap small">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    // Index key: these rows are a static, never-reordered
                    // snapshot of the response, and the server does not send an
                    // id on the export shape.
                    <tr key={`preview-${i}`}>
                      {headers.map((h) => (
                        <td key={h} className="text-nowrap small">
                          {row?.[h] === null || row?.[h] === undefined
                            ? ""
                            : String(row[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onCloseClick}>
          Cancel
        </Button>
        <Button
          color="success"
          onClick={handleDownload}
          disabled={Boolean(loading) || Boolean(error) || rows.length === 0}
        >
          <i className="ri-download-2-line align-bottom me-1" aria-hidden="true" />
          Download CSV
        </Button>
      </ModalFooter>
    </Modal>
  );
};

ExportCSVModal.propTypes = {
  show: PropTypes.bool,
  onCloseClick: PropTypes.func,
  /** Rows already keyed by their human column labels, as `?format=json` returns. */
  data: PropTypes.array,
  filename: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  /** `meta.truncated` from the response — the server hit its row cap. */
  truncated: PropTypes.bool,
  maxRows: PropTypes.number,
};

export default ExportCSVModal;

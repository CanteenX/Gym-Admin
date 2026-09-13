import PropTypes from "prop-types";
import React, { useCallback, useState } from "react";
import { Button, Card, CardBody, CardHeader } from "reactstrap";
import ExportCSVModal from "../../../Components/Common/ExportCSVModal";
import {
  exportAttendance,
  exportMembers,
  exportTransactions,
} from "../../../api/exports.api";
import { toInputDate } from "../insightsFormat";

/**
 * CSV exports for the three datasets behind this page.
 *
 * ============================================================================
 * THESE BUTTONS ARE GATED ON `print`, NOT `read`.
 * ============================================================================
 * The export routes check the print flag server-side: a file that leaves the
 * building is a separate decision from being allowed to look at the numbers on
 * screen, and the Insights menu rows are seeded that way (read everywhere,
 * print only on /reports). Gating the UI on `read` would render buttons that
 * 403 for anyone whose role was not granted print.
 *
 * The gate also has to include `isAdmin` — see WebsiteAdverts.jsx for the bug
 * that taught this. A super admin short-circuits checkPermission on the server
 * and PermissionProtected on the client, so a UI that insists on a MenuMaster
 * permission row hides buttons the server would honour, and the owner is the
 * one person guaranteed to hit it.
 *
 * The rows are fetched with `?format=json` rather than letting the browser
 * navigate to the streamed CSV: that navigation is cross-origin in dev and
 * carries no session cookie, so it downloads a 401 error page named like a
 * spreadsheet. See api/exports.api.jsx.
 */

const stamp = () => toInputDate(new Date());

const DATASETS = {
  transactions: {
    label: "Cash ledger",
    title: "Export the cash ledger",
    description:
      "Every receipt and expense in the selected date range, straight from the " +
      "Transaction ledger. Shared-overhead (“Common”) rows are included " +
      "only if your account can see them.",
    filename: () => `transactions-${stamp()}.csv`,
    fetch: (filters) =>
      exportTransactions({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branch: filters.branch,
      }),
  },
  members: {
    label: "Member list",
    title: "Export the member list",
    description:
      "Active and inactive members. Portal credentials, ID proofs and payment " +
      "history are deliberately left out — use the cash ledger export for money.",
    filename: () => `members-${stamp()}.csv`,
    fetch: (filters) => exportMembers({ branch: filters.branch }),
  },
  /**
   * ==========================================================================
   * THREE ATTENDANCE FILES, NOT ONE WITH OPTIONS. WHY.
   * ==========================================================================
   * Trainer shifts share the Attendance collection with member check-ins, and
   * a refused scan is a row in it too. Both are excluded by default, server
   * side, and both have to be asked for by name.
   *
   * Putting them behind a dropdown on one button would produce three files with
   * the same name and the same columns whose CONTENT differs - which is how
   * somebody ends up comparing last month's member footfall against this
   * month's members-plus-trainers and reporting growth that did not happen.
   * Separate buttons and separate filenames make the difference survive the
   * download.
   */
  attendance: {
    label: "Check-in log",
    title: "Export the check-in log",
    description:
      "Sessions members logged themselves in the selected date range. These are " +
      "self-reported check-ins, not verified visits. Trainer shifts and refused " +
      "attempts are not in this file.",
    filename: () => `attendance-checkins-${stamp()}.csv`,
    fetch: (filters) =>
      exportAttendance({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branch: filters.branch,
      }),
  },
  attendanceTrainers: {
    label: "Trainer shifts",
    title: "Export trainer shifts",
    description:
      "Sessions trainers logged themselves in the selected date range. The same " +
      "rows the check-in log deliberately leaves out, so that member footfall " +
      "means members.",
    filename: () => `attendance-trainer-shifts-${stamp()}.csv`,
    fetch: (filters) =>
      exportAttendance({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branch: filters.branch,
        subjectType: "TRAINER",
      }),
  },
  attendanceDenied: {
    label: "Check-ins incl. refusals",
    title: "Export check-ins including refused attempts",
    description:
      "Every check-in attempt by members and trainers in the range, INCLUDING " +
      "the ones that were refused - read the “Denied Reason” column. A refusal " +
      "is somebody who scanned and was told their membership had lapsed or a " +
      "payment was due; nothing stopped them coming in, because the code is a " +
      "printed sticker and nobody is at the door. Do not use this file to " +
      "measure footfall: a refusal is not an arrival.",
    filename: () => `attendance-with-refusals-${stamp()}.csv`,
    fetch: (filters) =>
      exportAttendance({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branch: filters.branch,
        subjectType: "ALL",
        includeDenied: true,
      }),
  },
};

const ReportExports = ({ canExport, filters }) => {
  const [open, setOpen] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ truncated: false, maxRows: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async (key) => {
      const dataset = DATASETS[key];
      setOpen(key);
      setRows([]);
      setError("");
      setMeta({ truncated: false, maxRows: 0 });
      setLoading(true);
      try {
        const res = await dataset.fetch(filters);
        if (res.data?.isOk) {
          setRows(res.data.data || []);
          setMeta({
            truncated: Boolean(res.data.meta?.truncated),
            maxRows: Number(res.data.meta?.maxRows || 0),
          });
        } else {
          setError(res.data?.message || "The export could not be prepared.");
        }
      } catch (err) {
        setError(
          err.response?.status === 403
            ? "Your role can view these reports but is not allowed to export them."
            : err.response?.data?.message ||
                "The export could not be prepared.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  if (!canExport) return null;

  const dataset = open ? DATASETS[open] : null;

  return (
    <>
      <Card className="mb-3">
        <CardHeader>
          <h5 className="card-title mb-1">Export</h5>
          <small className="text-muted">
            Downloads a CSV of the data behind these reports, for the filters set
            above
          </small>
        </CardHeader>
        <CardBody className="d-flex flex-wrap gap-2">
          {Object.entries(DATASETS).map(([key, d]) => (
            <Button
              key={key}
              color="light"
              size="sm"
              onClick={() => run(key)}
              disabled={loading}
            >
              <i
                className="ri-download-2-line align-bottom me-1"
                aria-hidden="true"
              />
              {d.label}
            </Button>
          ))}
        </CardBody>
      </Card>

      <ExportCSVModal
        show={Boolean(open)}
        onCloseClick={() => setOpen(null)}
        data={rows}
        loading={loading}
        error={error || undefined}
        truncated={meta.truncated}
        maxRows={meta.maxRows}
        title={dataset?.title}
        description={dataset?.description}
        filename={dataset ? dataset.filename() : "export.csv"}
      />
    </>
  );
};

ReportExports.propTypes = {
  /** `permissions.print` AND `isAdmin` — see the header. */
  canExport: PropTypes.bool,
  filters: PropTypes.shape({
    fromDate: PropTypes.string,
    toDate: PropTypes.string,
    branch: PropTypes.string,
  }).isRequired,
};

export default ReportExports;

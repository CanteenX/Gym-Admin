import PropTypes from "prop-types";
import React, { useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { formatDateTime } from "../insightsFormat";

/**
 * The drill-down for one audit row: who, what, and the before/after.
 *
 * ============================================================================
 * WHY THE DIFF IS BUILT FROM THE UNION OF before AND after KEYS
 * ============================================================================
 * `changedFields` is the server's list of top-level field names that differ,
 * and it is the right thing to lead with — but it is empty for CREATE and
 * DELETE, where the whole document is the story. Reading only `changedFields`
 * would render an empty diff for exactly the two actions somebody opens this
 * screen to understand. So the rows are the union of the keys present on either
 * side, with `changedFields` used to mark which of them actually moved.
 *
 * Values are rendered with JSON.stringify rather than String(): a nested object
 * would otherwise read "[object Object]", which is worse than useless in a
 * record whose entire purpose is to show what changed.
 *
 * Secrets never reach here — password hashes, tokens and SMTP passwords are
 * replaced with "[REDACTED]" before the row is written (services/auditLog.js),
 * because an audit log is read by more people than the records it describes.
 */

const renderValue = (value) => {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    // Circular structures cannot occur in a stored BSON document, but a
    // stringify that throws must not take the whole modal down with it.
    return String(value);
  }
};

const ACTION_COLOR = {
  CREATE: "success",
  CREATE_MANY: "success",
  UPDATE: "info",
  UPDATE_MANY: "info",
  DELETE: "danger",
  DELETE_MANY: "danger",
};

const AuditLogDetailModal = ({ show, onCloseClick, entry, loading, error }) => {
  const fields = useMemo(() => {
    if (!entry) return [];
    const before = entry.before && typeof entry.before === "object" ? entry.before : {};
    const after = entry.after && typeof entry.after === "object" ? entry.after : {};
    const changed = new Set(entry.changedFields || []);
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.map((key) => ({
      key,
      before: before[key],
      after: after[key],
      changed: changed.has(key),
    }));
  }, [entry]);

  return (
    <Modal isOpen={Boolean(show)} toggle={onCloseClick} centered size="lg" scrollable>
      <ModalHeader toggle={onCloseClick}>Audit entry</ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading the audit entry</span>
          </div>
        ) : null}

        {!loading && error ? (
          <Alert color="danger" className="mb-0">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && entry ? (
          <>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <p className="text-muted mb-1 small">Who</p>
                <h6 className="mb-0">{entry.actor?.name || "Unknown"}</h6>
                <p className="text-muted small mb-0">
                  {entry.actor?.email || "no email on record"}
                  {entry.actor?.role ? ` · ${entry.actor.role}` : ""}
                  {entry.actor?.isSuperAdmin ? " · super admin" : ""}
                </p>
                <p className="text-muted small mb-0">
                  Acting for{" "}
                  {entry.actor?.branch || "all branches"}
                </p>
              </Col>
              <Col md={6}>
                <p className="text-muted mb-1 small">What</p>
                <h6 className="mb-1">
                  <Badge color={ACTION_COLOR[entry.action] || "secondary"}>
                    {entry.action}
                  </Badge>{" "}
                  {entry.collectionName}
                </h6>
                <p className="text-muted small mb-0">
                  {entry.documentLabel || entry.documentId || "no single document"}
                </p>
                <p className="text-muted small mb-0">
                  {formatDateTime(entry.createdAt)}
                </p>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <p className="text-muted mb-1 small">Branch of the record</p>
                <p className="mb-0">
                  {entry.branch || "Business-wide (no branch)"}
                </p>
              </Col>
              <Col md={6}>
                <p className="text-muted mb-1 small">Request</p>
                <p className="mb-0 text-break small">
                  {entry.method} {entry.path}
                </p>
                <p className="text-muted small mb-0 text-break">
                  from {entry.ip || "unknown address"}
                </p>
              </Col>
            </Row>

            {entry.truncated ? (
              <Alert color="warning">
                This entry was trimmed to fit the size cap, so the before/after
                below is not the complete document.
              </Alert>
            ) : null}

            <h6 className="mb-2">
              {entry.action?.startsWith("CREATE")
                ? "Created with"
                : entry.action?.startsWith("DELETE")
                  ? "Deleted record"
                  : "Changed fields"}
            </h6>

            {fields.length === 0 ? (
              <p className="text-muted mb-0">
                No field-level detail was recorded for this entry.
              </p>
            ) : (
              <div className="table-responsive">
                <Table size="sm" bordered className="mb-0 align-middle">
                  <caption className="visually-hidden">
                    Field values before and after the change
                  </caption>
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Field</th>
                      <th scope="col">Before</th>
                      <th scope="col">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.key}>
                        <th scope="row" className="fw-medium">
                          {f.key}
                          {f.changed ? (
                            <Badge color="info" className="ms-1">
                              changed
                            </Badge>
                          ) : null}
                        </th>
                        <td>
                          <pre className="mb-0 small text-break text-wrap">
                            {renderValue(f.before)}
                          </pre>
                        </td>
                        <td>
                          <pre className="mb-0 small text-break text-wrap">
                            {renderValue(f.after)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onCloseClick}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AuditLogDetailModal.propTypes = {
  show: PropTypes.bool,
  onCloseClick: PropTypes.func.isRequired,
  /** `data` from GET /audit-logs/:id. */
  entry: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default AuditLogDetailModal;

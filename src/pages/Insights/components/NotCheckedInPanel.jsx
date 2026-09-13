import PropTypes from "prop-types";
import React from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Input,
  Label,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { formatDate } from "../insightsFormat";

/**
 * The call list: active members with no LOGGED check-in for N days.
 *
 * ============================================================================
 * THE WORDING HERE IS LOAD-BEARING. "NOT CHECKED IN", NEVER "NOT VISITED".
 * ============================================================================
 * Check-in is unattended and self-reported (docs/plan.md D2). The branch QR is
 * a printed sticker, so it can be photographed and used from a sofa, and the
 * portal's check-in button needs no QR at all. A row therefore proves somebody
 * pressed a button, not that they were in the building — and the ABSENCE of a
 * row proves nothing at all, because plenty of members train and never log it.
 *
 * So this screen measures LOGGING BEHAVIOUR. It is still the best churn prompt
 * the data supports, and it catches the common case (stopped coming, stopped
 * logging). But a member on this list has not been shown to have stopped
 * attending, and staff must not be given a screen that says they have: the
 * headline is a prompt to ring somebody, the column is "Last logged check-in",
 * and the empty-state for a member who has never logged one says the portal may
 * simply never have been set up.
 *
 * Renaming any of this to "visits" would turn a soft signal into a claim the
 * data cannot support, and the phone call that follows would open with an
 * accusation.
 */

const DAY_OPTIONS = [7, 14, 21, 30, 60, 90];

const NotCheckedInPanel = ({
  data,
  loading,
  days,
  onDaysChange,
  page,
  perPage,
  onPageChange,
}) => {
  const rows = data?.rows || [];
  const total = Number(data?.total || 0);
  const from = total === 0 ? 0 : page * perPage + 1;
  const to = Math.min(total, page * perPage + rows.length);

  return (
    <Card>
      <CardHeader>
        <Row className="g-2 align-items-end">
          <Col md>
            <h5 className="card-title mb-1">
              Members to call — no check-in logged
            </h5>
            <small className="text-muted">
              A prompt to pick up the phone, not evidence that somebody stopped
              coming
            </small>
          </Col>
          <Col md="auto" style={{ minWidth: 220 }}>
            <Label for="not-checked-in-days" className="form-label mb-1 small">
              Not checked in for at least
            </Label>
            <Input
              id="not-checked-in-days"
              type="select"
              bsSize="sm"
              value={days}
              onChange={(e) => onDaysChange(Number(e.target.value))}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Input>
          </Col>
        </Row>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading the call list</span>
          </div>
        ) : (
          <>
            {data?.rosterTruncated ? (
              <Alert color="warning">
                The member roster was read up to its cap, so this list may be
                incomplete. Filter by branch to see the full picture.
              </Alert>
            ) : null}

            <p className="mb-3">
              <span className="fw-semibold">{total.toLocaleString("en-IN")}</span>{" "}
              active {total === 1 ? "member has" : "members have"} not checked in
              for {days} days or more.
            </p>

            {rows.length === 0 ? (
              <p className="text-muted mb-0">
                Every active member has logged a check-in inside this window.
              </p>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="align-middle mb-0" size="sm">
                    <caption className="visually-hidden">
                      Active members with no logged check-in in the last {days}{" "}
                      days, longest silence first
                    </caption>
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Member</th>
                        <th scope="col">Branch</th>
                        <th scope="col">Plan</th>
                        <th scope="col">Last logged check-in</th>
                        <th scope="col">Membership</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((m) => (
                        <tr key={m._id}>
                          <th scope="row" className="fw-medium">
                            {m.fullName}
                            {m.mobileNumber ? (
                              <div className="fw-normal small">
                                <a href={`tel:${m.mobileNumber}`}>
                                  {m.mobileNumber}
                                </a>
                              </div>
                            ) : null}
                          </th>
                          <td className="text-nowrap">{m.branch}</td>
                          <td className="text-nowrap">{m.planCode || "—"}</td>
                          <td className="text-nowrap">
                            {m.hasEverCheckedIn ? (
                              <>
                                {formatDate(m.lastCheckInAt)}
                                <div className="text-muted small">
                                  {m.daysSinceLastCheckIn} days ago
                                </div>
                              </>
                            ) : (
                              <span className="text-muted">
                                Never logged one
                                <span className="d-block small">
                                  Portal may not be set up
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="text-nowrap">
                            {m.membershipExpired ? (
                              <Badge color="danger">
                                Expired {formatDate(m.endDate)}
                              </Badge>
                            ) : (
                              <span className="text-muted small">
                                Runs to {formatDate(m.endDate)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
                  <span className="text-muted small">
                    Showing {from}–{to} of {total.toLocaleString("en-IN")}
                  </span>
                  <div className="d-flex gap-2">
                    <Button
                      color="light"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => onPageChange(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      color="light"
                      size="sm"
                      disabled={to >= total}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}

            {data?.basis ? (
              <p className="text-muted small mt-3 mb-0">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                {data.basis}
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
};

NotCheckedInPanel.propTypes = {
  /** `data` from GET /attendance/not-checked-in. */
  data: PropTypes.object,
  loading: PropTypes.bool,
  days: PropTypes.number.isRequired,
  onDaysChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default NotCheckedInPanel;

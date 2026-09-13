import PropTypes from "prop-types";
import React from "react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Table,
} from "reactstrap";
import { formatTime, minutesLabel } from "../insightsFormat";

/**
 * Open sessions — who the logs believe is on the floor right now.
 *
 * TWO THINGS THIS PANEL MUST NOT IMPLY
 *
 * 1. It is not a head count of the building. A member can log a session from
 *    anywhere, so this counts open logs, not people. The heading says
 *    "checked in", the server's `basis` string is rendered underneath, and
 *    neither is paraphrased into "in the gym" anywhere that a number appears.
 *
 * 2. `staleOpenSessions` are NOT part of that count and are shown apart from
 *    it. They are rows still open past the longest legitimate session
 *    (120 minutes), waiting for the portal's lazy auto-close to run the next
 *    time that member opens it. Folding them in would report a member as being
 *    in the gym for three days. A rising number means the check-out button is
 *    not being found — which is a fix for the portal, not a call to a member.
 */
const InGymNowPanel = ({ data, loading }) => {
  const sessions = data?.sessions || [];
  const stale = Number(data?.staleOpenSessions || 0);

  return (
    <Card className="h-100">
      <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h5 className="card-title mb-1">Checked in right now</h5>
          <small className="text-muted">Sessions currently open</small>
        </div>
        <Badge color="success" pill className="fs-6">
          {Number(data?.inGymNow || 0)}
        </Badge>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading open sessions</span>
          </div>
        ) : (
          <>
            {stale > 0 ? (
              <p className="text-muted small mb-3">
                <i className="ri-time-line align-bottom me-1" aria-hidden="true" />
                {stale} older {stale === 1 ? "session is" : "sessions are"} still
                open past the two-hour limit and are not counted above —
                those are forgotten check-outs, closed automatically the next time
                the member opens the portal.
              </p>
            ) : null}

            {sessions.length === 0 ? (
              <p className="text-muted mb-0">
                Nobody has an open check-in at the moment.
              </p>
            ) : (
              <div className="table-responsive">
                <Table className="align-middle table-nowrap mb-0" size="sm">
                  <caption className="visually-hidden">
                    Members with an open check-in, most recent first
                  </caption>
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Checked in</th>
                      <th scope="col" className="text-end">
                        Elapsed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s._id}>
                        <th scope="row" className="fw-medium">
                          {s.member?.fullName || "Unknown member"}
                          {s.member?.mobileNumber ? (
                            <div className="text-muted fw-normal small">
                              {s.member.mobileNumber}
                            </div>
                          ) : null}
                        </th>
                        <td>{s.branch}</td>
                        <td>{formatTime(s.checkInAt)}</td>
                        <td className="text-end">
                          {minutesLabel(s.minutesSoFar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
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

InGymNowPanel.propTypes = {
  /** `data` from GET /attendance/live. */
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default InGymNowPanel;

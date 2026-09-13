import PropTypes from "prop-types";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartDataTable from "../../../Components/Common/ChartDataTable";
import { chartTokens, formatDate } from "../insightsFormat";

/**
 * Active memberships grouped by how near their end date is — the renewal call
 * list, ordered by urgency.
 *
 * `buckets[].members` is a SAMPLE capped by the `perBucket` query parameter,
 * not the whole bucket; `buckets[].count` is the real figure. The panel labels
 * the list as a sample for that reason — a staff member who works through 10
 * names and assumes the bucket is cleared would leave the rest uncalled.
 *
 * Members never belong to the "Common" cost bucket (nobody trains at a
 * bookkeeping entry), so there is no shared-overhead case to handle here —
 * unlike the P&L, this is scoped with the plain branch filter.
 */
const ExpiryPipelinePanel = ({ data, loading }) => {
  const buckets = useMemo(() => data?.buckets || [], [data]);
  const tokens = chartTokens();
  const [selectedKey, setSelectedKey] = useState("");

  const selected = useMemo(
    () =>
      buckets.find((b) => b.key === selectedKey) ||
      buckets.find((b) => b.count > 0) ||
      buckets[0] ||
      null,
    [buckets, selectedKey],
  );

  const total = Number(data?.total || 0);
  const expiringSoon = buckets
    .filter((b) => b.key === "expired" || b.key === "d0_7")
    .reduce((s, b) => s + b.count, 0);

  const chartSummary =
    `Bar chart of active memberships by time to expiry. ` +
    buckets.map((b) => `${b.label}: ${b.count}`).join("; ") +
    `. ${total} active memberships in total.`;

  return (
    <Card className="h-100">
      <CardHeader>
        <h5 className="card-title mb-1">Expiry pipeline</h5>
        <small className="text-muted">
          Active memberships by how soon they run out
        </small>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading the expiry pipeline</span>
          </div>
        ) : (
          <>
            {data?.truncated ? (
              <Alert color="warning">
                The member roster was read up to its cap, so these counts may be
                incomplete. Filter by branch for the full picture.
              </Alert>
            ) : null}

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">Active memberships</p>
                  <h5 className="mb-0">{total.toLocaleString("en-IN")}</h5>
                </div>
              </Col>
              <Col xs={6}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">
                    Expired or expiring this week
                  </p>
                  <h5 className="mb-0">{expiringSoon.toLocaleString("en-IN")}</h5>
                </div>
              </Col>
            </Row>

            <div role="img" aria-label={chartSummary}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={buckets}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={tokens.grid}
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Memberships" fill={tokens.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ChartDataTable
              caption="Active memberships by time to expiry"
              columns={[
                { key: "label", label: "Window" },
                { key: "count", label: "Memberships" },
              ]}
              rows={buckets}
              summaryLabel="Show the expiry buckets as a table"
              emptyText="No active memberships."
            />

            <Row className="g-2 align-items-end mt-3">
              <Col md>
                <h6 className="mb-0">Who to call</h6>
              </Col>
              <Col md="auto" style={{ minWidth: 240 }}>
                <Label for="expiry-bucket" className="form-label mb-1 small">
                  Show members in
                </Label>
                <Input
                  id="expiry-bucket"
                  type="select"
                  bsSize="sm"
                  value={selected?.key || ""}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  {buckets.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label} ({b.count})
                    </option>
                  ))}
                </Input>
              </Col>
            </Row>

            {!selected || selected.members.length === 0 ? (
              <p className="text-muted small mt-2 mb-0">
                No members in this window.
              </p>
            ) : (
              <>
                <p className="text-muted small mt-2 mb-1">
                  Showing {selected.members.length} of {selected.count} — this is
                  a sample, not the whole bucket. Export the member list for the
                  full set.
                </p>
                <div className="table-responsive">
                  <Table size="sm" className="align-middle mb-0">
                    <caption className="visually-hidden">
                      Sample of members in the {selected.label} window
                    </caption>
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Member</th>
                        <th scope="col">Branch</th>
                        <th scope="col">Ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.members.map((m) => (
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
                          <td className="text-nowrap">
                            {formatDate(m.endDate)}
                            <div className="text-muted small">
                              {m.daysToExpiry < 0
                                ? `${Math.abs(m.daysToExpiry)} days ago`
                                : `in ${m.daysToExpiry} days`}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            )}

            <p className="text-muted small mt-3 mb-0">
              <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
              As of {formatDate(data?.asOf)}. Counts are active memberships,
              taken from the member records; the money owed against them is on
              the ageing panel and comes from the ledger.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
};

ExpiryPipelinePanel.propTypes = {
  /** `data` from GET /reports/expiry-pipeline. */
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default ExpiryPipelinePanel;

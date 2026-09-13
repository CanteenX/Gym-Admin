import PropTypes from "prop-types";
import React, { useMemo } from "react";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
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
import { chartTokens, currency, formatDate } from "../insightsFormat";

/**
 * Two different things both get called "ageing", and this panel shows both
 * because the useful question needs them together: who is about to churn, and
 * who owes money.
 *
 *   tenure[]      how long each active member has been with the gym. Measured
 *                 from Member.createdAt, NOT from the current period's
 *                 startDate — a member on their fifth renewal has been here
 *                 five periods, and startDate only knows about the latest one.
 *   receivables[] outstanding balance for the CURRENT period, bucketed by how
 *                 old that period is.
 *
 * ============================================================================
 * WHERE THE OUTSTANDING FIGURE COMES FROM, AND WHERE IT MUST NOT
 * ============================================================================
 * It is `Member.totalFee` (a price, which lives on the member) minus the sum of
 * Transaction receipts since that member's startDate (money actually received,
 * from the append-only ledger). It is NOT summed from `Member.payments[]`,
 * which is cleared on renewal — summing that looks right and goes wrong the
 * moment anybody renews, with no error and a plausible number.
 *
 * The server does that arithmetic in one aggregation; nothing here recomputes
 * it, so there is no second implementation to drift.
 */
const MemberAgeingPanel = ({ data, loading }) => {
  const tenure = data?.tenure || [];
  const receivables = data?.receivables || [];
  const debtors = useMemo(() => data?.topDebtors || [], [data]);
  const tokens = chartTokens();

  const totalOutstanding = Number(data?.totalOutstanding || 0);
  const totalMembers = Number(data?.totalMembers || 0);

  const tenureSummary =
    `Bar chart of how long active members have been with the gym. ` +
    tenure.map((t) => `${t.label}: ${t.count}`).join("; ") +
    `. ${totalMembers} active members in total.`;

  return (
    <Card className="h-100">
      <CardHeader>
        <h5 className="card-title mb-1">Member ageing</h5>
        <small className="text-muted">
          How long members have stayed, and what is still owed
        </small>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading member ageing</span>
          </div>
        ) : (
          <>
            {data?.truncated ? (
              <Alert color="warning">
                The member roster was read up to its cap, so these totals may be
                incomplete. Filter by branch for the full picture.
              </Alert>
            ) : null}

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">Active members</p>
                  <h5 className="mb-0">{totalMembers.toLocaleString("en-IN")}</h5>
                </div>
              </Col>
              <Col xs={6}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">Outstanding dues</p>
                  <h5 className="mb-0">{currency(totalOutstanding)}</h5>
                </div>
              </Col>
            </Row>

            <h6 className="text-uppercase text-muted fs-12 mb-2">
              How long members have stayed
            </h6>
            <div role="img" aria-label={tenureSummary}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tenure}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={tokens.grid}
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Members" fill={tokens.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartDataTable
              caption="Active members by how long they have been with the gym"
              columns={[
                { key: "label", label: "Tenure" },
                { key: "count", label: "Members" },
              ]}
              rows={tenure}
              summaryLabel="Show tenure cohorts as a table"
              emptyText="No active members."
            />

            <h6 className="text-uppercase text-muted fs-12 mb-2 mt-4">
              Outstanding dues by age of the membership period
            </h6>
            <div className="table-responsive">
              <Table size="sm" className="align-middle mb-0">
                <caption className="visually-hidden">
                  Outstanding member dues bucketed by how old the current
                  membership period is
                </caption>
                <thead className="table-light">
                  <tr>
                    <th scope="col">Period age</th>
                    <th scope="col" className="text-end">
                      Members
                    </th>
                    <th scope="col" className="text-end">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr key={r.key}>
                      <th scope="row" className="fw-normal">
                        {r.label}
                      </th>
                      <td className="text-end">{r.count}</td>
                      <td className="text-end">{currency(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <h6 className="text-uppercase text-muted fs-12 mb-2 mt-4">
              Oldest balances first
            </h6>
            {debtors.length === 0 ? (
              <p className="text-muted mb-0">Nothing is outstanding.</p>
            ) : (
              <div className="table-responsive">
                <Table size="sm" className="align-middle mb-0">
                  <caption className="visually-hidden">
                    Members with an outstanding balance, oldest debt first
                  </caption>
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Branch</th>
                      <th scope="col" className="text-end">
                        Fee
                      </th>
                      <th scope="col" className="text-end">
                        Paid
                      </th>
                      <th scope="col" className="text-end">
                        Balance
                      </th>
                      <th scope="col">Period started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtors.slice(0, 25).map((m) => (
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
                        <td className="text-end text-nowrap">
                          {currency(m.totalFee)}
                        </td>
                        <td className="text-end text-nowrap">
                          {currency(m.paid)}
                        </td>
                        <td className="text-end text-nowrap">
                          <Badge color="danger">{currency(m.balance)}</Badge>
                        </td>
                        <td className="text-nowrap">
                          {formatDate(m.startDate)}
                          <div className="text-muted small">
                            {m.ageDays} days ago
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
            {debtors.length > 25 ? (
              <p className="text-muted small mt-2 mb-0">
                Showing the 25 oldest of {debtors.length}. Export the member list
                or the ledger for the rest.
              </p>
            ) : null}

            {data?.source ? (
              <p className="text-muted small mt-3 mb-0">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                {data.source}
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
};

MemberAgeingPanel.propTypes = {
  /** `data` from GET /reports/member-ageing. */
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default MemberAgeingPanel;

import PropTypes from "prop-types";
import React, { useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartDataTable from "../../../Components/Common/ChartDataTable";
import {
  branchColor,
  chartTokens,
  currency,
  currencyAxis,
} from "../insightsFormat";

/**
 * Money IN, by month and branch.
 *
 * Every rupee here comes from the Transaction ledger, which is append-only.
 * Nothing on this panel is recomputed from a member record: `Member.payments[]`
 * is the current period's balance and is cleared on renewal, so a total summed
 * from it quietly drops everything collected before each member's last renewal
 * and still looks like a plausible number.
 *
 * "Common" cannot appear here for a branch admin — the server pins their scope
 * to their own branch — but it CAN appear as a series for a super admin if a
 * shared-cost receipt was ever booked, which is why the series are drawn from
 * whatever branches the response actually returned rather than a hardcoded two.
 */
const MONTH_OPTIONS = [6, 12, 24];

const CollectionsPanel = ({ data, loading, months, onMonthsChange }) => {
  const series = data?.series || [];
  const branches = data?.branches || [];
  const tokens = chartTokens();

  // Recharts reads nested keys with a dotted string, but a branch name can
  // contain a space or a dot, so byBranch is flattened onto the row instead.
  const rows = useMemo(
    () =>
      series.map((m) => ({
        ...m,
        ...Object.fromEntries(
          branches.map((b) => [b, m.byBranch?.[b] || 0]),
        ),
      })),
    [series, branches],
  );

  const total = Number(data?.total || 0);
  const best = useMemo(
    () => rows.reduce((b, r) => (r.total > (b?.total || 0) ? r : b), null),
    [rows],
  );

  const chartSummary =
    `Bar chart of collections per month for the last ${months} months, ` +
    `by branch. ${currency(total)} collected in total` +
    (best ? `, best month ${best.label} at ${currency(best.total)}.` : ".");

  const tableColumns = useMemo(
    () => [
      { key: "label", label: "Month" },
      ...branches.map((b) => ({
        key: b,
        label: b,
        format: (v) => currency(v),
      })),
      { key: "total", label: "Total", format: (v) => currency(v) },
      { key: "receipts", label: "Receipts" },
      { key: "joinings", label: "Joinings" },
      { key: "renewals", label: "Renewals" },
    ],
    [branches],
  );

  return (
    <Card className="h-100">
      <CardHeader>
        <Row className="g-2 align-items-end">
          <Col md>
            <h5 className="card-title mb-1">Collections</h5>
            <small className="text-muted">
              Money received, from the cash ledger
            </small>
          </Col>
          <Col md="auto" style={{ minWidth: 190 }}>
            <Label for="collections-months" className="form-label mb-1 small">
              Period
            </Label>
            <Input
              id="collections-months"
              type="select"
              bsSize="sm"
              value={months}
              onChange={(e) => onMonthsChange(Number(e.target.value))}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Last {m} months
                </option>
              ))}
            </Input>
          </Col>
        </Row>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading collections</span>
          </div>
        ) : (
          <>
            <Row className="g-2 mb-3">
              <Col xs={6} md={4}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">Collected in period</p>
                  <h5 className="mb-0">{currency(total)}</h5>
                </div>
              </Col>
              {(data?.byBranch || []).map((b) => (
                <Col xs={6} md={4} key={b.branch}>
                  <div className="border rounded p-2">
                    <p className="text-muted mb-1 small">{b.branch}</p>
                    <h5 className="mb-0">{currency(b.total)}</h5>
                    <p className="text-muted mb-0 small">
                      {b.receipts} receipts
                    </p>
                  </div>
                </Col>
              ))}
            </Row>

            <div role="img" aria-label={chartSummary}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={tokens.grid}
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={currencyAxis} />
                  <Tooltip formatter={(v) => currency(v)} />
                  <Legend />
                  {branches.map((b, i) => (
                    <Bar
                      key={b}
                      dataKey={b}
                      name={b}
                      stackId="collections"
                      fill={branchColor(i)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ChartDataTable
              caption="Collections per month and branch"
              columns={tableColumns}
              rows={rows}
              summaryLabel="Show collections as a table"
              emptyText="No receipts in this period."
            />

            {data?.source ? (
              <p className="text-muted small mt-3 mb-0">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                Source: {data.source}.
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
};

CollectionsPanel.propTypes = {
  /** `data` from GET /reports/collections. */
  data: PropTypes.object,
  loading: PropTypes.bool,
  months: PropTypes.number.isRequired,
  onMonthsChange: PropTypes.func.isRequired,
};

export default CollectionsPanel;

import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { Card, CardBody, CardHeader, Col, Row, Spinner } from "reactstrap";
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
  formatDayShort,
  minutesLabel,
} from "../insightsFormat";

/**
 * Check-ins per branch per day.
 *
 * The word on every label here is CHECK-IN, never "visit". A row in the
 * attendance collection means a member pressed a button in the portal; the
 * branch QR is a printed sticker that can be photographed, and the portal's
 * check-in button needs no QR at all. So this chart is a picture of logging
 * behaviour. The server says as much in `data.basis` and that string is
 * rendered rather than paraphrased, so the caveat cannot drift away from the
 * numbers it applies to.
 */

/**
 * The API returns one row per (branch, date). Recharts wants one row per date
 * with a key per series, so the rows are pivoted here rather than asking the
 * server for a second shape of the same data.
 */
const pivot = (days) => {
  const byDate = new Map();
  for (const d of days || []) {
    const key = new Date(d.date).toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, { key, date: d.date, label: formatDayShort(d.date), total: 0 });
    }
    const row = byDate.get(key);
    row[d.branch] = (row[d.branch] || 0) + d.checkIns;
    row.total += d.checkIns;
  }
  return [...byDate.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const FootfallPanel = ({ data, loading }) => {
  const days = data?.days || [];
  const branches = useMemo(
    () => [...new Set(days.map((d) => d.branch))].sort(),
    [days],
  );
  const rows = useMemo(() => pivot(days), [days]);
  const tokens = chartTokens();

  const totalCheckIns = data?.totalCheckIns || 0;
  const busiest = useMemo(
    () => rows.reduce((best, r) => (r.total > (best?.total || 0) ? r : best), null),
    [rows],
  );

  /**
   * The chart's own text alternative. A screen reader gets this sentence and
   * then the full table below it; without both, an SVG of bars is silence.
   */
  const chartSummary =
    `Bar chart of logged check-ins per day across ${branches.length || 0} ` +
    `${branches.length === 1 ? "branch" : "branches"}. ` +
    `${totalCheckIns.toLocaleString("en-IN")} check-ins in total over ` +
    `${rows.length} ${rows.length === 1 ? "day" : "days"}` +
    (busiest ? `, busiest on ${busiest.label} with ${busiest.total}.` : ".");

  const tableColumns = useMemo(
    () => [
      { key: "label", label: "Day" },
      ...branches.map((b) => ({
        key: b,
        label: b,
        format: (v) => (v === undefined ? 0 : v),
      })),
      { key: "total", label: "All branches" },
    ],
    [branches],
  );

  return (
    <Card className="h-100">
      <CardHeader>
        <h5 className="card-title mb-1">Check-ins per day</h5>
        <small className="text-muted">
          Sessions members logged themselves, by branch
        </small>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading check-in figures</span>
          </div>
        ) : (
          <>
            <Row className="g-2 mb-3">
              <Col xs={6} md={3}>
                <div className="border rounded p-2">
                  <p className="text-muted mb-1 small">Check-ins logged</p>
                  <h5 className="mb-0">
                    {totalCheckIns.toLocaleString("en-IN")}
                  </h5>
                </div>
              </Col>
              {(data?.byBranch || []).map((b) => (
                <Col xs={6} md={3} key={b.branch}>
                  <div className="border rounded p-2">
                    <p className="text-muted mb-1 small">{b.branch}</p>
                    <h5 className="mb-0">
                      {Number(b.checkIns || 0).toLocaleString("en-IN")}
                    </h5>
                    <p className="text-muted mb-0 small">
                      {minutesLabel(b.totalMinutes)} logged
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
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {branches.map((b, i) => (
                    <Bar
                      key={b}
                      dataKey={b}
                      name={b}
                      stackId="checkins"
                      fill={branchColor(i)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ChartDataTable
              caption="Logged check-ins per day and branch"
              columns={tableColumns}
              rows={rows}
              summaryLabel="Show check-ins as a table"
              emptyText="No check-ins were logged in this period."
            />

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

FootfallPanel.propTypes = {
  /** `data` from GET /attendance/footfall. */
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default FootfallPanel;

import PropTypes from "prop-types";
import React from "react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  Col,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { currency, formatDate } from "../insightsFormat";

/**
 * Profit and loss.
 *
 * ============================================================================
 * THE ONE THING THIS PANEL EXISTS TO GET RIGHT: "Common" IS NOT A BRANCH.
 * ============================================================================
 * `Transaction.branch` carries a third value, "Common": shared rent, software,
 * the accountant, the owner's salary. Those belong to the business, not to
 * either floor, and folding them into one branch's numbers would make that
 * branch look unprofitable for costs it does not carry.
 *
 * The response is therefore three separate keys and they are rendered as three
 * visually separate things:
 *
 *   branches[]    one card per gym. A branch's `net` is its TRADING RESULT.
 *   common        the shared-overhead block, in its own bordered section under
 *                 a heading that says it sits outside every branch.
 *   consolidated  the only figure that is the business's profit.
 *
 * `sum(branches[].net)` is deliberately NOT the same number as
 * `consolidated.net`, and the panel says so rather than leaving a reader to
 * find the discrepancy and assume one of them is broken.
 *
 * ============================================================================
 * WHEN `common` AND `consolidated` COME BACK null (A BRANCH ADMIN)
 * ============================================================================
 * The server returns null, not an empty object, precisely so a UI cannot render
 * an all-zero "Common" card and imply those costs are nil. So this panel must
 * not invent a zero — and it must not silently present a branch's trading
 * result as though it were the whole picture either. It renders an explicit
 * statement instead: shared overhead exists, it is held outside these numbers,
 * and it is the owner's to see. Saying nothing would be the actual failure
 * mode; a branch manager would reasonably read "Net ₹1,20,000" as profit.
 */

const PnlFigures = ({ income, expense, net }) => (
  <Row className="g-2">
    <Col xs={4}>
      <p className="text-muted mb-1 small">Income</p>
      <h6 className="mb-0">{currency(income)}</h6>
    </Col>
    <Col xs={4}>
      <p className="text-muted mb-1 small">Expenses</p>
      <h6 className="mb-0">{currency(expense)}</h6>
    </Col>
    <Col xs={4}>
      <p className="text-muted mb-1 small">Net</p>
      <h6 className={`mb-0 ${net < 0 ? "text-danger" : "text-success"}`}>
        {currency(net)}
      </h6>
    </Col>
  </Row>
);

PnlFigures.propTypes = {
  income: PropTypes.number,
  expense: PropTypes.number,
  net: PropTypes.number,
};

const CategoryTable = ({ rows, caption }) => {
  if (!rows || rows.length === 0) {
    return <p className="text-muted small mb-0">No expenses booked.</p>;
  }
  return (
    <div className="table-responsive">
      <Table size="sm" className="mb-0 align-middle">
        <caption className="visually-hidden">{caption}</caption>
        <thead className="table-light">
          <tr>
            <th scope="col">Expense category</th>
            <th scope="col" className="text-end">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.category}>
              <th scope="row" className="fw-normal">
                {c.category}
              </th>
              <td className="text-end">{currency(c.total)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

CategoryTable.propTypes = {
  rows: PropTypes.array,
  caption: PropTypes.string.isRequired,
};

const ProfitLossPanel = ({ data, loading }) => {
  const branches = data?.branches || [];
  const common = data?.common || null;
  const consolidated = data?.consolidated || null;
  const branchNetTotal = branches.reduce((s, b) => s + (b.net || 0), 0);

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-1">Profit and loss</h5>
        <small className="text-muted">
          {data?.from && data?.to
            ? `${formatDate(data.from)} to ${formatDate(data.to)}`
            : "From the cash ledger"}
        </small>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <span className="visually-hidden">Loading profit and loss</span>
          </div>
        ) : (
          <>
            <h6 className="text-uppercase text-muted fs-12 mb-2">
              Trading result by branch
            </h6>
            {branches.length === 0 ? (
              <p className="text-muted">
                No ledger entries in this period.
              </p>
            ) : (
              <Row className="g-3">
                {branches.map((b) => (
                  <Col md={6} key={b.branch}>
                    <Card className="border shadow-none mb-0 h-100">
                      <CardBody>
                        <h6 className="mb-3">{b.branch}</h6>
                        <PnlFigures
                          income={b.income}
                          expense={b.expense}
                          net={b.net}
                        />
                        <hr />
                        <CategoryTable
                          rows={b.expenseByCategory}
                          caption={`Expenses by category for ${b.branch}`}
                        />
                      </CardBody>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <h6 className="text-uppercase text-muted fs-12 mb-2 mt-4">
              Held outside every branch
            </h6>

            {common ? (
              <Card className="border border-2 shadow-none mb-0">
                <CardBody>
                  <h6 className="mb-1">Shared overhead (&ldquo;Common&rdquo;)</h6>
                  <p className="text-muted small">
                    Rent, software, accountancy and the owner&rsquo;s salary are
                    booked to the business, not to a floor. These figures are
                    <strong> not</strong> included in either branch above —
                    charging them to one branch would make it look unprofitable
                    for costs it does not carry.
                  </p>
                  <PnlFigures
                    income={common.income}
                    expense={common.expense}
                    net={common.net}
                  />
                  <hr />
                  <CategoryTable
                    rows={common.expenseByCategory}
                    caption="Shared overhead by expense category"
                  />
                </CardBody>
              </Card>
            ) : (
              <Alert color="info" className="mb-0">
                <h6 className="alert-heading mb-1">
                  Shared overhead is not shown on this account
                </h6>
                <p className="mb-0">
                  Business-level costs — rent, software, accountancy, the
                  owner&rsquo;s salary — are booked to a shared
                  &ldquo;Common&rdquo; bucket that is held outside every
                  branch&rsquo;s numbers on purpose, and only the owner can see
                  it. So the figures above are the branch&rsquo;s{" "}
                  <strong>trading result</strong>, not the gym business&rsquo;s
                  profit. Nothing is missing from the branch itself; the shared
                  costs simply were never charged to it.
                </p>
              </Alert>
            )}

            <h6 className="text-uppercase text-muted fs-12 mb-2 mt-4">
              Whole business
            </h6>

            {consolidated ? (
              <Card className="border border-2 shadow-none mb-0">
                <CardBody>
                  <h6 className="mb-1">
                    Consolidated — branches plus shared overhead
                  </h6>
                  <p className="text-muted small">
                    The only figure on this page that is the business&rsquo;s
                    profit. It will not equal the branch nets added together
                    ({currency(branchNetTotal)}), because shared overhead is
                    counted here and nowhere else.
                  </p>
                  <PnlFigures
                    income={consolidated.income}
                    expense={consolidated.expense}
                    net={consolidated.net}
                  />
                </CardBody>
              </Card>
            ) : (
              <p className="text-muted mb-0">
                A consolidated figure covers both branches plus shared overhead,
                so it is only available to the owner. Ask them for it rather
                than adding the branch figures together — that sum leaves out
                shared costs entirely.
              </p>
            )}

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

ProfitLossPanel.propTypes = {
  /** `data` from GET /reports/profit-loss. */
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default ProfitLossPanel;

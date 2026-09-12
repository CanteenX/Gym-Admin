import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Label,
  Input,
  Row,
  Button,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  Badge,
  Nav,
  NavItem,
  NavLink,
  Spinner,
} from "reactstrap";
import DataTable from "react-data-table-component";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  searchTransactions,
  getCashFlowSummary,
  recordIncome,
  recordExpense,
  cancelTransaction,
} from "../../api/transactions.api";
import { listAllExpenseCategories } from "../../api/expenseCategories.api";
import { listBranches } from "../../api/branches.api";
import { searchMembers } from "../../api/members.api";

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"];

// branch is seeded from the branch master once it loads, so opening a third
// gym needs no code change here.
const emptyIncome = {
  memberId: "",
  amount: "",
  transactionDate: toInputDate(new Date()),
  mode: "Cash",
  branch: "",
  note: "",
};

const emptyExpense = {
  amount: "",
  transactionDate: toInputDate(new Date()),
  mode: "Cash",
  branch: "",
  category: "",
  paidTo: "",
  billNo: "",
  note: "",
};

const TABS = [
  { key: "", label: "All Entries" },
  { key: "IN", label: "Incoming" },
  { key: "OUT", label: "Outgoing" },
];

/**
 * Opens a print-ready A5 receipt in a new window.
 *
 * Rendering plain HTML rather than generating a PDF server-side keeps the
 * server dependency-free — the browser's own print dialog covers both
 * "Print" and "Save as PDF".
 */
const openReceipt = (txn, companyName) => {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    toast.error("Allow pop-ups to print receipts");
    return;
  }

  const period =
    txn.periodStart && txn.periodEnd
      ? `${formatDate(txn.periodStart)} — ${formatDate(txn.periodEnd)}`
      : "—";

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${txn.receiptNo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
           color: #1b2a4e; margin: 0; padding: 32px; background: #fff; }
    .sheet { max-width: 560px; margin: 0 auto; border: 1px solid #e3e7ee;
             border-radius: 10px; padding: 28px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #1b2a4e; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -.3px; }
    .brand span { color: #b91c1c; }
    .sub { font-size: 11px; color: #667089; margin-top: 3px;
           letter-spacing: .08em; text-transform: uppercase; }
    .rcpt { text-align: right; font-size: 12px; }
    .rcpt b { display: block; font-size: 15px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 8px 0; font-size: 13px; vertical-align: top; }
    td.k { color: #667089; width: 42%; }
    td.v { font-weight: 600; text-align: right; }
    .total { margin-top: 18px; background: #f7f8fa; border-radius: 8px; padding: 14px 16px;
             display: flex; justify-content: space-between; align-items: center; }
    .total .lbl { font-size: 12px; color: #667089; text-transform: uppercase; letter-spacing: .08em; }
    .total .amt { font-size: 24px; font-weight: 800; }
    .foot { margin-top: 22px; display: flex; justify-content: space-between;
            font-size: 11px; color: #667089; border-top: 1px dashed #e3e7ee; padding-top: 14px; }
    .btns { max-width: 560px; margin: 18px auto 0; text-align: right; }
    button { font: inherit; padding: 8px 18px; border-radius: 6px; border: 1px solid #1b2a4e;
             background: #1b2a4e; color: #fff; cursor: pointer; }
    @media print { .btns { display: none; } body { padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand">MID<span>CITY</span> GYM</div>
        <div class="sub">Vadodara · ${txn.branch} Branch</div>
      </div>
      <div class="rcpt">
        Receipt No.<b>${txn.receiptNo || "—"}</b>
        <div style="margin-top:6px">Date<b>${formatDate(txn.transactionDate)}</b></div>
      </div>
    </div>

    <table>
      <tr><td class="k">Received from</td><td class="v">${txn.memberName || "—"}</td></tr>
      <tr><td class="k">Contact</td><td class="v">${txn.memberMobile || "—"}</td></tr>
      <tr><td class="k">Plan</td><td class="v">${txn.planCode || "—"}</td></tr>
      <tr><td class="k">Membership period</td><td class="v">${period}</td></tr>
      <tr><td class="k">Payment mode</td><td class="v">${txn.mode}</td></tr>
      ${txn.note ? `<tr><td class="k">Note</td><td class="v">${txn.note}</td></tr>` : ""}
    </table>

    <div class="total">
      <span class="lbl">Amount Received</span>
      <span class="amt">${currency(txn.amount)}</span>
    </div>

    <div class="foot">
      <span>${companyName || "Mid City Gym"}</span>
      <span>Authorised Signatory</span>
    </div>
  </div>

  <div class="btns"><button onclick="window.print()">Print / Save as PDF</button></div>
</body>
</html>`);
  win.document.close();
};

const CashFlow = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || {
    read: true,
    write: true,
    edit: true,
    delete: true,
  };

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [months, setMonths] = useState(6);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ totalIn: 0, totalOut: 0, net: 0 });
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);

  const [tab, setTab] = useState("");
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");

  const [categories, setCategories] = useState([]);
  // All branches INCLUDING non-physical cost buckets such as "Common" — shared
  // expenses (rent, software, owner salary) are booked against those.
  const [branches, setBranches] = useState([]);
  const [members, setMembers] = useState([]);

  const [incomeModal, setIncomeModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState(emptyIncome);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [isSaving, setIsSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getCashFlowSummary(months, branch);
      if (res.data.isOk) setSummary(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }, [months, branch]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const res = await searchTransactions({
        skip,
        per_page: perPage,
        direction: tab || undefined,
        branch: branch || undefined,
        category: category || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        match: query,
      });
      if (res.data?.data?.length > 0) {
        const d = res.data.data[0];
        setRows(d.data || []);
        setTotalRows(d.count || 0);
        setTotals({ totalIn: d.totalIn, totalOut: d.totalOut, net: d.net });
      } else {
        setRows([]);
        setTotalRows(0);
        setTotals({ totalIn: 0, totalOut: 0, net: 0 });
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load entries");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, tab, branch, category, fromDate, toDate, query]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    listAllExpenseCategories()
      .then((r) => r.data.isOk && setCategories(r.data.data || []))
      .catch(() => {});
    // No physicalOnly here on purpose: the ledger must be able to book shared
    // costs against non-physical branches like "Common".
    listBranches()
      .then((r) => {
        if (!r.data.isOk) return;
        const list = r.data.data || [];
        setBranches(list);
        // Default a new entry to the first branch in display order rather than
        // a hardcoded name. Only fills a blank — never overwrites a user pick.
        const first = list[0]?.name;
        if (first) {
          setIncomeForm((f) => (f.branch ? f : { ...f, branch: first }));
          setExpenseForm((f) => (f.branch ? f : { ...f, branch: first }));
        }
      })
      // An empty list is better than a hard failure; the forms keep whatever
      // branch the record already carries.
      .catch((err) => console.error("Error loading branches:", err));
    searchMembers({
      skip: 0,
      per_page: 500,
      sorton: "fullName",
      sortdir: "asc",
    })
      .then((r) => {
        if (r.data?.data?.length > 0) setMembers(r.data.data[0].data || []);
      })
      .catch(() => {});
  }, []);

  const refreshAll = () => {
    loadSummary();
    loadRows();
  };

  const submitIncome = async () => {
    if (!incomeForm.amount || Number(incomeForm.amount) <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setIsSaving(true);
    try {
      const res = await recordIncome(incomeForm);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setIncomeModal(false);
        setIncomeForm({ ...emptyIncome, branch: branches[0]?.name || "" });
        refreshAll();
        openReceipt(res.data.data, adminData?.companyName);
      } else {
        toast.error(res.data.message || "Failed to record payment");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  };

  const submitExpense = async () => {
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (!expenseForm.category) {
      toast.error("Pick a category");
      return;
    }
    setIsSaving(true);
    try {
      const res = await recordExpense(expenseForm);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setExpenseModal(false);
        setExpenseForm({ ...emptyExpense, branch: branches[0]?.name || "" });
        refreshAll();
      } else {
        toast.error(res.data.message || "Failed to record expense");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async (row) => {
    const label = row.direction === "IN" ? "payment" : "expense";
    if (!window.confirm(`Cancel this ${label} of ${currency(row.amount)}?`)) {
      return;
    }
    try {
      const res = await cancelTransaction(row._id);
      if (res.data.isOk) {
        toast.success(res.data.message);
        refreshAll();
      } else {
        toast.error(res.data.message || "Failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const clearFilters = () => {
    setBranch("");
    setCategory("");
    setFromDate("");
    setToDate("");
    setQuery("");
    setPageNo(1);
  };

  const col = useMemo(
    () => [
      {
        name: "Date",
        cell: (row) => (
          <div className="small">
            <div className="fw-semibold">{formatDate(row.transactionDate)}</div>
            <div className="text-muted">{row.branch}</div>
          </div>
        ),
        minWidth: "130px",
      },
      {
        name: "Type",
        cell: (row) => (
          <Badge color={row.direction === "IN" ? "success" : "danger"}>
            {row.direction === "IN" ? "IN" : "OUT"}
          </Badge>
        ),
        width: "90px",
      },
      {
        name: "Details",
        cell: (row) => (
          <div className="py-2 small">
            {row.direction === "IN" ? (
              <>
                <div className="fw-semibold">{row.memberName || "Walk-in"}</div>
                <div className="text-muted">
                  {row.receiptNo}
                  {row.memberMobile ? ` · ${row.memberMobile}` : ""}
                </div>
              </>
            ) : (
              <>
                <div className="fw-semibold">{row.category}</div>
                <div className="text-muted">
                  {row.paidTo || "—"}
                  {row.billNo ? ` · Bill ${row.billNo}` : ""}
                </div>
              </>
            )}
          </div>
        ),
        minWidth: "230px",
      },
      {
        name: "Mode",
        selector: (row) => row.mode,
        width: "120px",
      },
      {
        name: "Amount",
        cell: (row) => (
          <span
            className={`fw-semibold ${
              row.direction === "IN" ? "text-success" : "text-danger"
            }`}
          >
            {row.direction === "IN" ? "+" : "−"} {currency(row.amount)}
          </span>
        ),
        right: true,
        minWidth: "130px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex gap-1 py-1">
            {row.direction === "IN" && (
              <button
                className="btn btn-sm btn-soft-primary"
                onClick={() => openReceipt(row, adminData?.companyName)}
                title="Print receipt"
              >
                <i className="ri-printer-line"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-soft-danger"
                onClick={() => handleCancel(row)}
                title="Cancel entry"
              >
                <i className="ri-close-circle-line"></i>
              </button>
            )}
          </div>
        ),
        minWidth: "120px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, adminData],
  );

  const tiles = summary?.tiles || {};

  document.title = `Cash Flow | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Accounts"
            title="Cash Flow"
            pageTitle="Cash Flow"
          />

          {/* Headline tiles */}
          <Row className="g-3 mb-2">
            {[
              {
                label: "Collected Today",
                value: tiles.todayIn,
                color: "success",
                icon: "ri-arrow-down-circle-line",
              },
              {
                label: "Spent Today",
                value: tiles.todayOut,
                color: "danger",
                icon: "ri-arrow-up-circle-line",
              },
              {
                label: "This Month In",
                value: tiles.monthIn,
                color: "primary",
                icon: "ri-calendar-check-line",
              },
              {
                label: "This Month Net",
                value: tiles.monthNet,
                color: (tiles.monthNet || 0) >= 0 ? "success" : "danger",
                icon: "ri-scales-3-line",
              },
            ].map((t) => (
              <Col xl={3} md={6} key={t.label}>
                <Card className="mb-0 h-100">
                  <CardBody>
                    <div className="d-flex align-items-center justify-content-between">
                      <p
                        className="text-uppercase fw-medium text-muted mb-0"
                        style={{ fontSize: 11, letterSpacing: ".5px" }}
                      >
                        {t.label}
                      </p>
                      <span
                        className={`avatar-title bg-${t.color}-subtle text-${t.color} rounded fs-5 d-flex align-items-center justify-content-center`}
                        style={{ width: 38, height: 38 }}
                      >
                        <i className={t.icon}></i>
                      </span>
                    </div>
                    <h3 className="fs-22 fw-semibold mt-3 mb-0">
                      {currency(t.value)}
                    </h3>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Charts */}
          <Row className="g-3">
            <Col lg={8}>
              <Card className="h-100">
                <CardHeader className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="card-title mb-0">Monthwise Cash Flow</h5>
                    <small className="text-muted">Incoming vs outgoing</small>
                  </div>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ width: 130 }}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    <option value={3}>Last 3 months</option>
                    <option value={6}>Last 6 months</option>
                    <option value={12}>Last 12 months</option>
                  </Input>
                </CardHeader>
                <CardBody>
                  {summaryLoading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={summary?.series || []}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e3e7ee"
                          vertical={false}
                        />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `₹${v / 1000}k`}
                        />
                        <Tooltip formatter={(v) => currency(v)} />
                        <Legend />
                        <Bar
                          dataKey="incoming"
                          name="Incoming"
                          fill="#22346b"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="outgoing"
                          name="Outgoing"
                          fill="#a83a32"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="h-100">
                <CardHeader>
                  <h5 className="card-title mb-0">Net Trend</h5>
                  <small className="text-muted">Income minus expenses</small>
                </CardHeader>
                <CardBody>
                  {summaryLoading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={summary?.series || []}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e3e7ee"
                            vertical={false}
                          />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => currency(v)} />
                          <Line
                            type="monotone"
                            dataKey="net"
                            name="Net"
                            stroke="#22346b"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      <h6
                        className="fw-bold mt-3 mb-2"
                        style={{ fontSize: 12 }}
                      >
                        TOP EXPENSE CATEGORIES
                      </h6>
                      {(summary?.byCategory || []).length === 0 ? (
                        <p className="text-muted small mb-0">
                          No expenses recorded yet.
                        </p>
                      ) : (
                        summary.byCategory.slice(0, 5).map((c) => (
                          <div
                            key={c.category}
                            className="d-flex justify-content-between border-bottom py-2 small"
                          >
                            <span>{c.category}</span>
                            <span className="fw-semibold">
                              {currency(c.total)}
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Ledger */}
          <Row className="g-3 mt-1">
            <Col xs={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h5 className="card-title mb-0 flex-grow-1">Entries</h5>
                  <div className="d-flex gap-2 flex-wrap">
                    {permissions.write && (
                      <>
                        <Button
                          color="success"
                          size="sm"
                          onClick={() => setIncomeModal(true)}
                        >
                          <i className="ri-add-line align-bottom"></i> Record
                          Payment
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => setExpenseModal(true)}
                        >
                          <i className="ri-subtract-line align-bottom"></i>{" "}
                          Record Expense
                        </Button>
                      </>
                    )}
                    <Button color="light" size="sm" onClick={refreshAll}>
                      <i className="ri-refresh-line align-bottom"></i>
                    </Button>
                  </div>
                </CardHeader>

                <CardBody>
                  <Nav tabs className="nav-tabs-custom mb-3">
                    {TABS.map((t) => (
                      <NavItem key={t.key || "all"}>
                        <NavLink
                          href="#"
                          className={tab === t.key ? "active fw-semibold" : ""}
                          onClick={(e) => {
                            e.preventDefault();
                            setTab(t.key);
                            setPageNo(1);
                          }}
                        >
                          {t.label}
                        </NavLink>
                      </NavItem>
                    ))}
                  </Nav>

                  {/* Filters */}
                  <Row className="g-2 mb-3">
                    <Col md={2}>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setPageNo(1);
                        }}
                      />
                    </Col>
                    <Col md={2}>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setPageNo(1);
                        }}
                      />
                    </Col>
                    <Col md={2}>
                      <Input
                        type="select"
                        bsSize="sm"
                        value={branch}
                        onChange={(e) => {
                          setBranch(e.target.value);
                          setPageNo(1);
                        }}
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b._id} value={b.name}>
                            {b.displayName || b.name}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={2}>
                      <Input
                        type="select"
                        bsSize="sm"
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setPageNo(1);
                        }}
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={3}>
                      <Input
                        type="text"
                        bsSize="sm"
                        placeholder="Search name, receipt, bill..."
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setPageNo(1);
                        }}
                      />
                    </Col>
                    <Col md={1}>
                      <Button
                        color="light"
                        size="sm"
                        className="w-100"
                        onClick={clearFilters}
                      >
                        Clear
                      </Button>
                    </Col>
                  </Row>

                  {/* Totals for the current filter */}
                  <div
                    className="d-flex gap-4 flex-wrap mb-3 p-3 rounded"
                    style={{ background: "#f7f8fa" }}
                  >
                    <div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        IN (filtered)
                      </div>
                      <div className="fw-bold text-success">
                        {currency(totals.totalIn)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        OUT (filtered)
                      </div>
                      <div className="fw-bold text-danger">
                        {currency(totals.totalOut)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        NET
                      </div>
                      <div
                        className={`fw-bold ${
                          totals.net >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {currency(totals.net)}
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive table-card">
                    <DataTable
                      columns={col}
                      data={rows}
                      progressPending={loading}
                      pagination
                      paginationServer
                      paginationTotalRows={totalRows}
                      paginationPerPage={perPage}
                      paginationRowsPerPageOptions={[10, 25, 50, 100]}
                      onChangeRowsPerPage={(n) => setPerPage(n)}
                      onChangePage={(p) => setPageNo(p)}
                      noDataComponent={
                        <div className="text-center py-4 text-muted">
                          No entries for these filters.
                        </div>
                      }
                    />
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Record payment */}
      <Modal isOpen={incomeModal} toggle={() => setIncomeModal(false)} centered>
        <ModalHeader toggle={() => setIncomeModal(false)}>
          Record Payment
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label className="fw-bold">Member</Label>
            <Input
              type="select"
              value={incomeForm.memberId}
              onChange={(e) => {
                const m = members.find((x) => x._id === e.target.value);
                setIncomeForm({
                  ...incomeForm,
                  memberId: e.target.value,
                  branch: m?.branch || incomeForm.branch,
                  amount:
                    m?.balanceAmount > 0 ? m.balanceAmount : incomeForm.amount,
                });
              }}
            >
              <option value="">Walk-in / no member</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullName} — {m.mobileNumber}
                  {m.balanceAmount > 0
                    ? ` (due ${currency(m.balanceAmount)})`
                    : ""}
                </option>
              ))}
            </Input>
            <small className="text-muted">
              Selecting a member fills the outstanding amount and updates their
              balance.
            </small>
          </FormGroup>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Amount (₹)</Label>
                <Input
                  type="number"
                  value={incomeForm.amount}
                  onChange={(e) =>
                    setIncomeForm({ ...incomeForm, amount: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Date</Label>
                <Input
                  type="date"
                  value={incomeForm.transactionDate}
                  onChange={(e) =>
                    setIncomeForm({
                      ...incomeForm,
                      transactionDate: e.target.value,
                    })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Mode</Label>
                <Input
                  type="select"
                  value={incomeForm.mode}
                  onChange={(e) =>
                    setIncomeForm({ ...incomeForm, mode: e.target.value })
                  }
                >
                  {MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Branch</Label>
                <Input
                  type="select"
                  value={incomeForm.branch}
                  onChange={(e) =>
                    setIncomeForm({ ...incomeForm, branch: e.target.value })
                  }
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b.name}>
                      {b.displayName || b.name}
                    </option>
                  ))}
                  {/* Keep the current value selectable if the list failed to
                      load or that branch is now inactive. */}
                  {incomeForm.branch &&
                    !branches.some((b) => b.name === incomeForm.branch) && (
                      <option value={incomeForm.branch}>
                        {incomeForm.branch}
                      </option>
                    )}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label className="fw-bold">Note</Label>
            <Input
              value={incomeForm.note}
              onChange={(e) =>
                setIncomeForm({ ...incomeForm, note: e.target.value })
              }
            />
          </FormGroup>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button color="light" onClick={() => setIncomeModal(false)}>
              Cancel
            </Button>
            <Button color="success" onClick={submitIncome} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Print Receipt"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Record expense */}
      <Modal
        isOpen={expenseModal}
        toggle={() => setExpenseModal(false)}
        centered
      >
        <ModalHeader toggle={() => setExpenseModal(false)}>
          Record Expense
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Category</Label>
                <Input
                  type="select"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Amount (₹)</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Date</Label>
                <Input
                  type="date"
                  value={expenseForm.transactionDate}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      transactionDate: e.target.value,
                    })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Branch</Label>
                <Input
                  type="select"
                  value={expenseForm.branch}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, branch: e.target.value })
                  }
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b.name}>
                      {b.displayName || b.name}
                    </option>
                  ))}
                  {/* Keep the current value selectable if the list failed to
                      load or that branch is now inactive. */}
                  {expenseForm.branch &&
                    !branches.some((b) => b.name === expenseForm.branch) && (
                      <option value={expenseForm.branch}>
                        {expenseForm.branch}
                      </option>
                    )}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Paid To</Label>
                <Input
                  value={expenseForm.paidTo}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, paidTo: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="fw-bold">Bill No.</Label>
                <Input
                  value={expenseForm.billNo}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, billNo: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label className="fw-bold">Note</Label>
            <Input
              value={expenseForm.note}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, note: e.target.value })
              }
            />
          </FormGroup>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button color="light" onClick={() => setExpenseModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={submitExpense} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};

export default CashFlow;

import React, { useState, useEffect, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Badge,
    Button,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "reactstrap";
import DataTable from "@/Components/Common/DataTableBase";
import { getLoginAttempts, resetLoginAttempts, unlockAccount, blockUser, unblockUser } from "../../api/admin.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast, ToastContainer } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Calculate remaining lock time
const getRemainingTime = (lockUntil) => {
    if (!lockUntil) return null;
    const now = new Date();
    const lockDate = new Date(lockUntil);
    const diff = lockDate - now;
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

const LoginAttemptLogs = () => {
    const { adminData } = useContext(AuthContext);
    const [loginAttempts, setLoginAttempts] = useState([]);

    // Get current user ID to prevent self-blocking (from admin data loaded via session)
    const currentUserId = adminData?._id || null;
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(25);
    const [pageNo, setPageNo] = useState(1);
    const [column, setColumn] = useState("lastLoginAttempt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [query, setQuery] = useState("");

    // Modal states
    const [confirmModal, setConfirmModal] = useState(false);
    const [modalAction, setModalAction] = useState(null); // 'unlock' or 'reset'
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchLoginAttempts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query]);

    const fetchLoginAttempts = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) skip = 0;

        try {
            const response = await getLoginAttempts({
                skip,
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
            });

            if (response.data?.data?.length > 0) {
                const res = response.data.data[0];
                setLoginAttempts(res.data || []);
                setTotalRows(res.count || 0);
            } else {
                setLoginAttempts([]);
                setTotalRows(0);
            }
        } catch (error) {
            console.error("Error fetching login attempts:", error);
            toast.error("Failed to fetch login attempts");
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (sortColumn, sortDir) => {
        setColumn(sortColumn.sortField);
        setSortDirection(sortDir);
    };

    const handlePageChange = (page) => {
        setPageNo(page);
    };

    const handlePerRowsChange = (newPerPage) => {
        setPerPage(newPerPage);
    };

    const handleSearch = (e) => {
        setQuery(e.target.value);
        setPageNo(1);
    };



    // Handle unlock account
    const handleUnlock = (row) => {
        setSelectedUser(row);
        setModalAction("unlock");
        setConfirmModal(true);
    };

    // Handle reset attempts
    const handleReset = (row) => {
        setSelectedUser(row);
        setModalAction("reset");
        setConfirmModal(true);
    };

    // Handle block account
    const handleBlock = (row) => {
        setSelectedUser(row);
        setModalAction("block");
        setConfirmModal(true);
    };

    // Handle unblock account
    const handleUnblock = (row) => {
        setSelectedUser(row);
        setModalAction("unblock");
        setConfirmModal(true);
    };

    // Confirm action
    const confirmAction = async () => {
        if (!selectedUser) return;

        setActionLoading(true);
        try {
            if (modalAction === "unlock") {
                await unlockAccount(selectedUser.userId);
                toast.success(`Account unlocked for ${selectedUser.userEmail}`);
            } else if (modalAction === "reset") {
                await resetLoginAttempts(selectedUser.userId);
                toast.success(`Login attempts reset for ${selectedUser.userEmail}`);
            } else if (modalAction === "block") {
                await blockUser(selectedUser.userId);
                toast.success(`Account blocked for ${selectedUser.userEmail}`);
            } else if (modalAction === "unblock") {
                await unblockUser(selectedUser.userId);
                toast.success(`Account unblocked for ${selectedUser.userEmail}`);
            }
            fetchLoginAttempts();
        } catch (error) {
            console.error("Action failed:", error);
            toast.error(`Failed to ${modalAction} account`);
        } finally {
            setActionLoading(false);
            setConfirmModal(false);
            setSelectedUser(null);
            setModalAction(null);
        }
    };

    // Table columns
    const columns = useMemo(() => [
        { name: "#", selector: (row, index) => (pageNo - 1) * perPage + index + 1, width: "60px" },
        { name: "Employee", selector: (row) => row.employeeName, sortable: true, sortField: "employeeName", minWidth: "150px", cell: EmployeeCell },
        { name: "Status", selector: (row) => row.isLocked, minWidth: "120px", cell: StatusCell },
        { name: "Failed Attempts", selector: (row) => row.attemptCount, sortable: true, sortField: "attemptCount", width: "130px", cell: FailedAttemptsCell },
        { name: "Last Attempt", selector: (row) => row.lastLoginAttempt, sortable: true, sortField: "lastLoginAttempt", minWidth: "160px", cell: (row) => formatDate(row.lastLoginAttempt) },
        { name: "Last Login", selector: (row) => row.lastLoggedIn, sortable: true, sortField: "lastLoggedIn", minWidth: "160px", cell: (row) => formatDate(row.lastLoggedIn) },
        { name: "IP Address", selector: (row) => row.ipAddress, minWidth: "130px", cell: IpAddressCell },
        { name: "Location", selector: (row) => row.city, minWidth: "200px", cell: LocationCell },
        { name: "Actions", minWidth: "180px", cell: (row) => <LoginAttemptActions row={row} currentUserId={currentUserId} handleUnlock={handleUnlock} handleReset={handleReset} handleUnblock={handleUnblock} handleBlock={handleBlock} /> },
    ], [pageNo, perPage, currentUserId]);

    const renderModalTitle = () => {
        if (modalAction === "unlock") return "Unlock Account";
        if (modalAction === "reset") return "Reset Login Attempts";
        if (modalAction === "block") return "Block Account";
        return "Unblock Account";
    };

    const renderModalBody = () => {
        if (modalAction === "unlock") {
            return (
                <p>
                    Are you sure you want to unlock the account for{" "}
                    <strong>{selectedUser?.userEmail}</strong>?
                </p>
            );
        }
        if (modalAction === "reset") {
            return (
                <p>
                    Are you sure you want to reset login attempts for{" "}
                    <strong>{selectedUser?.userEmail}</strong>?
                </p>
            );
        }
        if (modalAction === "block") {
            return (
                <p>
                    Are you sure you want to block the account for{" "}
                    <strong>{selectedUser?.userEmail}</strong>?
                    <br />
                    <small className="text-danger">The user will not be able to login.</small>
                </p>
            );
        }
        return (
            <p>
                Are you sure you want to unblock the account for{" "}
                <strong>{selectedUser?.userEmail}</strong>?
                <br />
                <small className="text-success">The user will be able to login again.</small>
            </p>
        );
    };

    const getConfirmButtonColor = () => {
        if (modalAction === "unlock" || modalAction === "unblock") return "success";
        if (modalAction === "reset") return "warning";
        return "danger";
    };

    document.title = `Login Attempt Logs | ${adminData?.companyName || "Admin"}`;

    return (
        <React.Fragment>
            <ToastContainer />
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Security"
                        title="Login Attempt Logs"
                        pageTitle="Security"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="card-title mb-0">
                                            <i className="ri-shield-keyhole-line me-2"></i> Login Attempt Logs
                                        </h5>
                                        <div className="d-flex gap-3 align-items-center">
                                            <div className="search-box">
                                                <input
                                                  aria-label="Search login attempts by email, IP or location"
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search by email, IP, location..."
                                                    value={query}
                                                    onChange={handleSearch}
                                                    style={{ minWidth: "280px" }}
                                                />
                                            </div>
                                            <Button
                                                color="primary"
                                                onClick={() => fetchLoginAttempts()}
                                            >
                                                <i className="ri-refresh-line me-1"></i> Refresh
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardBody>
                                    {/* Stats Cards */}
                                    <Row className="mb-4">
                                        <Col md={3}>
                                            <div
                                                className="p-3 rounded"
                                                style={{ backgroundColor: "#f8f9fa", border: "1px solid #e9ecef" }}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        className="avatar-sm me-3"
                                                        style={{
                                                            backgroundColor: "#d4edda",
                                                            borderRadius: "8px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            width: "40px",
                                                            height: "40px",
                                                        }}
                                                    >
                                                        <i className="ri-user-line" style={{ color: "#28a745", fontSize: "20px" }}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted mb-0">Total Records</p>
                                                        <h5 className="mb-0">{totalRows}</h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div
                                                className="p-3 rounded"
                                                style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107" }}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        className="avatar-sm me-3"
                                                        style={{
                                                            backgroundColor: "#ffc107",
                                                            borderRadius: "8px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            width: "40px",
                                                            height: "40px",
                                                        }}
                                                    >
                                                        <i className="ri-error-warning-line" style={{ color: "#856404", fontSize: "20px" }}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted mb-0">With Attempts</p>
                                                        <h5 className="mb-0">
                                                            {loginAttempts.filter((a) => a.attemptCount > 0).length}
                                                        </h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div
                                                className="p-3 rounded"
                                                style={{ backgroundColor: "#f8d7da", border: "1px solid #dc3545" }}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        className="avatar-sm me-3"
                                                        style={{
                                                            backgroundColor: "#dc3545",
                                                            borderRadius: "8px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            width: "40px",
                                                            height: "40px",
                                                        }}
                                                    >
                                                        <i className="ri-lock-line" style={{ color: "#fff", fontSize: "20px" }}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted mb-0">Locked Accounts</p>
                                                        <h5 className="mb-0">
                                                            {loginAttempts.filter((a) => a.isLocked).length}
                                                        </h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div
                                                className="p-3 rounded"
                                                style={{ backgroundColor: "#d4edda", border: "1px solid #28a745" }}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        className="avatar-sm me-3"
                                                        style={{
                                                            backgroundColor: "#28a745",
                                                            borderRadius: "8px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            width: "40px",
                                                            height: "40px",
                                                        }}
                                                    >
                                                        <i className="ri-check-line" style={{ color: "#fff", fontSize: "20px" }}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted mb-0">Clean Records</p>
                                                        <h5 className="mb-0">
                                                            {loginAttempts.filter((a) => a.attemptCount === 0 && !a.isLocked).length}
                                                        </h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Data Table */}
                                    <div className="table-responsive table-card">
                                        <DataTable
                                            columns={columns}
                                            data={loginAttempts}
                                            progressPending={loading}
                                            sortServer
                                            onSort={handleSort}
                                            pagination
                                            paginationServer
                                            paginationTotalRows={totalRows}
                                            paginationPerPage={perPage}
                                            paginationRowsPerPageOptions={[10, 25, 50, 100]}
                                            onChangeRowsPerPage={handlePerRowsChange}
                                            onChangePage={handlePageChange}
                                            highlightOnHover
                                            striped
                                            customStyles={{
                                                headCells: {
                                                    style: {
                                                        backgroundColor: "#f8f9fa",
                                                        fontWeight: "600",
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Confirm Action Modal */}
            <Modal isOpen={confirmModal} toggle={() => setConfirmModal(false)} centered>
                <ModalHeader toggle={() => setConfirmModal(false)}>
                    {renderModalTitle()}
                </ModalHeader>
                <ModalBody>
                    {renderModalBody()}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="light"
                        onClick={() => setConfirmModal(false)}
                        disabled={actionLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={getConfirmButtonColor()}
                        onClick={confirmAction}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span> Processing...
                            </>
                        ) : (
                            <>Confirm</>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

export default LoginAttemptLogs;

const EmployeeCell = (props) => {
    const row = props.row || props;
    return (
        <div>
            <div className="fw-medium">{row.employeeName}</div>
            <small className="text-muted">{row.userEmail}</small>
        </div>
    );
};

EmployeeCell.propTypes = {
    row: PropTypes.object,
};

const StatusCell = (props) => {
    const row = props.row || props;
    if (row.isActive === false) {
        return (
            <Badge color="dark">
                <i className="ri-prohibited-line me-1"></i>Blocked
            </Badge>
        );
    }
    if (row.isLocked) {
        const remaining = getRemainingTime(row.lockUntil);
        return (
            <div>
                <Badge color="danger">🔒 Locked</Badge>
                {remaining && (
                    <div className="mt-1">
                        <small className="text-muted">{remaining} left</small>
                    </div>
                )}
            </div>
        );
    }
    return <Badge color="success">Active</Badge>;
};

StatusCell.propTypes = {
    row: PropTypes.object,
};

const getAttemptColor = (attemptCount) => {
    if (attemptCount >= 3) return "danger";
    if (attemptCount >= 2) return "warning";
    return "secondary";
};

const FailedAttemptsCell = (props) => {
    const row = props.row || props;
    const color = getAttemptColor(row.attemptCount);
    return <Badge color={color}>{row.attemptCount} / 3</Badge>;
};

FailedAttemptsCell.propTypes = {
    row: PropTypes.object,
};

const IpAddressCell = (props) => {
    const row = props.row || props;
    return <code style={{ fontSize: "0.85em" }}>{row.ipAddress || "-"}</code>;
};

IpAddressCell.propTypes = {
    row: PropTypes.object,
};

const formatLocationText = (city, country) => {
    if (!city) return "";
    const hasValidCountry = country && country !== "-" && country !== "null";
    if (hasValidCountry) {
        return `${city}, ${country}`;
    }
    return city;
};

const LocationCell = (props) => {
    const row = props.row || props;
    if (row.latitude && row.longitude) {
        const googleMapsUrl = `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
        const hasValidCity = row.city && row.city !== "-" && row.city !== "Client Provided" && row.city !== "null";
        const displayText = hasValidCity
            ? formatLocationText(row.city, row.country)
            : `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`;

        return (
            <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`View on Google Maps: ${row.latitude}, ${row.longitude}`}
                style={{
                    color: "#0d6efd",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                }}
            >
                📍 {displayText}
            </a>
        );
    }

    const hasValidCity = row.city && row.city !== "-" && row.city !== "Client Provided" && row.city !== "null";
    if (hasValidCity) {
        return <div>{formatLocationText(row.city, row.country)}</div>;
    }

    return <span className="text-muted">-</span>;
};

LocationCell.propTypes = {
    row: PropTypes.object,
};

const LoginAttemptActions = ({
    row,
    currentUserId,
    handleUnlock,
    handleReset,
    handleUnblock,
    handleBlock,
}) => (
    <div className="d-flex gap-2">
        {row.isLocked && (
            <Button size="sm" color="success" onClick={() => handleUnlock(row)}>
                Unlock
            </Button>
        )}
        {row.attemptCount > 0 && (
            <Button size="sm" color="warning" onClick={() => handleReset(row)}>
                Reset
            </Button>
        )}
        {row.isActive === false && (
            <Button
                size="sm"
                color="success"
                onClick={() => handleUnblock(row)}
                title="Unblock User"
            >
                <i className="ri-shield-check-line me-1"></i> Unblock
            </Button>
        )}
        {row.isActive !== false && row.userId !== currentUserId && (
            <Button
                size="sm"
                color="danger"
                onClick={() => handleBlock(row)}
                title="Block User"
            >
                Block
            </Button>
        )}
        {!row.isLocked && row.attemptCount === 0 && (
            <span className="text-muted">-</span>
        )}
    </div>
);

LoginAttemptActions.propTypes = {
    row: PropTypes.object.isRequired,
    currentUserId: PropTypes.string,
    handleUnlock: PropTypes.func.isRequired,
    handleReset: PropTypes.func.isRequired,
    handleUnblock: PropTypes.func.isRequired,
    handleBlock: PropTypes.func.isRequired,
};

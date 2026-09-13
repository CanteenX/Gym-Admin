import React, { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Label,
    Input,
    Row,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import axios from "axios";
import DataTable from "react-data-table-component";

import {
    createAdminUser,
    getAdminUser,
    removeAdminUser,
    updateAdminUser,
} from "../../functions/Auth/AdminUser";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";

const initialState = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    IsActive: false,
};

const getColumns = ({ handleTog_edit, tog_delete }) => [
    {
        name: "First Name",
        selector: (row) => row.firstName,
        sortable: true,
        sortField: "firstName",
        minWidth: "150px",
    },
    {
        name: "Last Name",
        selector: (row) => row.lastName,
        sortable: true,
        sortField: "lastName",
        minWidth: "150px",
    },
    {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        sortField: "email",
        minWidth: "150px",
    },
    {
        name: "Password",
        selector: (row) => row.password,
        sortable: true,
        sortField: "password",
        minWidth: "150px",
    },
    {
        name: "Action",
        cell: (row) => (
            <div className="d-flex gap-2">
                <div className="edit">
                    <button
                        className="btn btn-sm btn-success edit-item-btn "
                        data-bs-toggle="modal"
                        data-bs-target="#showModal"
                        onClick={() => handleTog_edit(row._id)}
                    >
                        Edit
                    </button>
                </div>

                <div className="remove">
                    <button
                        className="btn btn-sm btn-danger remove-item-btn"
                        data-bs-toggle="modal"
                        data-bs-target="#deleteRecordModal"
                        onClick={() => tog_delete(row._id)}
                    >
                        Remove
                    </button>
                </div>
            </div>
        ),
        sortable: false,
        minWidth: "180px",
    },
];

const AdminUser = () => {

    const [values, setValues] = useState(initialState);
    const {
        firstName,
        lastName,
        email,
        password,

        IsActive,
    } = values;
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [filter, setFilter] = useState(true);

    const [query, setQuery] = useState("");

    const [selectedId, setSelectedId] = useState("");
    const [remove_id, setRemove_id] = useState("");

    const [Adminuser, setAdminuser] = useState([]);

    useEffect(() => {
        console.log(formErrors);
        if (Object.keys(formErrors).length === 0 && isSubmit) {
            console.log("no errors");
        }
    }, [formErrors, isSubmit]);

    const [modal_list, setmodal_list] = useState(false);
    const tog_list = () => {
        setmodal_list(!modal_list);
        setValues(initialState);
        setIsSubmit(false);
    };

    const [modal_delete, setmodal_delete] = useState(false);
    const tog_delete = (_id) => {
        setmodal_delete(!modal_delete);
        setRemove_id(_id);
    };

    const [modal_edit, setmodal_edit] = useState(false);
    const handleTog_edit = (_id) => {
        setmodal_edit(!modal_edit);
        setIsSubmit(false);
        setSelectedId(_id);
        getAdminUser(_id)
            .then((res) => {
                setValues({
                    ...values,
                    firstName: res.firstName,
                    lastName: res.lastName,
                    email: res.email,
                    password: res.password,

                    IsActive: res.IsActive,
                });
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const handleCheck = (e) => {
        setValues({ ...values, IsActive: e.target.checked });
    };

    const handleSubmitCancel = () => {
        setmodal_list(false);
        setValues(initialState);
        setIsSubmit(false);
    };

    const handleClick = (e) => {
        e.preventDefault();
        setFormErrors({});

        setIsSubmit(true);
        createAdminUser(values)
            .then((res) => {
                console.log("res", res);
                if (res.isOk) {
                    setmodal_list(!modal_list);
                    setValues(initialState);
                    setIsSubmit(false);
                    setFormErrors({});
                    fetchUsers();
                } else {
                    setErrEM(true);
                    setFormErrors({ email: "Email already exists!" });
                }
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const handleDelete = (e) => {
        e.preventDefault();
        removeAdminUser(remove_id)
            .then((res) => {
                setmodal_delete(!modal_delete);
                fetchUsers();
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const handleDeleteClose = (e) => {
        e.preventDefault();
        setmodal_delete(false);
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        let erros = validate(values);
        setFormErrors(erros);
        setIsSubmit(true);

        if (Object.keys(erros).length === 0) {
            updateAdminUser(selectedId, values)
                .then((res) => {
                    setmodal_edit(!modal_edit);
                    fetchUsers();
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    };

    const [errFN, setErrFN] = useState(false);
    const [errLN, setErrLN] = useState(false);
    const [errEM, setErrEM] = useState(false);
    const [errPA, setErrPA] = useState(false);

    const validate = (values) => {
        const errors = {};

        if (values.firstName === "") {
            errors.firstName = "First Name is required!";
            setErrFN(true);
        }
        if (values.firstName !== "") {
            setErrFN(false);
        }

        if (values.lastName === "") {
            errors.lastName = "Last Name is required!";
            setErrLN(true);
        }
        if (values.lastName !== "") {
            setErrLN(false);
        }

        if (values.email === "") {
            errors.email = "email is required!";
            setErrEM(true);
        }
        if (values.email !== "") {
            setErrEM(false);
        }

        if (values.password === "") {
            errors.password = "password is required!";
            setErrPA(true);
        }
        if (values.password !== "") {
            setErrPA(false);
        }

        return errors;
    };

    const validClassFN =
        errFN && isSubmit ? "form-control is-invalid" : "form-control";

    const validClassLN =
        errLN && isSubmit ? "form-control is-invalid" : "form-control";

    const validClassEM =
        errEM && isSubmit ? "form-control is-invalid" : "form-control";

    const validClassPA =
        errPA && isSubmit ? "form-control is-invalid" : "form-control";

    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(0);
    const [column, setcolumn] = useState();
    const [sortDirection, setsortDirection] = useState();

    const handleSort = (column, sortDirection) => {
        setcolumn(column.sortField);
        setsortDirection(sortDirection);
    };

    useEffect(() => {
        // fetchUsers(1); // fetch page 1 of users
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [pageNo, perPage, column, sortDirection, query, filter]);

    const fetchUsers = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) {
            skip = 0;
        }

        await axios
            .post(
                `/api/auth/listByparams/adminUser`,
                {
                    skip: skip,
                    per_page: perPage,
                    sorton: column,
                    sortdir: sortDirection,
                    match: query,
                    IsActive: filter,
                },
                {
                    withCredentials: true, // Send cookies for authentication
                }
            )
            .then((response) => {
                if (response.length > 0) {
                    let res = response[0];
                    setLoading(false);
                    setAdminuser(res.data);
                    setTotalRows(res.count);
                } else if (response.length === 0) {
                    setAdminuser([]);
                }
                
            });

        setLoading(false);
    };

    const handlePageChange = (page) => {
        setPageNo(page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        
        setPerPage(newPerPage);
    };
    const handleFilter = (e) => {
        setFilter(e.target.checked);
    };
    const col = useMemo(
        () =>
            getColumns({
                handleTog_edit,
                tog_delete,
            }),
        [handleTog_edit, tog_delete]
    );

    document.title = "Admin Users | Project Name";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Setup"
                        title="Admin Users"
                        pageTitle="Setup"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <FormsHeader
                                        formName="Admin Users"
                                        filter={filter}
                                        handleFilter={handleFilter}
                                        tog_list={tog_list}
                                        setQuery={setQuery}
                                    />
                                </CardHeader>

                                <CardBody>
                                    <div id="customerList">
                                        <div className="table-responsive table-card mt-1 mb-1 text-right">
                                            <DataTable
                                                columns={col}
                                                data={Adminuser}
                                                progressPending={loading}
                                                sortServer
                                                onSort={(
                                                    column,
                                                    sortDirection,
                                                    sortedRows
                                                ) => {
                                                    handleSort(
                                                        column,
                                                        sortDirection
                                                    );
                                                }}
                                                pagination
                                                paginationServer
                                                paginationTotalRows={totalRows}
                                                paginationRowsPerPageOptions={[
                                                    10,
                                                    50,
                                                    100,
                                                    totalRows,
                                                ]}
                                                onChangeRowsPerPage={
                                                    handlePerRowsChange
                                                }
                                                onChangePage={handlePageChange}
                                            />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Add Modal */}
            <Modal
                isOpen={modal_list}
                toggle={() => {
                    tog_list();
                }}
                centered
            >
                <ModalHeader
                    className="bg-light p-3"
                    toggle={() => {
                        setmodal_list(false);
                        setIsSubmit(false);
                    }}
                >
                    Add Admin
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-first-name"
                                type="text"
                                className={validClassFN}
                                placeholder="Enter first Name"
                                required
                                name="firstName"
                                value={firstName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-first-name">
                                First Name{" "}
                                <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.firstName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-last-name"
                                type="text"
                                className={validClassLN}
                                placeholder="Enter last Name"
                                required
                                name="lastName"
                                value={lastName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-last-name">
                                Last Name <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.lastName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-email"
                                type="text"
                                className={validClassEM}
                                placeholder="Enter email "
                                required
                                name="email"
                                value={email}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-email">
                                Email <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.email}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-password"
                                type="text"
                                className={validClassPA}
                                placeholder="Enter password"
                                required
                                name="password"
                                value={password}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-password">
                                Password <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.password}
                                </p>
                            )}
                        </div>

                        <div className="form-check mb-2">
                            <Input
                              id="au-is-active"
                                type="checkbox"
                                className="form-check-input"
                                name="IsActive"
                                value={IsActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="au-is-active" className="form-check-label">
                                Is Active
                            </Label>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <FormsFooter
                            handleSubmit={handleClick}
                            handleSubmitCancel={handleSubmitCancel}
                        />
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={modal_edit}
                toggle={() => {
                    handleTog_edit();
                }}
                centered
            >
                <ModalHeader
                    className="bg-light p-3"
                    toggle={() => {
                        setmodal_edit(false);
                        setIsSubmit(false);
                    }}
                >
                    Edit Admin Users
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-first-name-edit"
                                type="text"
                                className={validClassFN}
                                placeholder="Enter first Name"
                                required
                                name="firstName"
                                value={firstName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-first-name-edit">
                                First Name<span className="text-danger">*</span>{" "}
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.firstName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-last-name-edit"
                                type="text"
                                className={validClassLN}
                                placeholder="Enter last Name"
                                required
                                name="lastName"
                                value={lastName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-last-name-edit">
                                Last Name<span className="text-danger">*</span>{" "}
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.lastName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-email-edit"
                                type="text"
                                className={validClassEM}
                                placeholder="Enter email "
                                required
                                name="email"
                                value={email}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-email-edit">
                                Email <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.email}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                              id="au-password-edit"
                                type="text"
                                className={validClassPA}
                                placeholder="Enter password"
                                required
                                name="password"
                                value={password}
                                onChange={handleChange}
                            />
                            <Label htmlFor="au-password-edit">
                                Password <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.password}
                                </p>
                            )}
                        </div>

                        <div className="form-check mb-2">
                            <Input
                              id="au-is-active-edit"
                                type="checkbox"
                                className="form-check-input"
                                name="IsActive"
                                value={IsActive}
                                checked={IsActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="au-is-active-edit" className="form-check-label">
                                Is Active
                            </Label>
                        </div>
                    </ModalBody>

                    <ModalFooter>
                        <div className="hstack gap-2 justify-content-end">
                            <button
                                type="submit"
                                className="btn btn-success"
                                id="add-btn"
                                onClick={handleUpdate}
                            >
                                Update
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                    setmodal_edit(false);
                                    setIsSubmit(false);
                                    setFormErrors({});
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </ModalFooter>
                </form>
            </Modal>

            <DeleteModal
                show={modal_delete}
                handleDelete={handleDelete}
                toggle={handleDeleteClose}
                setmodal_delete={setmodal_delete}
            />
        </React.Fragment>
    );
};

export default AdminUser;

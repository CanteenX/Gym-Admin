import React, { useState, useEffect, useContext, useMemo } from "react";
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
import DataTable from "@/Components/Common/DataTableBase";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import ReferenceErrorModal from "../../Components/Common/ReferenceErrorModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
    createDepartment,
    deleteDepartment,
    getDepartmentById,
    updateDepartment,
    searchDepartments,
} from "../../api/departments.api";

const initialState = {
    departmentName: "",
    departmentCode: "",
    isActive: false,
};

const getColumns = ({ currentPagePermissions, handleTog_edit, tog_delete }) => [
    {
        name: "Sr No",
        selector: (row, index) => index + 1,
        sortable: true,
        sortField: "createdAt",
        maxWidth: "20px",
    },
    {
        name: "Department Name",
        selector: (row) => row.departmentName,
        sortable: true,
        sortField: "departmentName",
        minWidth: "130px",
    },
    {
        name: "Department Code",
        selector: (row) => row.departmentCode,
        sortable: true,
        sortField: "departmentCode",
        minWidth: "130px",
    },
    {
        name: "Status",
        selector: (row) => (row.isActive ? "Active" : "Inactive"),
        minWidth: "150px",
    },
    {
        name: "Action",
        cell: (row) => (
            <div className="d-flex gap-2">
                <div className="edit">
                    {currentPagePermissions.edit && (
                        <button
                            className="btn btn-sm btn-success edit-item-btn "
                            data-bs-toggle="modal"
                            data-bs-target="#showModal"
                            onClick={() => handleTog_edit(row._id)}
                        >
                            Edit
                        </button>
                    )}
                </div>

                <div className="remove">
                    {currentPagePermissions.delete && (
                        <button
                            className="btn btn-sm btn-danger remove-item-btn"
                            data-bs-toggle="modal"
                            data-bs-target="#deleteRecordModal"
                            onClick={() => tog_delete(row._id)}
                        >
                            Remove
                        </button>
                    )}
                </div>
                {!currentPagePermissions.edit &&
                    !currentPagePermissions.delete && (
                        <span className="text-muted">
                            No actions available
                        </span>
                    )}
            </div>
        ),
        sortable: false,
        minWidth: "180px",
    },
];

const Department = () => {
    const { adminData } = useContext(AuthContext);
    const { currentPagePermissions } = useContext(MenuContext);

    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [filter, setFilter] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const [departments, setDepartments] = useState([]);

    const [query, setQuery] = useState("");

    const [selectedId, setSelectedId] = useState("");
    const [remove_id, setRemove_id] = useState("");

    // Reference error modal states
    const [referenceModal, setReferenceModal] = useState(false);
    const [referenceData, setReferenceData] = useState(null);

    useEffect(() => {
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
        setIsLoading(true);
        getDepartmentById(_id)
            .then((res) => {
                setValues({
                    ...values,
                    departmentName: res.data.data.departmentName,
                    departmentCode: res.data.data.departmentCode,
                    isActive: res.data.data.isActive,
                });
            })
            .catch((err) => {
                console.log(err);
                toast.error("Failed to fetch department details");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const handleCheck = (e) => {
        setValues({ ...values, isActive: e.target.checked });
    };

    const handleSubmitCancel = () => {
        setmodal_list(false);
        setValues(initialState);
        setIsSubmit(false);
    };

    const handleClick = (e) => {
        e.preventDefault();
        setFormErrors({});
        let errors = validate(values);
        setFormErrors(errors);
        setIsSubmit(true);
        const dataToSend = {
            ...values,
        };
        if (Object.keys(errors).length === 0) {
            setIsLoading(true);
            createDepartment(dataToSend)
                .then((res) => {
                    if (res.data.isOk) {
                        toast.success("Department Added Successfully!");
                        setmodal_list(!modal_list);
                        setValues(initialState);
                        fetchDepartments();
                    }
                })
                .catch((error) => {
                    console.log(error);
                    toast.error("Failed to add department. Please try again.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    const handleDelete = (e) => {
        e.preventDefault();
        setIsDeleteLoading(true);
        deleteDepartment(remove_id)
            .then((res) => {
                setmodal_delete(!modal_delete);
                toast.success("Department Removed Successfully!");
                fetchDepartments();
            })
            .catch((err) => {
                console.log(err);
                setmodal_delete(false);

                if (err.response?.status === 409) {
                    // Handle reference error
                    setReferenceData(err.response.data);
                    setReferenceModal(true);
                } else {
                    toast.error(
                        "Failed to delete department. Please try again."
                    );
                }
            })
            .finally(() => {
                setIsDeleteLoading(false);
            });
    };

    const handleDeleteClose = (e) => {
        e.preventDefault();
        setmodal_delete(false);
    };

    const handleReferenceModalClose = () => {
        setReferenceModal(false);
        setReferenceData(null);
    };

    const handleUpdateCancel = (e) => {
        setmodal_edit(false);
        setIsSubmit(false);
        setFormErrors({});
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        let erros = validate(values);
        setFormErrors(erros);
        setIsSubmit(true);

        if (Object.keys(erros).length === 0) {
            setIsLoading(true);
            updateDepartment(selectedId, values)
                .then((res) => {
                    setmodal_edit(!modal_edit);
                    fetchDepartments();
                    toast.success("Department Updated Successfully!");
                })
                .catch((err) => {
                    console.log(err);
                    toast.error("Failed to update department. Please try again.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    const validate = (values) => {
        const errors = {};

        if (values.departmentName === "") {
            errors.departmentName = "Department Name is required!";
        }

        if (values.departmentCode === "") {
            errors.departmentCode = "Department Code is required!";
        }

        return errors;
    };

    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(100);
    const [pageNo, setPageNo] = useState(0);
    const [column, setcolumn] = useState();
    const [sortDirection, setsortDirection] = useState();

    const handleSort = (column, sortDirection) => {
        setcolumn(column.sortField);
        setsortDirection(sortDirection);
    };

    useEffect(() => {
        fetchDepartments();
    }, [pageNo, perPage, column, sortDirection, query, filter]);

    const fetchDepartments = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) {
            skip = 0;
        }

        try {
            const response = await searchDepartments({
                skip: skip,
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                isActive: filter,
            });

            if (response.data.data.length > 0) {
                let res = response.data.data[0];
                setTotalRows(res.count);
                setDepartments(res.data);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setPageNo(page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        setPerPage(newPerPage);
    };
    const handleFilter = (e) => {
        setPageNo(1);
        setFilter(e.target.checked);
    };
    const col = useMemo(
        () =>
            getColumns({
                currentPagePermissions,
                handleTog_edit,
                tog_delete,
            }),
        [currentPagePermissions, handleTog_edit, tog_delete]
    );

    document.title = `Department Master | ${adminData.companyName}`;

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Setup"
                        title="Department"
                        pageTitle="Setup"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <FormsHeader
                                        formName="Department"
                                        filter={filter}
                                        handleFilter={handleFilter}
                                        tog_list={tog_list}
                                        setQuery={setQuery}
                                        showAddButton={
                                            currentPagePermissions.write
                                        }
                                    />
                                </CardHeader>

                                <CardBody>
                                    <div id="customerList">
                                        <div className="table-responsive table-card mt-1 mb-1 text-right">
                                            <DataTable
                                                columns={col}
                                                data={departments}
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
                                                paginationPerPage={100}
                                                paginationRowsPerPageOptions={[
                                                    50,
                                                    100,
                                                    200,
                                                    300,
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
                    Add Department
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Input
                                id="add-departmentName"
                                type="text"
                                required
                                name="departmentName"
                                value={values.departmentName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="add-departmentName">
                                Department Name <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.departmentName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                id="add-departmentCode"
                                type="text"
                                required
                                name="departmentCode"
                                value={values.departmentCode}
                                onChange={handleChange}
                            />
                            <Label htmlFor="add-departmentCode">
                                Department Code <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.departmentCode}
                                </p>
                            )}
                        </div>
                        <div className=" mb-3">
                            <Input
                                id="add-isActive"
                                type="checkbox"
                                className="form-check-input"
                                name="isActive"
                                value={values.isActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="add-isActive" className="form-check-label ms-1">
                                Is Active
                            </Label>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <FormsFooter
                            handleSubmit={handleClick}
                            handleSubmitCancel={handleSubmitCancel}
                            isLoading={isLoading}
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
                    Edit Department
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Input
                                id="edit-departmentName"
                                type="text"
                                required
                                name="departmentName"
                                value={values.departmentName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="edit-departmentName">
                                Department Name <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.departmentName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                id="edit-departmentCode"
                                type="text"
                                required
                                name="departmentCode"
                                value={values.departmentCode}
                                onChange={handleChange}
                            />
                            <Label htmlFor="edit-departmentCode">
                                Department Code <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.departmentCode}
                                </p>
                            )}
                        </div>
                        <div className=" mb-3">
                            <Input
                                id="edit-isActive"
                                type="checkbox"
                                className="form-check-input"
                                name="isActive"
                                value={values.isActive}
                                checked={values.isActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="edit-isActive" className="form-check-label ms-1">
                                Is Active
                            </Label>
                        </div>
                    </ModalBody>

                    <ModalFooter>
                        <FormUpdateFooter
                            handleUpdate={handleUpdate}
                            handleUpdateCancel={handleUpdateCancel}
                            isLoading={isLoading}
                        />
                    </ModalFooter>
                </form>
            </Modal>

            <DeleteModal
                show={modal_delete}
                handleDelete={handleDelete}
                toggle={handleDeleteClose}
                setmodal_delete={setmodal_delete}
                disabled={isDeleteLoading}
            />

            <ReferenceErrorModal
                isOpen={referenceModal}
                toggle={handleReferenceModalClose}
                title="Cannot Delete Department"
                referenceData={referenceData}
            />
        </React.Fragment>
    );
};

export default Department;

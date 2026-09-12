import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
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
  Form,
  FormGroup,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  searchMembershipPlans,
} from "../../api/membershipPlans.api";

const initialState = {
  code: "",
  label: "",
  months: 1,
  defaultFee: 0,
  requiresTrainer: false,
  sequence: 0,
  isActive: true,
};

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const MembershipPlans = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || {
    read: true,
    write: true,
    edit: true,
    delete: true,
  };

  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Page toggle states (full page form)
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("sequence");
  const [sortDirection, setsortDirection] = useState("asc");

  const [modal_delete, setmodal_delete] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchMembershipPlans({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setPlans(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setPlans([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load membership plans");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
  };

  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemoveId(id);
  };

  const handleTog_edit = (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setSelectedId(row._id);
    setValues({
      code: row.code || "",
      label: row.label || "",
      months: row.months ?? 1,
      defaultFee: row.defaultFee ?? 0,
      requiresTrainer: row.requiresTrainer || false,
      sequence: row.sequence || 0,
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const validate = (val) => {
    const errors = {};
    if (!String(val.code).trim()) {
      errors.code = "Plan code is required!";
    } else if (!/^[A-Za-z0-9_]+$/.test(String(val.code).trim())) {
      errors.code = "Use letters, numbers and underscores only (e.g. HALF_YEARLY)";
    }
    if (!String(val.label).trim()) {
      errors.label = "Plan name is required!";
    }
    if (val.months === "" || Number(val.months) < 1) {
      errors.months = "Duration must be at least 1 month";
    }
    if (val.defaultFee === "" || Number(val.defaultFee) < 0) {
      errors.defaultFee = "Default fee cannot be negative";
    }
    return errors;
  };

  const buildPayload = () => ({
    ...values,
    code: String(values.code).trim().toUpperCase(),
    label: String(values.label).trim(),
    months: Number(values.months),
    defaultFee: Number(values.defaultFee),
    sequence: Number(values.sequence) || 0,
  });

  const handleClick = (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsSubmitLoading(true);
      createMembershipPlan(buildPayload())
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Membership Plan Added Successfully!");
            setShowForm(false);
            setValues(initialState);
            fetchPlans();
          } else {
            toast.error(res.data.message || "Failed to add plan");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to add plan");
        })
        .finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsUpdateLoading(true);
      updateMembershipPlan(selectedId, buildPayload())
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Membership Plan Updated Successfully!");
            setUpdateForm(false);
            fetchPlans();
          } else {
            toast.error(res.data.message || "Failed to update plan");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to update plan");
        })
        .finally(() => {
          setIsUpdateLoading(false);
        });
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteMembershipPlan(removeId);
      if (res.data.isOk) {
        toast.success("Membership Plan Deleted Successfully");
        fetchPlans();
        setmodal_delete(false);
      } else {
        // The server refuses to delete a plan members are still on.
        toast.error(res.data.message || "Failed to delete plan");
        setmodal_delete(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "An error occurred while deleting",
      );
      setmodal_delete(false);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "sequence");
    setsortDirection(direction);
  };

  const col = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
      {
        name: "Plan Code",
        cell: (row) => <span className="fw-semibold">{row.code}</span>,
        sortable: true,
        sortField: "code",
        minWidth: "170px",
      },
      {
        name: "Plan Name",
        selector: (row) => row.label,
        sortable: true,
        sortField: "label",
        minWidth: "170px",
      },
      {
        name: "Duration",
        selector: (row) => `${row.months} mo`,
        sortable: true,
        sortField: "months",
        width: "120px",
      },
      {
        name: "Default Fee",
        selector: (row) => currency(row.defaultFee),
        sortable: true,
        sortField: "defaultFee",
        width: "140px",
      },
      {
        name: "Trainer",
        cell: (row) =>
          row.requiresTrainer ? (
            <span className="badge bg-info">Required</span>
          ) : (
            <span className="text-muted small">—</span>
          ),
        width: "120px",
      },
      {
        name: "Members",
        cell: (row) => (
          <span className={row.memberCount > 0 ? "fw-semibold" : "text-muted"}>
            {row.memberCount || 0}
          </span>
        ),
        width: "110px",
      },
      {
        name: "Sequence",
        selector: (row) => row.sequence,
        sortable: true,
        sortField: "sequence",
        width: "120px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
        width: "120px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div
            className="d-flex align-items-center gap-1"
            style={{ height: "28px" }}
          >
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success edit-item-btn d-flex align-items-center gap-1"
                style={{ height: "28px" }}
                onClick={() => handleTog_edit(row)}
              >
                <i className="ri-pencil-line"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
                style={{ height: "28px" }}
                onClick={() => tog_delete(row._id)}
              >
                <i className="ri-delete-bin-line"></i> Delete
              </button>
            )}
          </div>
        ),
        minWidth: "180px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, pageNo, perPage],
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="codeForm" className="form-label fw-bold">
                Plan Code <span className="text-danger">*</span>
              </Label>
              <Input
                id="codeForm"
                name="code"
                placeholder="e.g. HALF_YEARLY"
                value={values.code}
                onChange={handleChange}
                style={{ textTransform: "uppercase" }}
              />
              <small className="text-muted">
                Saved in uppercase. Members already on this plan are moved
                automatically if you change it.
              </small>
              {isSubmit && formErrors.code && (
                <p className="text-danger small mt-1">{formErrors.code}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="labelForm" className="form-label fw-bold">
                Plan Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="labelForm"
                name="label"
                placeholder="e.g. Half Yearly"
                value={values.label}
                onChange={handleChange}
              />
              {isSubmit && formErrors.label && (
                <p className="text-danger small mt-1">{formErrors.label}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="monthsForm" className="form-label fw-bold">
                Duration (months) <span className="text-danger">*</span>
              </Label>
              <Input
                id="monthsForm"
                type="number"
                min="1"
                name="months"
                value={values.months}
                onChange={handleChange}
              />
              <small className="text-muted">
                Drives the auto-calculated end date
              </small>
              {isSubmit && formErrors.months && (
                <p className="text-danger small mt-1">{formErrors.months}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="defaultFeeForm" className="form-label fw-bold">
                Default Fee (₹) <span className="text-danger">*</span>
              </Label>
              <Input
                id="defaultFeeForm"
                type="number"
                min="0"
                name="defaultFee"
                value={values.defaultFee}
                onChange={handleChange}
              />
              {isSubmit && formErrors.defaultFee && (
                <p className="text-danger small mt-1">{formErrors.defaultFee}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="sequenceForm" className="form-label fw-bold">Sequence</Label>
              <Input
                id="sequenceForm"
                type="number"
                name="sequence"
                value={values.sequence}
                onChange={handleChange}
              />
              <small className="text-muted">Order in the plan dropdown</small>
            </FormGroup>
          </Col>

          <Col md={6} className="d-flex align-items-center">
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="requiresTrainerForm"
                name="requiresTrainer"
                checked={values.requiresTrainer}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="requiresTrainerForm"
              >
                Requires a dedicated trainer
              </Label>
            </FormGroup>
          </Col>

          <Col md={6} className="d-flex align-items-center">
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="isActiveForm"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="isActiveForm"
              >
                Is Active
              </Label>
            </FormGroup>
          </Col>
        </Row>

        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button type="button" color="light" onClick={tog_list}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="success"
            disabled={isSubmitLoading || isUpdateLoading}
          >
            {isSubmitLoading || isUpdateLoading
              ? "Saving..."
              : updateForm
                ? "Update Plan"
                : "Save Plan"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Membership Plans | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Membership Plans"
            pageTitle="Membership Plans"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Membership Plan"
                      : updateForm
                        ? "Edit Membership Plan"
                        : "Membership Plans"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        {/* Active Filter Checkbox */}
                        <div className="form-check mb-0 me-2 d-flex align-items-center">
                          <Input
                            type="checkbox"
                            className="form-check-input"
                            id="activeFilter"
                            checked={filter}
                            onChange={(e) => {
                              setFilter(e.target.checked);
                              setPageNo(1);
                            }}
                          />
                          <Label
                            className="form-check-label mb-0 ms-2"
                            htmlFor="activeFilter"
                          >
                            Active
                          </Label>
                        </div>

                        {/* Search Field */}
                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Input
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search plans..."
                            aria-label="Search membership plans"
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPageNo(1);
                            }}
                          />
                          <i
                            className="ri-search-line search-icon"
                            style={{
                              position: "absolute",
                              left: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#878a99",
                              fontSize: "12px",
                            }}
                          ></i>
                        </div>

                        {/* Add Plan Button */}
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add Plan
                          </Button>
                        )}
                      </>
                    ) : (
                      /* Back to List Button */
                      <Button color="dark" size="sm" onClick={tog_list}>
                        ≡ List
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={plans}
                        progressPending={loading}
                        sortServer
                        onSort={handleSort}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        onChangeRowsPerPage={(newPerPage) =>
                          setPerPage(newPerPage)
                        }
                        onChangePage={(page) => setPageNo(page)}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No membership plans found. Click{" "}
                            <strong>Add Plan</strong> to create one.
                          </div>
                        }
                      />
                    </div>
                  </CardBody>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default MembershipPlans;

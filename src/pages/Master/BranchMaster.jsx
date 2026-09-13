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
import DataTable from "@/Components/Common/DataTableBase";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createBranch,
  updateBranch,
  deleteBranch,
  searchBranches,
} from "../../api/branches.api";

const initialState = {
  name: "",
  displayName: "",
  address: "",
  phone: "",
  sequence: 0,
  isActive: true,
  // A physical branch is a real gym members can be enrolled at. Unticking this
  // turns the row into a cost bucket (see the helper text on the form).
  isPhysical: true,
};

const BranchMaster = () => {
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

  const [branches, setBranches] = useState([]);
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

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchBranches({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setBranches(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setBranches([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load branches");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

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
      name: row.name || "",
      displayName: row.displayName || "",
      address: row.address || "",
      phone: row.phone || "",
      sequence: row.sequence || 0,
      isActive: row.isActive !== undefined ? row.isActive : true,
      isPhysical: row.isPhysical !== undefined ? row.isPhysical : true,
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
    if (!String(val.name).trim()) {
      errors.name = "Branch name is required!";
    }
    if (!String(val.displayName).trim()) {
      errors.displayName = "Display name is required!";
    }
    return errors;
  };

  const buildPayload = () => ({
    ...values,
    name: String(values.name).trim(),
    displayName: String(values.displayName).trim(),
    address: String(values.address || "").trim(),
    phone: String(values.phone || "").trim(),
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
      createBranch(buildPayload())
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Branch Added Successfully!");
            setShowForm(false);
            setValues(initialState);
            fetchBranches();
          } else {
            toast.error(res.data.message || "Failed to add branch");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to add branch");
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
      updateBranch(selectedId, buildPayload())
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Branch Updated Successfully!");
            setUpdateForm(false);
            fetchBranches();
          } else {
            // The server refuses a rename once records reference the branch —
            // show exactly what it said.
            toast.error(res.data.message || "Failed to update branch");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to update branch");
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
      const res = await deleteBranch(removeId);
      if (res.data.isOk) {
        toast.success("Branch Deleted Successfully");
        fetchBranches();
        setmodal_delete(false);
      } else {
        // Branches are never deleted — the server explains that they are
        // deactivated instead. Surface its message verbatim.
        toast.error(res.data.message || "Failed to delete branch");
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
        name: "Branch Name",
        cell: (row) => <span className="fw-semibold">{row.name}</span>,
        sortable: true,
        sortField: "name",
        minWidth: "170px",
      },
      {
        name: "Display Name",
        selector: (row) => row.displayName,
        sortable: true,
        sortField: "displayName",
        minWidth: "170px",
      },
      {
        name: "Type",
        cell: (row) =>
          row.isPhysical ? (
            <span className="badge bg-primary">Physical</span>
          ) : (
            <span className="badge bg-info" title="Shared costs only — members cannot be enrolled here">
              Cost Bucket
            </span>
          ),
        width: "140px",
      },
      {
        name: "Phone",
        selector: (row) => row.phone || "—",
        minWidth: "140px",
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
              <Label htmlFor="nameForm" className="form-label fw-bold">
                Branch Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="nameForm"
                name="name"
                placeholder="e.g. Vasna"
                value={values.name}
                onChange={handleChange}
              />
              <small className="text-muted">
                The value stored on members, trainers and transactions. It
                cannot be changed once records reference this branch.
              </small>
              {isSubmit && formErrors.name && (
                <p className="text-danger small mt-1">{formErrors.name}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="displayNameForm" className="form-label fw-bold">
                Display Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="displayNameForm"
                name="displayName"
                placeholder="e.g. Vasna Branch"
                value={values.displayName}
                onChange={handleChange}
              />
              <small className="text-muted">
                Shown in dropdowns and on receipts
              </small>
              {isSubmit && formErrors.displayName && (
                <p className="text-danger small mt-1">
                  {formErrors.displayName}
                </p>
              )}
            </FormGroup>
          </Col>

          <Col md={8}>
            <FormGroup className="mb-3">
              <Label htmlFor="addressForm" className="form-label fw-bold">Address</Label>
              <Input
                id="addressForm"
                name="address"
                placeholder="e.g. Vasna Road, Vadodara"
                value={values.address}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="phoneForm" className="form-label fw-bold">Phone</Label>
              <Input
                id="phoneForm"
                name="phone"
                placeholder="e.g. 98000 00001"
                value={values.phone}
                onChange={handleChange}
              />
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
              <small className="text-muted">Order in the branch dropdown</small>
            </FormGroup>
          </Col>

          <Col md={8}>
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="isPhysicalForm"
                name="isPhysical"
                checked={values.isPhysical}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="isPhysicalForm"
              >
                This is a physical gym
              </Label>
              <small className="text-muted d-block mt-1">
                Leave this ticked for a real gym that members can be enrolled
                at. Untick it to create a <strong>cost bucket</strong> such as
                &quot;Common&quot; — a place to book shared expenses like rent,
                software or owner salary. Cost buckets appear in the cash flow
                and expense pickers only; they are hidden from the member,
                trainer and employee branch dropdowns so nobody can be enrolled
                against one.
              </small>
            </FormGroup>
          </Col>

          <Col md={4} className="d-flex align-items-center">
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
                ? "Update Branch"
                : "Save Branch"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Branch Master | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Branch Master"
            pageTitle="Branch Master"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Branch"
                      : updateForm
                        ? "Edit Branch"
                        : "Branches"}
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
                            aria-label="Search branches by name"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search branches..."
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

                        {/* Add Branch Button */}
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add
                            Branch
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
                        data={branches}
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
                            No branches found. Click{" "}
                            <strong>Add Branch</strong> to create one.
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

export default BranchMaster;

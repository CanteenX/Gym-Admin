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
  Form,
  FormGroup,
  Badge,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  searchExpenseCategories,
} from "../../api/expenseCategories.api";

const initialState = {
  name: "",
  description: "",
  sequence: 0,
  isActive: true,
};

const ExpenseCategories = () => {
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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [modal_delete, setmodal_delete] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const res = await searchExpenseCategories({
        skip,
        per_page: perPage,
        sorton: "sequence",
        sortdir: "asc",
        match: query,
      });
      if (res.data?.data?.length > 0) {
        setCategories(res.data.data[0].data || []);
        setTotalRows(res.data.data[0].count || 0);
      } else {
        setCategories([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load expense categories");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, query]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  const handleTog_edit = (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setSelectedId(row._id);
    setValues({
      name: row.name || "",
      description: row.description || "",
      sequence: row.sequence || 0,
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
  };

  const handleChange = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  const handleCheck = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.checked }));

  const validate = (val) => {
    const errors = {};
    if (!val.name.trim()) errors.name = "Category name is required!";
    return errors;
  };

  const submit = (e, isUpdate) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    const call = isUpdate
      ? updateExpenseCategory(selectedId, values)
      : createExpenseCategory(values);

    call
      .then((res) => {
        if (res.data.isOk) {
          toast.success(res.data.message);
          tog_list();
          fetchCategories();
        } else {
          toast.error(res.data.message || "Save failed");
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || "Save failed"))
      .finally(() => setIsSaving(false));
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteExpenseCategory(removeId);
      if (res.data.isOk) {
        toast.success("Category deleted");
        fetchCategories();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Delete failed");
      }
    } catch (error) {
      // The server refuses to delete a category still used by expenses, and
      // explains how many — surface that message verbatim.
      toast.error(error.response?.data?.message || "Delete failed");
      setmodal_delete(false);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const col = useMemo(
    () => [
      {
        name: "Category",
        cell: (row) => (
          <div className="py-2">
            <div className="fw-semibold">{row.name}</div>
            {row.description && (
              <div className="text-muted small">{row.description}</div>
            )}
          </div>
        ),
        minWidth: "240px",
      },
      {
        name: "Order",
        selector: (row) => row.sequence,
        width: "100px",
      },
      {
        name: "Used By",
        cell: (row) => (
          <Badge color={row.usedCount > 0 ? "primary" : "light"} pill>
            {row.usedCount || 0} expense{row.usedCount === 1 ? "" : "s"}
          </Badge>
        ),
        width: "150px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
        width: "110px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleTog_edit(row)}
                title="Edit"
              >
                <i className="ri-pencil-line"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  setRemoveId(row._id);
                  setmodal_delete(true);
                }}
                title="Delete"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            )}
          </div>
        ),
        minWidth: "140px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions],
  );

  document.title = `Expense Categories | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Accounts"
            title="Expense Categories"
            pageTitle="Expense Categories"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Category"
                      : updateForm
                        ? "Edit Category"
                        : "Expense Categories"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <Input
                          type="text"
                          bsSize="sm"
                          style={{ minWidth: "200px" }}
                          placeholder="Search categories..."
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPageNo(1);
                          }}
                        />
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add
                            Category
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button color="dark" size="sm" onClick={tog_list}>
                        ≡ List
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  <CardBody>
                    <Form onSubmit={(e) => submit(e, updateForm)}>
                      <Row>
                        <Col md={4}>
                          <FormGroup className="mb-3">
                            <Label className="form-label fw-bold">
                              Category Name{" "}
                              <span className="text-danger">*</span>
                            </Label>
                            <Input
                              name="name"
                              placeholder="e.g. Equipment Repair"
                              value={values.name}
                              onChange={handleChange}
                            />
                            {isSubmit && formErrors.name && (
                              <p className="text-danger small mt-1">
                                {formErrors.name}
                              </p>
                            )}
                          </FormGroup>
                        </Col>
                        <Col md={5}>
                          <FormGroup className="mb-3">
                            <Label className="form-label fw-bold">
                              Description
                            </Label>
                            <Input
                              name="description"
                              placeholder="optional"
                              value={values.description}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md={3}>
                          <FormGroup className="mb-3">
                            <Label className="form-label fw-bold">
                              Display Order
                            </Label>
                            <Input
                              type="number"
                              name="sequence"
                              value={values.sequence}
                              onChange={handleChange}
                            />
                          </FormGroup>
                        </Col>
                        <Col md={12}>
                          <FormGroup className="form-check mb-0">
                            <Input
                              type="checkbox"
                              className="form-check-input"
                              id="catActive"
                              name="isActive"
                              checked={values.isActive}
                              onChange={handleCheck}
                            />
                            <Label
                              className="form-check-label ms-1 fw-semibold"
                              htmlFor="catActive"
                            >
                              Is Active
                            </Label>
                          </FormGroup>
                        </Col>
                      </Row>
                      <div className="mt-3 d-flex justify-content-end gap-2">
                        <Button type="button" color="light" onClick={tog_list}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          color="success"
                          disabled={isSaving}
                        >
                          {isSaving
                            ? "Saving..."
                            : updateForm
                              ? "Update"
                              : "Save"}
                        </Button>
                      </div>
                    </Form>
                  </CardBody>
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card">
                      <DataTable
                        columns={col}
                        data={categories}
                        progressPending={loading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50]}
                        onChangeRowsPerPage={(n) => setPerPage(n)}
                        onChangePage={(p) => setPageNo(p)}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No categories yet. Run the cash-flow seed, or add one.
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

export default ExpenseCategories;

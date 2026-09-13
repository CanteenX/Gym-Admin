import React, { useState, useEffect, useContext, useMemo } from "react";
import PropTypes from "prop-types";
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
  createFaq,
  updateFaq,
  deleteFaq,
  searchFaqs,
  listAllFaqCategories,
} from "../../api/faqs.api";

const initialState = {
  category: "",
  question: "",
  answer: "",
  sequence: 0,
  isActive: true,
};

const Faq = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || { read: true, write: true, edit: true, delete: true };

  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [categories, setCategories] = useState([]); // All categories for dropdown
  const [faqs, setFaqs] = useState([]);
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
  const [column, setcolumn] = useState("createdAt");
  const [sortDirection, setsortDirection] = useState("desc");
  
  // Custom filter states
  const [filterCategory, setFilterCategory] = useState("");

  const [modal_delete, setmodal_delete] = useState(false);

  // Load all categories for dropdown select
  const fetchAllCategories = async () => {
    try {
      const res = await listAllFaqCategories();
      if (res.data.isOk) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

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
      category: row.category?._id || "",
      question: row.question || "",
      answer: row.answer || "",
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
    if (!val.category) {
      errors.category = "Category is required!";
    }
    if (!val.question.trim()) {
      errors.question = "Question is required!";
    }
    if (!val.answer.trim()) {
      errors.answer = "Answer is required!";
    }
    return errors;
  };

  const handleClick = (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsSubmitLoading(true);
      createFaq(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("FAQ Added Successfully!");
            setShowForm(false);
            setValues(initialState);
            fetchFaqs();
          } else {
            toast.error(res.data.message || "Failed to add FAQ");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to add FAQ");
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
      updateFaq(selectedId, values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("FAQ Updated Successfully!");
            setUpdateForm(false);
            fetchFaqs();
          } else {
            toast.error(res.data.message || "Failed to update FAQ");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to update FAQ");
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
      const res = await deleteFaq(removeId);
      if (res.data.isOk) {
        toast.success("FAQ Deleted Successfully");
        fetchFaqs();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Failed to delete FAQ");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const fetchFaqs = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchFaqs({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
        categoryId: filterCategory || undefined,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setFaqs(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setFaqs([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [pageNo, perPage, column, sortDirection, query, filter, filterCategory]);

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "createdAt");
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
        name: "Question",
        selector: (row) => row.question,
        sortable: true,
        sortField: "question",
        minWidth: "220px",
      },
      {
        name: "Category",
        selector: (row) => row.category?.categoryName || "-",
        minWidth: "150px",
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
          <div className="d-flex align-items-center gap-1" style={{ height: "28px" }}>
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
    [permissions, pageNo, perPage]
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="faq-faq-category" className="form-label fw-bold">
                FAQ Category <span className="text-danger">*</span>
              </Label>
              <Input
                id="faq-faq-category"
                type="select"
                name="category"
                className="form-select"
                value={values.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.categoryName} {!cat.isActive && "(Inactive)"}
                  </option>
                ))}
              </Input>
              {isSubmit && formErrors.category && (
                <p className="text-danger small mt-1">{formErrors.category}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="faq-question" className="form-label fw-bold">
                Question <span className="text-danger">*</span>
              </Label>
              <Input
                id="faq-question"
                type="textarea"
                rows="2"
                name="question"
                placeholder="Enter FAQ Question"
                value={values.question}
                onChange={handleChange}
              />
              {isSubmit && formErrors.question && (
                <p className="text-danger small mt-1">{formErrors.question}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="faq-answer" className="form-label fw-bold">
                Answer <span className="text-danger">*</span>
              </Label>
              <Input
                id="faq-answer"
                type="textarea"
                rows="6"
                name="answer"
                placeholder="Enter FAQ Answer"
                value={values.answer}
                onChange={handleChange}
              />
              {isSubmit && formErrors.answer && (
                <p className="text-danger small mt-1">{formErrors.answer}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="faq-sequence" className="form-label fw-bold">Sequence</Label>
              <Input
                id="faq-sequence"
                type="number"
                name="sequence"
                value={values.sequence}
                onChange={handleChange}
              />
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
              <Label className="form-check-label ms-1 fw-semibold" htmlFor="isActiveForm">
                Is Active
              </Label>
            </FormGroup>
          </Col>
        </Row>

        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button type="button" color="light" onClick={tog_list}>
            Cancel
          </Button>
          <Button type="submit" color="success" disabled={isSubmitLoading || isUpdateLoading}>
            {isSubmitLoading || isUpdateLoading ? "Saving..." : updateForm ? "Update FAQ" : "Save FAQ"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `FAQs | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="FAQs" pageTitle="FAQ" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm ? "Add FAQ" : updateForm ? "Edit FAQ" : "FAQs"}
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
                            onChange={(e) => setFilter(e.target.checked)}
                          />
                          <Label className="form-check-label mb-0 ms-2" htmlFor="activeFilter">
                            Active
                          </Label>
                        </div>

                        {/* Category Filter Select */}
                        <div style={{ minWidth: "200px" }}>
                          <Input
                            aria-label="Filter FAQs by category"
                            type="select"
                            className="form-select form-select-sm"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                          >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.categoryName}
                              </option>
                            ))}
                          </Input>
                        </div>

                        {/* Search Field */}
                        <div className="search-box mb-0" style={{ position: "relative", minWidth: "200px" }}>
                          <Input
                            aria-label="Search FAQs by question"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search questions..."
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                          <i className="ri-search-line search-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#878a99", fontSize: "12px" }}></i>
                        </div>

                        {/* Add FAQ Button */}
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add FAQ
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
                        data={faqs}
                        progressPending={loading}
                        sortServer
                        onSort={handleSort}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        onChangeRowsPerPage={(newPerPage) => setPerPage(newPerPage)}
                        onChangePage={(page) => setPageNo(page)}
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

export default Faq;

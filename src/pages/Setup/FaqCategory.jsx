import React, { useState, useEffect, useContext, useMemo } from "react";
import PropTypes from "prop-types";
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
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createFaqCategory,
  updateFaqCategory,
  deleteFaqCategory,
  searchFaqCategories,
} from "../../api/faqs.api";

const initialState = {
  categoryName: "",
  description: "",
  sequence: 0,
  isActive: true,
};

const FaqCategory = () => {
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

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("createdAt");
  const [sortDirection, setsortDirection] = useState("desc");

  const [modal_list, setmodal_list] = useState(false);
  const [modal_edit, setmodal_edit] = useState(false);
  const [modal_delete, setmodal_delete] = useState(false);

  const tog_list = () => {
    setmodal_list(!modal_list);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
  };

  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemoveId(id);
  };

  const handleTog_edit = (row) => {
    setmodal_edit(!modal_edit);
    setIsSubmit(false);
    setSelectedId(row._id);
    setValues({
      categoryName: row.categoryName || "",
      description: row.description || "",
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
    if (!val.categoryName.trim()) {
      errors.categoryName = "Category Name is required!";
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
      createFaqCategory(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("FAQ Category Added Successfully!");
            setmodal_list(false);
            setValues(initialState);
            fetchCategories();
          } else {
            toast.error(res.data.message || "Failed to add category");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to add FAQ category");
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
      updateFaqCategory(selectedId, values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("FAQ Category Updated Successfully!");
            setmodal_edit(false);
            fetchCategories();
          } else {
            toast.error(res.data.message || "Failed to update category");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to update FAQ category");
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
      const res = await deleteFaqCategory(removeId);
      if (res.data.isOk) {
        toast.success("FAQ Category Deleted Successfully");
        fetchCategories();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Failed to delete category");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchFaqCategories({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setCategories(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setCategories([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

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
        name: "Category Name",
        selector: (row) => row.categoryName,
        sortable: true,
        sortField: "categoryName",
        minWidth: "180px",
      },
      {
        name: "Description",
        selector: (row) => row.description || "-",
        minWidth: "220px",
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

  document.title = `FAQ Categories | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="FAQ Categories" pageTitle="FAQ" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="FAQ Category"
                    filter={filter}
                    handleFilter={(e) => setFilter(e.target.checked)}
                    tog_list={tog_list}
                    setQuery={setQuery}
                    currentPagePermissions={permissions}
                    showAddButton={permissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={categories}
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
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Add Modal */}
      <Modal isOpen={modal_list} toggle={tog_list} centered>
        <ModalHeader className="bg-light p-3" toggle={tog_list}>
          Add FAQ Category
        </ModalHeader>
        <form onSubmit={handleClick}>
          <ModalBody>
            <div className="mb-3">
              <Label htmlFor="fc-category-name" className="form-label">
                Category Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="fc-category-name"
                type="text"
                name="categoryName"
                placeholder="Enter Category Name"
                value={values.categoryName}
                onChange={handleChange}
              />
              {isSubmit && formErrors.categoryName && (
                <p className="text-danger small mt-1">{formErrors.categoryName}</p>
              )}
            </div>

            <div className="mb-3">
              <Label htmlFor="fc-description" className="form-label">Description</Label>
              <Input
                id="fc-description"
                type="textarea"
                rows="3"
                name="description"
                placeholder="Enter Description"
                value={values.description}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="fc-sequence" className="form-label">Sequence</Label>
              <Input
                id="fc-sequence"
                type="number"
                name="sequence"
                value={values.sequence}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3 form-check">
              <Input
                type="checkbox"
                className="form-check-input"
                id="addIsActive"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1" htmlFor="addIsActive">
                Is Active
              </Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <FormsFooter
              handleSubmit={handleClick}
              handleSubmitCancel={() => setmodal_list(false)}
              isLoading={isSubmitLoading}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modal_edit} toggle={() => setmodal_edit(false)} centered>
        <ModalHeader className="bg-light p-3" toggle={() => setmodal_edit(false)}>
          Edit FAQ Category
        </ModalHeader>
        <form onSubmit={handleUpdate}>
          <ModalBody>
            <div className="mb-3">
              <Label htmlFor="fc-category-name-edit" className="form-label">
                Category Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="fc-category-name-edit"
                type="text"
                name="categoryName"
                placeholder="Enter Category Name"
                value={values.categoryName}
                onChange={handleChange}
              />
              {isSubmit && formErrors.categoryName && (
                <p className="text-danger small mt-1">{formErrors.categoryName}</p>
              )}
            </div>

            <div className="mb-3">
              <Label htmlFor="fc-description-edit" className="form-label">Description</Label>
              <Input
                id="fc-description-edit"
                type="textarea"
                rows="3"
                name="description"
                placeholder="Enter Description"
                value={values.description}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="fc-sequence-edit" className="form-label">Sequence</Label>
              <Input
                id="fc-sequence-edit"
                type="number"
                name="sequence"
                value={values.sequence}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3 form-check">
              <Input
                type="checkbox"
                className="form-check-input"
                id="editIsActive"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1" htmlFor="editIsActive">
                Is Active
              </Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <FormUpdateFooter
              handleUpdate={handleUpdate}
              handleUpdateCancel={() => setmodal_edit(false)}
              isLoading={isUpdateLoading}
            />
          </ModalFooter>
        </form>
      </Modal>

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

export default FaqCategory;

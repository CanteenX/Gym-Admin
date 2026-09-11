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
import { createEmailTo, deleteEmailTo, getEmailToById, updateEmailTo, searchEmailTo } from "../../api/emails.api";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
    name: "",
    email: "",
    isActive: false,
};

const EmailTo = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions: contextPermissions } = useContext(MenuContext);
  const currentPagePermissions = useMemo(() => {
    if (!contextPermissions || (!contextPermissions.read && !contextPermissions.write)) {
      return { read: true, write: true, edit: true, delete: true };
    }
    return contextPermissions;
  }, [contextPermissions]);
  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);

  const [isDeleteErrorModalOpen, setIsDeleteErrorModalOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [errorServices, setErrorServices] = useState([]);

  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [remove_id, setRemove_id] = useState("");

  const [emailToItems, setEmailToItems] = useState([]);

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

  const toggleErrorModal = () => {
    setIsDeleteErrorModalOpen(!isDeleteErrorModalOpen);
    setDeleteErrorMessage("");
    setErrorServices([]);
  };

  const [modal_delete, setmodal_delete] = useState(false);
  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(id);
  };

  const [modal_edit, setmodal_edit] = useState(false);

  const handleTog_edit = (id) => {
    setmodal_edit(!modal_edit);
    setIsSubmit(false);
    setSelectedId(id);
    getEmailToById(id)
      .then((res) => {
        setValues({
          name: res.data.data.name,
          email: res.data.data.email,
          isActive: res.data.data.isActive,
        });
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to fetch Email To details");
      });
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
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
    if (Object.keys(errors).length === 0) {
      setIsSubmitLoading(true);
      createEmailTo(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Email To Added Successfully!");
            setmodal_list(!modal_list);
            setValues(initialState);
            fetchEmailToItems();
          } 
        })
        .catch((error) => {
          console.log(error);
          toast.error("Failed to add Email To");
        }).finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleDelete = async(e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
        const res = await deleteEmailTo(remove_id);
        if(res.data.isOk) {
            toast.success("Email To Deleted Successfully");
            fetchEmailToItems();
            setmodal_delete(false);
        } else {
            setDeleteErrorMessage(res.data.message);
            setErrorServices(res.data.data);
            setIsDeleteErrorModalOpen(true);
            setmodal_delete(false);
        }
    } catch (error) {
        console.log(error);
        toast.error("An error occurred while deleting");
    } finally {
        setIsDeleteLoading(false);
    }
  };

  const handleDeleteClose = (e) => {
    e.preventDefault();
    setmodal_delete(false);
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
      setIsUpdateLoading(true);
      updateEmailTo(selectedId, values)
        .then((res) => {
          setmodal_edit(!modal_edit);
          fetchEmailToItems();
          toast.success("Email To Updated Successfully!");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to update Email To");
        }).finally(() => {
          setIsUpdateLoading(false);
        });
    }
  };

  const validate = (values) => {
    const errors = {};

    if (values.name === "") {
      errors.name = "Name is required!";
    }
    if (values.email === "") {
      errors.email = "Email is required!";
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      errors.email = "Invalid email format!";
    }
    return errors;
  };

  const [loading, setLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
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
    fetchEmailToItems();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchEmailToItems = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) {
      skip = 0;
    }

    await searchEmailTo({
          skip: skip,
          per_page: perPage,
          sorton: column,
          sortdir: sortDirection,
          match: query,
          isActive: filter,
        })
      .then((response) => {
        if (response.data.data.length > 0) {
          let res = response.data.data[0];
          setEmailToItems(res.data);
          setTotalRows(response.data.data[0].count);
          setLoading(false);
        } else if (response.data.data.length === 0) {
          setEmailToItems([]);
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
  const col = useMemo(() => [
    {
      name: "Sr No",
      selector: (row, index) => index + 1, 
      sortable: true,
      sortField: "createdAt",
      maxWidth: "20px",
    },
    {
      name: "Name",
      selector: (row) => row.name,
      minWidth: "70px",
    },
    {
      name: "Email",
      selector: (row) => row.email,
      minWidth: "120px",
    },
    {
      name: "Action",
      cell: (row) => (
        <EmailToActions
          row={row}
          currentPagePermissions={currentPagePermissions}
          handleTog_edit={handleTog_edit}
          tog_delete={tog_delete}
        />
      ),
      sortable: false,
      minWidth: "180px",
    },
  ], [currentPagePermissions]);

  document.title = `Email To | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Setup"
            title="Email To"
            pageTitle="Setup"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Email To"
                    filter={filter}
                    handleFilter={handleFilter}
                    tog_list={tog_list}
                    setQuery={setQuery}
                    currentPagePermissions={currentPagePermissions}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>

                <CardBody>
                  <div id="customerList">
                    <div className="table-responsive table-card mt-1 mb-1 text-right">
                      <DataTable
                        columns={col}
                        data={emailToItems}
                        progressPending={loading}
                        sortServer
                        onSort={(column, sortDirection, sortedRows) => {
                          handleSort(column, sortDirection);
                        }}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={100}
                        paginationRowsPerPageOptions={[
                          50,100,200,300,totalRows
                        ]} 
                        onChangeRowsPerPage={handlePerRowsChange}
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
          Add Email To
        </ModalHeader>
        <form>
          <ModalBody>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter Name"
                required
                name="name"
                value={values.name}
                onChange={handleChange}
              />
              <Label>
                Name <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.name}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="email"
                placeholder="Enter Email"
                required
                name="email"
                value={values.email}
                onChange={handleChange}
              />
              <Label>
                Email <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.email}</p>
              )}
            </div>
            <div className=" mb-3">
              <Input
                type="checkbox"
                className="form-check-input"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1">Is Active</Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <FormsFooter
              handleSubmit={handleClick}
              handleSubmitCancel={handleSubmitCancel}
              isLoading={isSubmitLoading}
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
          Edit Email To
        </ModalHeader>
        <form>
          <ModalBody>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter Name"
                required
                name="name"
                value={values.name}
                onChange={handleChange}
              />
              <Label>
                Name <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.name}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="email"
                placeholder="Enter Email"
                required
                name="email"
                value={values.email}
                onChange={handleChange}
              />
              <Label>
                Email <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.email}</p>
              )}
            </div>
            <div className=" mb-3">
              <Input
                type="checkbox"
                className="form-check-input"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1">Is Active</Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <FormUpdateFooter
              handleUpdate={handleUpdate}
              handleUpdateCancel={handleUpdateCancel}
              isLoading={isUpdateLoading}
            />
          </ModalFooter>
        </form>
      </Modal>

      <ServiceGroupDeleteError 
          isOpen={isDeleteErrorModalOpen}
          toggle={toggleErrorModal}
          message={deleteErrorMessage}
          services={errorServices}
      />

      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={handleDeleteClose}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default EmailTo;

const EmailToActions = ({ row, currentPagePermissions, handleTog_edit, tog_delete }) => (
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
      {!currentPagePermissions.edit && !currentPagePermissions.delete && (
        <span className="text-muted">No actions available</span>
      )}
    </div>
  </div>
);

EmailToActions.propTypes = {
  row: PropTypes.object.isRequired,
  currentPagePermissions: PropTypes.object.isRequired,
  handleTog_edit: PropTypes.func.isRequired,
  tog_delete: PropTypes.func.isRequired,
};

const ServiceGroupDeleteError = ({ isOpen, toggle, message, services }) => {
    return (
      <Modal isOpen={isOpen} toggle={toggle} centered>
        <ModalHeader 
          className="bg-light p-3" 
          toggle={toggle}
        >
          Unable to Delete Email To
        </ModalHeader>
        <ModalBody>
          <p className="text-danger mb-3">{message}</p>
          {services && services.length > 0 && (
            <>
              <p className="mb-2">Please delete/modify related templates first:</p>
              <ul className="list-group">
                {services.map((service) => (
                  <li key={service} className="list-group-item">
                    {service}
                  </li>
                ))}
              </ul>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="btn btn-light"
            onClick={toggle}
          >
            Close
          </button>
        </ModalFooter>
      </Modal>
    );
};

ServiceGroupDeleteError.propTypes = {
  isOpen: PropTypes.bool,
  toggle: PropTypes.func,
  message: PropTypes.string,
  services: PropTypes.arrayOf(PropTypes.string),
};

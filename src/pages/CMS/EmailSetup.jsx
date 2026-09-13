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
import DataTable from "@/Components/Common/DataTableBase";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { createEmailSetup, deleteEmailSetup, getEmailSetupById, updateEmailSetup, searchEmailSetups } from "../../api/emails.api";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
    email: "",
    appPassword: "",
    host: "",
    port: "",
    SSL: false,
    isActive: false,
};

const EmailSetup = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

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

  const [countries, setCountries] = useState([]);

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
    getEmailSetupById(id)
      .then((res) => {
        setValues({
          email: res.data.data.email,
          appPassword: res.data.data.appPassword,
          host: res.data.data.host,
          port: res.data.data.port,
          SSL: res.data.data.SSL,
          isActive: res.data.data.isActive,
        });
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to fetch email setup details");
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
    if (
      Object.keys(errors).length === 0
    ) {
      setIsSubmitLoading(true);
      createEmailSetup(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Email Setup Added Successfully!");
            setmodal_list(!modal_list);
            setValues(initialState);
            fetchCountries();
          } 
        })
        .catch((error) => {
          console.log(error);
          toast.error("Failed to add email setup");
        }).finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleDelete = async(e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
        const res = await deleteEmailSetup(remove_id);
        if(res.data.isOk) {
            toast.success("Email Setup Deleted Successfully");
            fetchCountries();
            setmodal_delete(false);
        } else {
            setDeleteErrorMessage(res.data.message);
            setErrorServices(res.data.data);
            setIsDeleteErrorModalOpen(true);
            console.log(res)
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
      updateEmailSetup(selectedId, values)
        .then((res) => {
          setmodal_edit(!modal_edit);
          fetchCountries();
          toast.success("Email Setup Updated Successfully!");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to update email setup");
        }).finally(() => {
          setIsUpdateLoading(false);
        });
    }
  };

  const validate = (values) => {
    const errors = {};

    if (values.email === "") {
      errors.email = "Email is required!";
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
      errors.email = "Invalid email address";
    }
    if(values.appPassword === "") {
      errors.appPassword = "App Password is required!";
    }
    if(values.host === "") {
      errors.host = "Host is required!";
    }
    if(values.port === "") {
      errors.port = "Port is required!";
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
    fetchCountries();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCountries = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) {
      skip = 0;
    }

    await searchEmailSetups({
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
          setCountries(res.data);
          setTotalRows(response.data.data[0].count);
          setLoading(false);
        } else if (response.data.data.length === 0) {
          setCountries([]);
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
      width: "60px",
    },
    {
      name: "Email",
      selector: (row) => row.email,
      minWidth: "70px",
    },
    {
      name: "Action",
      cell: (row) => (
        <EmailSetupActions
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

  document.title = `Email Setup | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Setup"
            title="Email Setup"
            pageTitle="Setup"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Email Setup"
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
                        data={countries}
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
          Add Email Setup
        </ModalHeader>
        <form>
          <ModalBody>
            <div className="form-floating mb-3">
              <Input
                id="add-email"
                type="text"
                placeholder="Enter Email"
                required
                name="email"
                value={values.email}
                onChange={handleChange}
              />
              <Label htmlFor="add-email">
                Email <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.email}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="add-appPassword"
                type="text"
                placeholder="Enter App Password"
                required
                name="appPassword"
                value={values.appPassword}
                onChange={handleChange}
              />
              <Label htmlFor="add-appPassword">
                App Password <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.appPassword}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="add-port"
                type="text"
                placeholder="Enter Port"
                required
                name="port"
                value={values.port}
                onChange={handleChange}
              />
              <Label htmlFor="add-port">
                Port <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.port}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="add-host"
                type="text"
                placeholder="Enter Host"
                required
                name="host"
                value={values.host}
                onChange={handleChange}
              />
              <Label htmlFor="add-host">
                Host <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.host}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                id="add-SSL"
                type="checkbox"
                className="form-check-input"
                name="SSL"
                value={values.SSL}
                onChange={handleCheck}
              />
              <Label htmlFor="add-SSL" className="form-check-label ms-1">SSL</Label>
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
              <Label htmlFor="add-isActive" className="form-check-label ms-1">Is Active</Label>
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
          Edit Service Group
        </ModalHeader>
        <form>
        <ModalBody>
            <div className="form-floating mb-3">
              <Input
                id="edit-email"
                type="text"
                placeholder="Enter Email"
                required
                name="email"
                value={values.email}
                onChange={handleChange}
              />
              <Label htmlFor="edit-email">
                Email <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.email}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="edit-appPassword"
                type="text"
                placeholder="Enter App Password"
                required
                name="appPassword"
                value={values.appPassword}
                onChange={handleChange}
              />
              <Label htmlFor="edit-appPassword">
                App Password <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.appPassword}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="edit-port"
                type="text"
                placeholder="Enter Port"
                required
                name="port"
                value={values.port}
                onChange={handleChange}
              />
              <Label htmlFor="edit-port">
                Port <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.port}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="edit-host"
                type="text"
                placeholder="Enter Host"
                required
                name="host"
                value={values.host}
                onChange={handleChange}
              />
              <Label htmlFor="edit-host">
                Host <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.host}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                id="edit-SSL"
                type="checkbox"
                className="form-check-input"
                name="SSL"
                value={values.SSL}
                checked={values.SSL}
                onChange={handleCheck}
              />
              <Label htmlFor="edit-SSL" className="form-check-label ms-1">SSL</Label>
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
              <Label htmlFor="edit-isActive" className="form-check-label ms-1">Is Active</Label>
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

export default EmailSetup;

const EmailSetupActions = ({ row, currentPagePermissions, handleTog_edit, tog_delete }) => (
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

EmailSetupActions.propTypes = {
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
          Unable to Delete Email Setup
        </ModalHeader>
        <ModalBody>
          <p className="text-danger mb-3">{message}</p>
          {services && services.length > 0 && (
            <>
              <p className="mb-2">Please delete the following services first:</p>
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
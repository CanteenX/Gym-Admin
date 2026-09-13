import React, { useState, useEffect, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Input,
  Label,
  Card,
  CardBody,
  CardHeader,
  Col,
  Form,
  Container,
  Row,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DataTable from "react-data-table-component";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import { AuthContext } from "../../context/AuthContext";
import Select from "react-select";
import { toast } from "react-toastify";
import { getAllEmailSetups, getAllEmailFor, getAllEmailTo, searchEmailTemplates, createEmailTemplate, deleteEmailTemplate, getEmailTemplateById, updateEmailTemplate } from "../../api/emails.api";
import JoditEditor from "jodit-react";
import { MenuContext } from "../../context/MenuContext";
import api from "../../api/index";
import { ENDPOINTS } from "../../api/endpoints";

const EmailTemplate = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  // Basic states
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  const initialState = {
    templateName: "",
    mailerName: "",
    emailCC: "",
    emailBCC: "",
    emailSubject: "",
    emailSignature: "",
    isActive: false,
    isAdmin: false,
  };

  const [remove_id, setRemove_id] = useState("");
  const [query, setQuery] = useState("");
  const [values, setValues] = useState(initialState);

  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [data, setData] = useState([]);

  const [emailFromList, setEmailFromList] = useState([]);
  const [selectedEmailFrom, setSelectedEmailFrom] = useState(null);
  const [emailForList, setEmailForList] = useState([]);
  const [selectedEmailFor, setSelectedEmailFor] = useState(null);
  const [emailToList, setEmailToList] = useState([]);
  const [selectedEmailTo, setSelectedEmailTo] = useState(null);

  const fetchAllEmailSetup = async () => {
    try {
      const res = await getAllEmailSetups();
      if (res.data.isOk) {
        setEmailFromList(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const fetchAllEmailFor = async () => {
    try {
      const res = await getAllEmailFor();
      if (res.data.isOk) {
        setEmailForList(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const fetchAllEmailTo = async () => {
    try {
      const res = await getAllEmailTo();
      if (res.data.isOk) {
        setEmailToList(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchAllEmailSetup();
    fetchAllEmailFor();
    fetchAllEmailTo();
  }, []);

  const editorConfig = {
    uploader: {
      url: `${api.defaults.baseURL}${ENDPOINTS.EMAIL_TEMPLATES.UPLOAD_SIGNATURE}`,
      method: "POST",
      withCredentials: true, // Send cookies for authentication
      filesVariableName: () => "signatureImage",
      format: "json",
      isSuccess: (resp) => resp.data.isOk,
      getMessage: (resp) => resp.data.message,
      process: (resp) => {
        return {
          files: [resp.data.url],
          path: resp.data.url,
          baseurl: "",
          error: resp.data.isOk ? 0 : 1,
          message: resp.data.message,
        };
      },
      /* eslint-disable react/no-this-in-sfc */
      defaultHandlerSuccess: function (data) {
        if (data.files?.length) {
          this.selection.insertImage(data.files[0]);
          // Add paste handler
          this.editor.events.on('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            this.editor.selection.insertHTML(text);
          });
        }
      },
      /* eslint-enable react/no-this-in-sfc */
    },
    enableDragAndDropFileToEditor: true,
    imageDefaultWidth: "100%",
    removeButtons: ["source"],
    buttons: [
      "undo",
      "redo",
      "|",
      "bold",
      "italic",
      "underline",
      "indent",
      "|",
      "ul",
      "ol",
      "|",
      "link",
      "unlink",
      "|",
      "image",
      "video",
      "|",
      "align",
      "brush",
      "fontsize",
      "font",
      "|",
      "fullsize",
    ],
    events: {
      afterInit: function (editor) {
        editor.events.on('paste', (e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          editor.selection.insertHTML(text);
        });
      }
    }
  };

  const columns = useMemo(() => [
    {
      name: "Sr No",
      selector: (row, index) => index + 1,
      sortable: true,
      sortField: "createdAt",
      maxWidth: "10px",
    },
    {
      name: "Template Name",
      cell: (row) => <TemplateNameCell row={row} />,
      maxWidth: "150px",
    },
    {
      name: "Email From",
      cell: (row) => <EmailFromCell row={row} />,
      maxWidth: "250px",
    },
    {
      name: "Email For",
      cell: (row) => <EmailForCell row={row} />,
      maxWidth: "150px",
    },
    {
      name: "Mailer Name",
      cell: (row) => <MailerNameCell row={row} />,
      maxWidth: "200px",
    },
    {
      name: "Action",
      cell: (row) => (
        <EmailTemplateActions
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

  const fetchEmployeeMaster = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    await searchEmailTemplates({
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
          setData(res.data);
          setTotalRows(res.count);
        } else {
          setData([]);
        }
      })
      .catch((err) => {
        console.log(err);
      });
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployeeMaster();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const validate = (values) => {
    const errors = {};
    if (!values.templateName) errors.templateName = "Template Name is required";
    if (!selectedEmailFor) errors.emailFor = "Email For is required";
    if (!selectedEmailFrom) errors.emailFrom = "Email From is required";
    if (!values.mailerName) errors.mailerName = "Mailer Name is required";
    if (!values.emailSubject) errors.emailSubject = "Email Subject is required";
    if (!values.emailSignature) errors.emailSignature = "Email Signature is required";
    if (values.isAdmin && !selectedEmailTo) errors.emailTo = "Email To is required";
    return errors;
  };

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length === 0) {
      const dataToSend = {
        ...values,
        emailFrom: selectedEmailFrom.value,
        emailFor: selectedEmailFor.value,
        emailTo: values.isAdmin && selectedEmailTo ? selectedEmailTo.value : null
      };
      createEmailTemplate(dataToSend)
        .then((res) => {
          setShowForm(false);
          setValues(initialState);
          setSelectedEmailFor(null);
          setSelectedEmailFrom(null);
          setSelectedEmailTo(null);
          setIsSubmit(false);
          setFormErrors({});
          fetchEmployeeMaster();
          toast.success("Email Template Added Successfully");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to add email template");
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length === 0) {
      const dataToSend = {
        ...values,
        emailFrom: selectedEmailFrom.value,
        emailFor: selectedEmailFor.value,
        emailTo: values.isAdmin && selectedEmailTo ? selectedEmailTo.value : null
      };
      updateEmailTemplate(selectedId, dataToSend)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Email Template Updated Successfully");
            setUpdateForm(false);
            setShowForm(false);
            setValues(initialState);
            setSelectedEmailFor(null);
            setSelectedEmailFrom(null);
            setSelectedEmailTo(null);
            setIsSubmit(false);
            setFormErrors({});
            fetchEmployeeMaster();
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Cannot update Email Template");
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setIsSubmit(false);
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setSelectedEmailFor(null);
    setSelectedEmailFrom(null);
    setSelectedEmailTo(null);
    setFormErrors({});
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteEmailTemplate(remove_id)
      .then((res) => {
        setmodal_delete(!modal_delete);
        fetchEmployeeMaster();
        toast.success("Employee Deleted Successfully");
      })
      .catch((err) => {
        console.log(err);
        toast.error("Cannot delete Employee");
      })
      .finally(() => setIsDeleteLoading(false));
  };

  const handleDeleteClose = (e) => {
    e.preventDefault();
    setmodal_delete(false);
  };

  const handleTog_edit = (id) => {
    setIsSubmit(false);
    setUpdateForm(true);
    setSelectedId(id);
    setFormErrors({});
    getEmailTemplateById(id)
      .then((res) => {
        if (res.data.isOk) {
          setValues({
            templateName: res.data.data.templateName,
            mailerName: res.data.data.mailerName,
            emailCC: res.data.data.emailCC,
            emailBCC: res.data.data.emailBCC,
            emailSubject: res.data.data.emailSubject,
            emailSignature: res.data.data.emailSignature,
            isActive: res.data.data.isActive,
            isAdmin: res.data.data.isAdmin || false,
          });
          setSelectedEmailFrom({
            value: res.data.data.emailFrom._id,
            label: res.data.data.emailFrom.email,
          });
          setSelectedEmailFor({
            value: res.data.data.emailFor._id,
            label: res.data.data.emailFor.emailFor,
          });
          if (res.data.data.emailTo) {
            setSelectedEmailTo({
              value: res.data.data.emailTo._id,
              label: `${res.data.data.emailTo.name} (${res.data.data.emailTo.email})`,
            });
          } else {
            setSelectedEmailTo(null);
          }
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to fetch email template details");
      });
  };


  const [modal_delete, setmodal_delete] = useState(false);
  const tog_delete = (_id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(_id);
  };

  const handlecheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSort = (column, sortDirection) => {
    setcolumn(column.sortField);
    setsortDirection(sortDirection);
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

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setSelectedEmailFor(null);
    setSelectedEmailFrom(null);
    setSelectedEmailTo(null);
    setFormErrors({});
  };

  const renderForm = () => (
    <CardBody>
      <Col xxl={12}>
        <Card>
          <CardBody>
            <div className="live-preview">
              <Form>
                <Row>
                  <Row>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          id="templateName"
                          className="form-control"
                          required
                          name="templateName"
                          value={values.templateName}
                          onChange={handleChange}
                        />
                        <label htmlFor="templateName" className="form-label">
                          Template Name <span className="text-danger"> *</span>
                        </label>
                        {isSubmit && (
                          <p className="text-danger">{formErrors.templateName}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="emailFromSelect"
                          className="basic-single"
                          classNamePrefix="select"
                          placeholder=""
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: "58px",
                              height: "58px",
                              backgroundColor: "transparent",
                            }),
                            placeholder: (base) => ({
                              ...base,
                              marginTop: "8px",
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              marginTop: "8px",
                            }),
                          }}
                          options={emailFromList.map((branch) => ({
                            value: branch._id,
                            label: branch.email,
                          }))}
                          value={selectedEmailFrom}
                          onChange={(selectedOption) => {
                            setSelectedEmailFrom(selectedOption);
                          }}
                        />
                        <label
                          htmlFor="emailFromSelect"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Email From <span className="text-danger"> *</span>
                        </label>
                        {isSubmit && (
                          <p className="text-danger">{formErrors.emailFrom}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="emailForSelect"
                          className="basic-single"
                          classNamePrefix="select"
                          placeholder=""
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: "58px",
                              height: "58px",
                              backgroundColor: "transparent",
                            }),
                            placeholder: (base) => ({
                              ...base,
                              marginTop: "8px",
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              marginTop: "8px",
                            }),
                          }}
                          options={emailForList.map((branch) => ({
                            value: branch._id,
                            label: branch.emailFor,
                          }))}
                          value={selectedEmailFor}
                          onChange={(selectedOption) => {
                            setSelectedEmailFor(selectedOption);
                          }}
                        />
                        <label
                          htmlFor="emailForSelect"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Email For <span className="text-danger"> *</span>
                        </label>
                        {isSubmit && (
                          <p className="text-danger">{formErrors.emailFor}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          id="mailerName"
                          className="form-control"
                          required
                          name="mailerName"
                          value={values.mailerName}
                          onChange={handleChange}
                        />
                        <label htmlFor="mailerName" className="form-label">
                          Mailer Name <span className="text-danger"> *</span>
                        </label>
                        {isSubmit && (
                          <p className="text-danger">{formErrors.mailerName}</p>
                        )}
                      </div>
                    </Col>
                    {values.isAdmin && (
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Select
                            inputId="emailToSelect"
                            className="basic-single"
                            classNamePrefix="select"
                            placeholder=""
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: "58px",
                                height: "58px",
                                backgroundColor: "transparent",
                              }),
                              placeholder: (base) => ({
                                ...base,
                                marginTop: "8px",
                              }),
                              valueContainer: (base) => ({
                                ...base,
                                marginTop: "8px",
                              }),
                            }}
                            options={emailToList.map((to) => ({
                              value: to._id,
                              label: `${to.name} (${to.email})`,
                            }))}
                            value={selectedEmailTo}
                            onChange={(selectedOption) => {
                              setSelectedEmailTo(selectedOption);
                            }}
                          />
                          <label
                            htmlFor="emailToSelect"
                            className="form-label"
                            style={{
                              opacity: 0.7,
                              transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                            }}
                          >
                            Email To <span className="text-danger"> *</span>
                          </label>
                          {isSubmit && (
                            <p className="text-danger">{formErrors.emailTo}</p>
                          )}
                        </div>
                      </Col>
                    )}
                  </Row>
                  <Row>
                    <Col lg={4}>
                      <div className="form-floating mb-3">
                        <textarea
                          type="text"
                          id="emailCC"
                          className="form-control"
                          style={{ height: "100px" }}
                          // required
                          name="emailCC"
                          value={values.emailCC}
                          onChange={handleChange}
                        />
                        <label htmlFor="emailCC" className="form-label">
                          Email CC
                        </label>
                      </div>
                    </Col>
                    <Col lg={4}>
                      <div className="form-floating mb-3">
                        <textarea
                          type="text"
                          id="emailBCC"
                          className="form-control"
                          style={{ height: "100px" }}
                          // required
                          name="emailBCC"
                          value={values.emailBCC}
                          onChange={handleChange}
                        />
                        <label htmlFor="emailBCC" className="form-label">
                          Email BCC
                        </label>
                      </div>
                    </Col>
                    <Col lg={4}>
                      <div className="form-floating mb-3">
                        <textarea
                          type="text"
                          id="emailSubject"
                          className="form-control"
                          style={{ height: "100px" }}
                          required
                          name="emailSubject"
                          value={values.emailSubject}
                          onChange={handleChange}
                        />
                        <label htmlFor="emailSubject" className="form-label">
                          Email Subject <span className="text-danger"> *</span>
                        </label>
                        {isSubmit && (
                          <p className="text-danger">{formErrors.emailSubject}</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col lg={12}>
                      <div className=" mb-3">
                        <label htmlFor="emailSignature" className="form-label">
                          Email Signature <span className="text-danger"> *</span>
                        </label>
                        <JoditEditor
                          id="emailSignature"
                          value={
                            values.emailSignature
                          }
                          config={
                            editorConfig
                          }
                          tabIndex={
                            0
                          }
                          name="emailSignature"
                          onBlur={(
                            newContent
                          ) =>
                            setValues({
                              ...values, emailSignature: newContent
                            })
                          }
                        />
                        {isSubmit && (
                          <p className="text-danger">{formErrors.emailSignature}</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                  <div className="mt-5">
                    <Row>
                      <Col lg={2}>
                        <div className="form-check mb-2">
                          <Input
                            id="etpl-is-active"
                            type="checkbox"
                            name="isActive"
                            value={values.isActive}
                            onChange={handlecheck}
                            checked={values.isActive}
                          />
                          <Label htmlFor="etpl-is-active" className="form-check-label">
                            Is Active
                          </Label>
                        </div>
                      </Col>
                      <Col lg={2}>
                        <div className="form-check mb-2">
                          <Input
                            id="etpl-admin-template"
                            type="checkbox"
                            name="isAdmin"
                            value={values.isAdmin}
                            onChange={handlecheck}
                            checked={values.isAdmin}
                          />
                          <Label htmlFor="etpl-admin-template" className="form-check-label">
                            Admin Template
                          </Label>
                        </div>
                      </Col>
                    </Row>
                  </div>
                  <Col lg={12}>
                    <FormsFooter
                      handleSubmit={updateForm ? handleUpdate : handleClick}
                      handleSubmitCancel={handleCancel}
                      isLoading={isLoading}
                    />
                  </Col>
                </Row>
              </Form>
            </div>
          </CardBody>
        </Card>
      </Col>
    </CardBody>
  );

  document.title = `Email Template | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="Email Template" pageTitle="Setup" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Email Template"
                    filter={filter}
                    handleFilter={handleFilter}
                    tog_list={tog_list}
                    setQuery={setQuery}
                    initialState={initialState}
                    setValues={setValues}
                    updateForm={updateForm}
                    showForm={showForm}
                    setShowForm={setShowForm}
                    setUpdateForm={setUpdateForm}
                    currentPagePermissions={currentPagePermissions}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>

                {(showForm || updateForm) ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1 text-right">
                      <DataTable
                        columns={columns}
                        data={data}
                        progressPending={loading}
                        sortServer
                        onSort={(column, sortDirection) =>
                          handleSort(column, sortDirection)
                        }
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
                        onChangeRowsPerPage={handlePerRowsChange}
                        onChangePage={handlePageChange}
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
        toggle={handleDeleteClose}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default EmailTemplate;

const TemplateNameCell = ({ row }) => (
  <span className="text-wrap">{row.templateName}</span>
);

TemplateNameCell.propTypes = {
  row: PropTypes.object.isRequired,
};

const EmailFromCell = ({ row }) => (
  <span className="text-wrap">{row.emailFrom?.email}</span>
);

EmailFromCell.propTypes = {
  row: PropTypes.object.isRequired,
};

const EmailForCell = ({ row }) => (
  <span className="text-wrap">{row.emailFor?.emailFor}</span>
);

EmailForCell.propTypes = {
  row: PropTypes.object.isRequired,
};

const MailerNameCell = ({ row }) => (
  <span className="text-wrap">{row.mailerName}</span>
);

MailerNameCell.propTypes = {
  row: PropTypes.object.isRequired,
};

const EmailTemplateActions = ({ row, currentPagePermissions, handleTog_edit, tog_delete }) => (
  <div className="d-flex gap-2">
    {currentPagePermissions.edit && (
      <button
        className="btn btn-sm btn-success edit-item-btn"
        data-bs-toggle="modal"
        data-bs-target="#showModal"
        onClick={() => handleTog_edit(row._id)}
      >
        Edit
      </button>
    )}
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
);

EmailTemplateActions.propTypes = {
  row: PropTypes.object.isRequired,
  currentPagePermissions: PropTypes.object.isRequired,
  handleTog_edit: PropTypes.func.isRequired,
  tog_delete: PropTypes.func.isRequired,
};

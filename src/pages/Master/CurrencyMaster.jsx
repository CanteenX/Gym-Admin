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
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import ReferenceErrorModal from "../../Components/Common/ReferenceErrorModal";
import { createCurrency, deleteCurrency, getCurrencyById, updateCurrency, searchCurrencies } from "../../api/currencies.api";

const initialState = {
  currencyName: "",
  currencyCode:"",
  currencySymbol: "",
  isActive: false,
};

const getColumns = ({ currentPagePermissions, handleTog_edit, tog_delete }) => [
  {
    name: "Sr No",
    selector: (row, index) => index + 1, 
    sortable: true,
    maxWidth: "20px",
  },
  {
    name: "Currency Name",
    selector: (row) => row.currencyName,
    minWidth: "130px",
  },
  {
    name: "Currency Code",
    selector: (row) => row.currencyCode,
    sortable: false,
  },
  {
    name: "Currency Symbol",
    selector: (row) => row.currencySymbol,
    sortable: false,
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
          {!currentPagePermissions.edit && !currentPagePermissions.delete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      </div>
    ),
    sortable: false,
    minWidth: "180px",
  },
];

const CurrencyMaster = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  
  const [referenceModal, setReferenceModal] = useState(false);
  const [referenceData, setReferenceData] = useState(null);
  
  // Separate loading states for different operations
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isEditFetching, setIsEditFetching] = useState(false);

  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [remove_id, setRemove_id] = useState("");

  const [currencies, setCurrencies] = useState([]);

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
  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(id);
  };

  const [modal_edit, setmodal_edit] = useState(false);
  const handleTog_edit = (id) => {
    setmodal_edit(!modal_edit);
    setIsSubmit(false);
    setSelectedId(id);
    setIsEditFetching(true);
    getCurrencyById(id)
      .then((res) => {
        setValues({
          ...values,
          currencyName: res.data.data.currencyName,
          currencyCode: res.data.data.currencyCode,
          currencySymbol: res.data.data.currencySymbol,
          isActive: res.data.data.isActive,
        });
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to fetch currency details");
      }).finally(() => {
        setIsEditFetching(false);
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
    if (
      Object.keys(errors).length === 0
    ) {
      setIsSubmitLoading(true);
      createCurrency(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Currency Added Successfully!");
            setmodal_list(!modal_list);
            setValues(initialState);
            fetchCurrencies();
          }
        })
        .catch((error) => {
          console.log(error);
          toast.error("Failed to add currency. Please try again.");
        }).finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteCurrency(remove_id)
      .then((res) => {
        setmodal_delete(!modal_delete);
        fetchCurrencies();
        toast.success("Currency Removed Successfully!");
      })
      .catch((err) => {
              console.log(err);
              setmodal_delete(false);
              
              if (err.response?.status === 409) {
                // Handle reference error
                setReferenceData(err.response.data);
                setReferenceModal(true);
              } else {
                toast.error("Failed to delete currency. Please try again.");
              }
            }).finally(()=>{
              setIsDeleteLoading(false);
            });
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
      updateCurrency(selectedId, values)
        .then((res) => {
          setmodal_edit(!modal_edit);
          fetchCurrencies();
          toast.success("Currency Updated Successfully!");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to update currency. Please try again.");
        }).finally(() => {
          setIsUpdateLoading(false);
        });
    }
  };

  const validate = (values) => {
    const errors = {};

    if (values.currencyName === "") {
      errors.currencyName = "Currency Name is required!";
    }
    if(values.currencyCode === "") {
      errors.currencyCode = "Currency Code is required!";
    }
    if (values.currencySymbol === "") {
      errors.currencySymbol = "Currency Symbol is required!";
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
    fetchCurrencies();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCurrencies = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) {
      skip = 0;
    }

    await searchCurrencies({
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
          setCurrencies(res.data);
          setTotalRows(response.data.data[0].count);
          setLoading(false);
        } else if (response.data.data.length === 0) {
          setCurrencies([]);
        }
      });

    setLoading(false);
  };

  const handlePageChange = (page) => {
    setPageNo(page);
  };

  const handleReferenceModalClose = () => {
    setReferenceModal(false);
    setReferenceData(null);
  };

  const handlePerRowsChange = async (newPerPage, page) => {
    setPerPage(newPerPage);
  };
  const handleFilter = (e) => {
    setFilter(e.target.checked);
  };
  const columns = useMemo(() => getColumns({ currentPagePermissions, handleTog_edit, tog_delete }), [currentPagePermissions, handleTog_edit, tog_delete]);

  document.title = `Country | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Currency"
            pageTitle="Master"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Currency"
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
                        columns={columns}
                        data={currencies}
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
          Add Currency
        </ModalHeader>
        <form>
          <ModalBody>
            <div className="form-floating mb-3">
              <Input
                id="cur-currency"
                type="text"
                placeholder="Enter Currency Name"
                required
                name="currencyName"
                value={values.currencyName}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency">
                Currency <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencyName}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="cur-currency-code"
                type="text"
                placeholder="Enter Country Code"
                required
                name="currencyCode"
                value={values.currencyCode}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency-code">
                Currency Code <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencyCode}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="cur-currency-symbol"
                type="text"
                placeholder="Enter Currency Symbol"
                required
                name="currencySymbol"
                value={values.currencySymbol}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency-symbol">
                Currency Symbol <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencySymbol}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                id="cur-is-active"
                type="checkbox"
                className="form-check-input"
                name="isActive"
                value={values.isActive}
                onChange={handleCheck}
              />
              <Label htmlFor="cur-is-active" className="form-check-label ms-1">Is Active</Label>
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
          Edit Currency
        </ModalHeader>
        <form>
          <ModalBody>
          <div className="form-floating mb-3">
              <Input
                id="cur-currency-edit"
                type="text"
                placeholder="Enter Currency Name"
                required
                name="currencyName"
                value={values.currencyName}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency-edit">
                Currency <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencyName}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="cur-currency-code-edit"
                type="text"
                placeholder="Enter Currency Code"
                required
                name="currencyCode"
                value={values.currencyCode}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency-code-edit">
                Currency Code <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencyCode}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                id="cur-currency-symbol-edit"
                type="text"
                placeholder="Enter Currency Symbol"
                required
                name="currencySymbol"
                value={values.currencySymbol}
                onChange={handleChange}
              />
              <Label htmlFor="cur-currency-symbol-edit">
                Currency Symbol <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.currencySymbol}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                id="cur-is-active-edit"
                type="checkbox"
                className="form-check-input"
                name="isActive"
                value={values.isActive}
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label htmlFor="cur-is-active-edit" className="form-check-label ms-1">Is Active</Label>
            </div>
          </ModalBody>

          <ModalFooter>
            <FormUpdateFooter
              handleUpdate={handleUpdate}
              handleUpdateCancel={handleUpdateCancel}
              isLoading={isUpdateLoading || isEditFetching}
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
        title="Cannot Delete Currency"
        referenceData={referenceData}
      />

    </React.Fragment>
  );
};

export default CurrencyMaster;

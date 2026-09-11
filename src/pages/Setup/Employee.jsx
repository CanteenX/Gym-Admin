import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
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
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DataTable from "react-data-table-component";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import { AuthContext } from "../../context/AuthContext";
import Select from "react-select";
import { toast } from "react-toastify";
import { getAllDepartments } from "../../api/departments.api";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../../api/locations.api";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
  searchEmployees,
  resetEmployeePassword,
} from "../../api/employees.api";
import {
  getCompaniesList,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyById,
} from "../../api/companies.api";
import { MenuContext } from "../../context/MenuContext";
import { getAllRoles } from "../../api/roles.api";
import config from "../../config";

const Employee = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  // Core Navigation Tabs (for Super Admin only)
  const [activeTab, setActiveTab] = useState("employee"); // "employee" or "admin"

  // Basic lists & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  const initialState = {
    employeeName: "",
    departmentId: "",
    emailOffice: "",
    mobileNumber: "",
    countryId: "",
    stateId: "",
    cityId: "",
    address: "",
    password: "",
    // "" means all branches (super admin). Only a super admin may pick it.
    branch: "",
    isSuperAdmin: false,
    isActive: true,
  };

  // Whether the CURRENT user may hand out cross-branch access. The server
  // enforces this too (employee.controller.js) — this only keeps the UI honest.
  const canGrantAllBranches = adminData?.isSuperAdmin === true;

  const branchOptions = [
    { value: "Vasna", label: "Vasna" },
    { value: "Gotri", label: "Gotri" },
    ...(canGrantAllBranches
      ? [{ value: "", label: "All Branches (Super Admin)" }]
      : []),
  ];

  const [remove_id, setRemove_id] = useState("");
  const [query, setQuery] = useState("");
  const [values, setValues] = useState(initialState);

  // Password reset states (employees only)
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState("");

  // Data list grids
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [data, setData] = useState([]); // Employee list data
  const [adminsList, setAdminsList] = useState([]); // Client Admin list data

  // Geographic and dropdown data
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [roleList, setRoleList] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  // --- Admin Modal States ---
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isEditAdmin, setIsEditAdmin] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [adminErrors, setAdminErrors] = useState({});
  const [adminValues, setAdminValues] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const getDepartmentList = async () => {
    try {
      const res = await getAllDepartments();
      if (res.data.isOk) {
        setDepartmentList(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchCountries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllCountries();
      if (response.data.isOk) {
        setCountryList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatesByCountry = useCallback(async (countryId) => {
    try {
      setIsStatesLoading(true);
      setStateList([]);
      setCityList([]);
      const response = await getStatesByCountry(countryId);
      if (response.data.isOk) {
        setStateList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
      toast.error("Failed to load states");
    } finally {
      setIsStatesLoading(false);
    }
  }, []);

  const fetchCitiesByState = useCallback(async (stateId) => {
    try {
      setIsCitiesLoading(true);
      setCityList([]);
      const response = await getCitiesByState(stateId);
      if (response.data.isOk) {
        setCityList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      toast.error("Failed to load cities");
    } finally {
      setIsCitiesLoading(false);
    }
  }, []);

  const getRoleList = async () => {
    try {
      const res = await getAllRoles();
      if (res.data.isOk) {
        setRoleList(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    }
  };

  const fetchEmployeeMaster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchEmployees({
        page: pageNo,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
        branchId: adminData.branchId ? adminData.branchId._id : null,
      });
      if (response.data.data.length > 0) {
        let res = response.data.data[0];
        setData(res.data);
        setTotalRows(res.count);
      } else {
        setData([]);
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDirection, query, filter, adminData.branchId]);

  const fetchAdminsList = async () => {
    setLoading(true);
    try {
      const response = await getCompaniesList();
      if (response.data.isOk) {
        setAdminsList(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load companies:", error);
      toast.error("Failed to load onboarded admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDepartmentList();
    fetchCountries();
    getRoleList();
  }, [fetchCountries]);

  useEffect(() => {
    if (activeTab === "admin") {
      fetchAdminsList();
    } else {
      fetchEmployeeMaster();
    }
  }, [activeTab, fetchEmployeeMaster]);

  const validate = (values) => {
    const errors = {};
    if (!values.employeeName) errors.employeeName = "Name is required";
    if (!values.address) errors.address = "Address is required";
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.emailOffice))
      errors.emailOffice = "Invalid email address";
    if (!values.emailOffice) errors.emailOffice = "Email is required";
    if (!values.password && !updateForm) errors.password = "Password is required";
    if (!selectedDepartment) errors.department = "Department is required";
    if (!values.countryId) errors.country = "Country is required";
    if (!values.stateId) errors.state = "State is required";
    if (!values.cityId) errors.city = "City is required";
    if (values.officeMobileNumber && values.officeMobileNumber.length !== 10)
      errors.officeMobileNumber = "Phone number should be 10 digits";
    if (!selectedRole) errors.role = "Role is required";
    // "" (all branches) is only a valid choice for a super admin creating
    // another super admin; everyone else must pick a real branch.
    if (!values.branch && !(canGrantAllBranches && values.isSuperAdmin)) {
      errors.branch = "Branch is required";
    }
    return errors;
  };

  // Standard Employee save
  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsLoading(true);
      const employeeData = {
        employeeName: values.employeeName,
        departmentId: selectedDepartment?.value || "",
        countryId: values.countryId,
        stateId: values.stateId,
        cityId: values.cityId,
        roleId: selectedRole?.value || "",
        emailOffice: values.emailOffice,
        mobileNumber: values.mobileNumber,
        address: values.address,
        password: values.password,
        // "" = all branches; the server stores it as null.
        branch: values.branch,
        isSuperAdmin: values.isSuperAdmin,
        isActive: values.isActive,
      };

      createEmployee(employeeData)
        .then((res) => {
          setShowForm(false);
          setValues(initialState);
          setIsSubmit(false);
          setFormErrors({});
          setSelectedDepartment(null);
          setSelectedRole(null);
          setStateList([]);
          setCityList([]);
          fetchEmployeeMaster();
          toast.success("Employee Added Successfully");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to add employee. Please try again.");
        })
        .finally(() => setIsLoading(false));
    }
  };

  // Standard Employee update
  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsLoading(true);
      const employeeData = {
        employeeName: values.employeeName,
        departmentId: selectedDepartment?.value || "",
        countryId: values.countryId,
        stateId: values.stateId,
        cityId: values.cityId,
        roleId: selectedRole?.value || "",
        emailOffice: values.emailOffice,
        mobileNumber: values.mobileNumber,
        address: values.address,
        branch: values.branch,
        isSuperAdmin: values.isSuperAdmin,
        isActive: values.isActive,
      };

      updateEmployee(selectedId, employeeData)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Employee Updated Successfully");
            setUpdateForm(false);
            setShowForm(false);
            setValues(initialState);
            setIsSubmit(false);
            setFormErrors({});
            setSelectedDepartment(null);
            setSelectedRole(null);
            setStateList([]);
            setCityList([]);
            fetchEmployeeMaster();
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Cannot update Employee");
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
    setFormErrors({});
    setSelectedDepartment(null);
    setSelectedRole(null);
    setStateList([]);
    setCityList([]);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);

    if (activeTab === "admin") {
      deleteCompany(remove_id)
        .then(() => {
          setmodal_delete(!modal_delete);
          fetchAdminsList();
          toast.success("Admin Profile Deleted Successfully");
        })
        .catch((err) => {
          console.error(err);
          toast.error("Cannot delete Company Admin");
        })
        .finally(() => setIsDeleteLoading(false));
    } else {
      deleteEmployee(remove_id)
        .then(() => {
          setmodal_delete(!modal_delete);
          fetchEmployeeMaster();
          toast.success("Employee Deleted Successfully");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Cannot delete Employee");
        })
        .finally(() => setIsDeleteLoading(false));
    }
  };

  const handleDeleteClose = (e) => {
    e.preventDefault();
    setmodal_delete(false);
  };

  const handleTog_edit = async (_id) => {
    setIsSubmit(false);
    setFormErrors({});
    setIsLoading(true);

    if (activeTab === "admin") {
      // Editing admin opens AdminModal instead of employee form
      setIsEditAdmin(true);
      setSelectedId(_id);
      setAdminErrors({});
      try {
        const res = await getCompanyById(_id);
        if (res.data.isOk) {
          const company = res.data.data;
          setAdminValues({
            companyName: company.companyName || "",
            email: company.email || "",
            password: "", // Keep blank to preserve same
          });
          setShowAdminModal(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch admin details");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Standard employee edit
      setUpdateForm(true);
      setSelectedId(_id);
      setShowResetPassword(false);
      try {
        const res = await getEmployeeById(_id);
        if (res.data.isOk) {
          const employeeData = res.data.data;
          setValues({
            ...initialState,
            employeeName: employeeData.employeeName,
            countryId: employeeData.countryId?._id || employeeData.countryId || "",
            stateId: employeeData.stateId?._id || employeeData.stateId || "",
            cityId: employeeData.cityId?._id || employeeData.cityId || "",
            departmentId: employeeData.departmentId?._id || "",
            emailOffice: employeeData.emailOffice,
            mobileNumber: employeeData.mobileNumber,
            address: employeeData.address,
            // null (all branches) comes back as "" for the select.
            branch: employeeData.branch || "",
            isSuperAdmin: employeeData.isSuperAdmin === true,
            isActive: employeeData.isActive,
          });

          setSelectedDepartment({
            value: employeeData.departmentId._id,
            label: employeeData.departmentId.departmentName,
          });

          setSelectedRole({
            value: employeeData.roleId._id,
            label: employeeData.roleId.roleName,
          });

          if (employeeData.countryId) {
            await fetchStatesByCountry(employeeData.countryId._id || employeeData.countryId);
            if (employeeData.stateId) {
              await fetchCitiesByState(employeeData.stateId._id || employeeData.stateId);
            }
          }
        }
      } catch (err) {
        console.log(err);
        toast.error("Failed to fetch employee details");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const [modal_delete, setmodal_delete] = useState(false);
  const tog_delete = (_id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(_id);
  };

  const handlecheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "employeeShortName") {
      newValue = value.toUpperCase();
      setValues({ ...values, [name]: newValue });
    } else if (name === "countryId") {
      const selectedCountry = countryList.find((country) => country._id === value);
      if (selectedCountry) {
        setValues({
          ...values,
          countryId: value,
          stateId: "",
          cityId: "",
        });
        setStateList([]);
        setCityList([]);
        await fetchStatesByCountry(value);
      }
    } else if (name === "stateId") {
      setValues({
        ...values,
        stateId: value,
        cityId: "",
      });
      setCityList([]);
      await fetchCitiesByState(value);
    } else if (name === "cityId") {
      setValues({ ...values, cityId: value });
    } else {
      setValues({ ...values, [name]: newValue });
    }
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

  const handlePasswordResetChange = (e) => {
    setResetPasswordData({
      ...resetPasswordData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleResetPassword = () => {
    setShowResetPassword(!showResetPassword);
    setPasswordResetError("");
    setResetPasswordData({
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setPasswordResetError("Passwords do not match");
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      setPasswordResetError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await resetEmployeePassword(selectedId, {
        password: resetPasswordData.newPassword,
      });

      if (response.isOk) {
        toast.success("Password reset successfully");
        toggleResetPassword();
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Admin Modal Handlers ---
  const toggleAdminModal = () => {
    setShowAdminModal(!showAdminModal);
    setShowAdminPassword(false);
  };

  const handleAdminInputChange = (e) => {
    setAdminValues({ ...adminValues, [e.target.name]: e.target.value });
  };

  const validateAdminFields = () => {
    const errors = {};
    if (!adminValues.companyName.trim()) {
      errors.companyName = "Company Name is required";
    }
    if (!adminValues.email.trim()) {
      errors.email = "Email Address is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(adminValues.email)) {
      errors.email = "Invalid email address";
    }
    if (!isEditAdmin && !adminValues.password.trim()) {
      errors.password = "Password is required";
    } else if (adminValues.password.trim()) {
      if (adminValues.password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(adminValues.password)) {
        errors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      }
    }
    return errors;
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    const errors = validateAdminFields();
    setAdminErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsAdminSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("companyName", adminValues.companyName);
      formData.append("email", adminValues.email);
      if (adminValues.password.trim()) {
        formData.append("password", adminValues.password);
      }

      let response;
      if (isEditAdmin) {
        response = await updateCompany(selectedId, formData);
        if (response.data.isOk) {
          toast.success("Client Admin Account updated successfully!");
          setShowAdminModal(false);
          fetchAdminsList();
        }
      } else {
        response = await createCompany(formData);
        if (response.data.isOk) {
          toast.success("Client Admin Account onboarded successfully!");
          setShowAdminModal(false);
          fetchAdminsList();
        }
      }
    } catch (error) {
      console.error("Failed to save admin:", error);
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setAdminErrors(serverErrors);
      } else {
        toast.error(error.response?.data?.message || "Failed to onboard client admin.");
      }
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleList = () => {
    if (activeTab === "admin") {
      // For Admin Tab, clicking "+ Add" or "+ Add Admin" triggers modal popup
      setIsEditAdmin(false);
      setAdminErrors({});
      setAdminValues({
        companyName: "",
        email: "",
        password: "",
      });
      setShowAdminModal(true);
    } else {
      // Standard employee form toggle
      setShowForm(false);
      setUpdateForm(false);
      setIsSubmit(false);
      setValues(initialState);
      setSelectedDepartment(null);
      setSelectedRole(null);
      setFormErrors({});
      setShowResetPassword(false);
      setStateList([]);
      setCityList([]);
    }
  };

  // Reverted standard Employee form render (clean and simple)
  const renderForm = () => (
    <CardBody>
      <Col xxl={12}>
        <Card className="border-0">
          <CardBody>
            <div className="live-preview">
              <Form onSubmit={updateForm ? handleUpdate : handleClick}>
                <Row>
                  <Row>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          id="employeeName"
                          className="form-control"
                          required
                          name="employeeName"
                          value={values.employeeName}
                          onChange={handleChange}
                        />
                        <label htmlFor="employeeName" className="form-label">
                          Name <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.employeeName && (
                          <p className="text-danger">{formErrors.employeeName}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="departmentId"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={departmentList.map((dept) => ({
                            value: dept._id,
                            label: dept.departmentName,
                          }))}
                          value={selectedDepartment}
                          onChange={(opt) => setSelectedDepartment(opt)}
                        />
                        <label
                          htmlFor="departmentId"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Department <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.department && (
                          <p className="text-danger">{formErrors.department}</p>
                        )}
                      </div>
                    </Col>

                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          id="emailOffice"
                          className="form-control"
                          required
                          name="emailOffice"
                          value={values.emailOffice}
                          onChange={handleChange}
                        />
                        <label htmlFor="emailOffice" className="form-label">
                          Email Office <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.emailOffice && (
                          <p className="text-danger">{formErrors.emailOffice}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Input
                          type="tel"
                          id="mobileNumber"
                          className="form-control"
                          required
                          name="mobileNumber"
                          value={values.mobileNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d+$/.test(value)) {
                              setValues({ ...values, mobileNumber: value });
                            }
                          }}
                          maxLength={10}
                          pattern="[0-9]{10}"
                        />
                        <label htmlFor="mobileNumber" className="form-label">
                          Mobile Number
                        </label>
                        {isSubmit && formErrors.mobileNumber && (
                          <p className="text-danger">{formErrors.mobileNumber}</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="countryId"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={countryList.map((c) => ({
                            value: c._id,
                            label: c.countryName,
                          }))}
                          value={
                            countryList.some((c) => c._id === values.countryId)
                              ? {
                                  value: values.countryId,
                                  label: countryList.find((c) => c._id === values.countryId)?.countryName,
                                }
                              : null
                          }
                          onChange={(opt) => handleChange({ target: { name: "countryId", value: opt?.value } })}
                          isLoading={isLoading}
                        />
                        <label
                          htmlFor="countryId"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Country <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.country && (
                          <p className="text-danger">{formErrors.country}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="stateId"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={stateList.map((s) => ({
                            value: s._id,
                            label: s.stateName,
                          }))}
                          value={
                            stateList.some((s) => s._id === values.stateId)
                              ? {
                                  value: values.stateId,
                                  label: stateList.find((s) => s._id === values.stateId)?.stateName,
                                }
                              : null
                          }
                          onChange={(opt) => handleChange({ target: { name: "stateId", value: opt?.value } })}
                          disabled={!values.countryId || isStatesLoading}
                        />
                        <label
                          htmlFor="stateId"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          State <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.state && (
                          <p className="text-danger">{formErrors.state}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="cityId"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={cityList.map((ct) => ({
                            value: ct._id,
                            label: ct.cityName,
                          }))}
                          value={
                            cityList.some((ct) => ct._id === values.cityId)
                              ? {
                                  value: values.cityId,
                                  label: cityList.find((ct) => ct._id === values.cityId)?.cityName,
                                }
                              : null
                          }
                          onChange={(opt) => handleChange({ target: { name: "cityId", value: opt?.value } })}
                          disabled={!values.stateId || isCitiesLoading}
                        />
                        <label
                          htmlFor="cityId"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          City <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.city && (
                          <p className="text-danger">{formErrors.city}</p>
                        )}
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="roleId"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={roleList.map((r) => ({
                            value: r._id,
                            label: r.roleName,
                          }))}
                          value={selectedRole}
                          onChange={(opt) => setSelectedRole(opt)}
                        />
                        <label
                          htmlFor="roleId"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Role <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.role && <p className="text-danger">{formErrors.role}</p>}
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col lg={3}>
                      <div className="form-floating mb-3">
                        <Select
                          inputId="branch"
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
                            placeholder: (base) => ({ ...base, marginTop: "8px" }),
                            valueContainer: (base) => ({ ...base, marginTop: "8px" }),
                          }}
                          options={branchOptions}
                          value={
                            branchOptions.find((b) => b.value === values.branch) || null
                          }
                          onChange={(opt) =>
                            setValues({ ...values, branch: opt?.value ?? "" })
                          }
                        />
                        <label
                          htmlFor="branch"
                          className="form-label"
                          style={{
                            opacity: 0.7,
                            transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                          }}
                        >
                          Branch <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.branch && (
                          <p className="text-danger">{formErrors.branch}</p>
                        )}
                      </div>
                    </Col>
                    {/* Only a super admin may create another super admin. The
                        server refuses this with a 403 regardless of the UI. */}
                    {canGrantAllBranches && (
                      <Col lg={3}>
                        <div className="d-flex align-items-center h-100 mb-3">
                          <div className="form-check">
                            <Input
                              type="checkbox"
                              id="isSuperAdmin"
                              name="isSuperAdmin"
                              onChange={handlecheck}
                              checked={values.isSuperAdmin}
                            />
                            <Label htmlFor="isSuperAdmin" className="form-check-label">
                              Super Admin (both branches)
                            </Label>
                          </div>
                        </div>
                      </Col>
                    )}
                  </Row>
                  {!updateForm && (
                    <Row>
                      <Col lg={4}>
                        <div className="form-floating mb-3">
                          <input
                            type="password"
                            id="password"
                            className="form-control"
                            required
                            name="password"
                            value={values.password}
                            onChange={handleChange}
                          />
                          <label htmlFor="password">
                            Password <span className="text-danger">*</span>
                          </label>
                          {isSubmit && formErrors.password && (
                            <p className="text-danger">{formErrors.password}</p>
                          )}
                        </div>
                      </Col>
                    </Row>
                  )}
                  <Row>
                    <Col lg={12}>
                      <div className="form-floating mb-3">
                        <textarea
                          id="address"
                          className="form-control"
                          required
                          name="address"
                          value={values.address}
                          onChange={handleChange}
                          style={{ height: "100px" }}
                        />
                        <label htmlFor="address" className="form-label">
                          Address <span className="text-danger">*</span>
                        </label>
                        {isSubmit && formErrors.address && (
                          <p className="text-danger">{formErrors.address}</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                </Row>

                {/* Password reset row for existing employees */}
                {updateForm && (
                  <Row className="mt-3">
                    <Col lg={12}>
                      <button
                        type="button"
                        className="btn btn-outline-warning mb-3"
                        onClick={toggleResetPassword}
                      >
                        {showResetPassword ? "Hide Reset Password" : "Reset Password"}
                      </button>
                      {showResetPassword && (
                        <div className="border p-3 rounded mb-3 bg-light">
                          <Row>
                            <Col lg={5}>
                              <div className="position-relative mb-3">
                                <Label htmlFor="newPassword" className="form-label">
                                  New Password <span className="text-danger">*</span>
                                </Label>
                                <div className="position-relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    id="newPassword"
                                    className="form-control"
                                    required
                                    name="newPassword"
                                    value={resetPasswordData.newPassword}
                                    onChange={handlePasswordResetChange}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                  >
                                    <i className={`ri-eye${showNewPassword ? "" : "-off"}-line align-middle`}></i>
                                  </button>
                                </div>
                              </div>
                            </Col>
                            <Col lg={5}>
                              <div className="position-relative mb-3">
                                <Label htmlFor="confirmPassword" className="form-label">
                                  Confirm Password <span className="text-danger">*</span>
                                </Label>
                                <div className="position-relative">
                                  <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    className="form-control"
                                    required
                                    name="confirmPassword"
                                    value={resetPasswordData.confirmPassword}
                                    onChange={handlePasswordResetChange}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                  >
                                    <i className={`ri-eye${showConfirmPassword ? "" : "-off"}-line align-middle`}></i>
                                  </button>
                                </div>
                              </div>
                            </Col>
                            <Col lg={2}>
                              <div className="d-flex align-items-end h-100 mb-3">
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  onClick={handleResetPassword}
                                >
                                  Reset Password
                                </button>
                              </div>
                            </Col>
                          </Row>
                          {passwordResetError && <div className="text-danger">{passwordResetError}</div>}
                        </div>
                      )}
                    </Col>
                  </Row>
                )}

                <div className="mt-4">
                  <Row>
                    <Col lg={2}>
                      <div className="form-check mb-2">
                        <Input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          value={values.isActive}
                          onChange={handlecheck}
                          checked={values.isActive}
                        />
                        <Label htmlFor="isActive" className="form-check-label">
                          Is Active
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
              </Form>
            </div>
          </CardBody>
        </Card>
      </Col>
    </CardBody>
  );

  const handleAddClick = () => {
    if (activeTab === "admin") {
      setIsEditAdmin(false);
      setAdminErrors({});
      setShowAdminPassword(false);
      setAdminValues({
        companyName: "",
        email: "",
        password: "",
      });
      setShowAdminModal(true);
    } else {
      setShowForm(true);
      setUpdateForm(false);
      setValues(initialState);
    }
  };

  // Memoized grid data filtered by search bar query
  const filteredAdmins = useMemo(() => {
    return adminsList.filter((item) => {
      const val = query.toLowerCase();
      return (
        item.companyName?.toLowerCase().includes(val) ||
        item.email?.toLowerCase().includes(val) ||
        item.website?.toLowerCase().includes(val) ||
        item.mobileNumber?.includes(val) ||
        item.gstNumber?.toLowerCase().includes(val)
      );
    });
  }, [adminsList, query]);

  // Standard employee list columns
  const columns = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => index + 1,
        sortable: true,
        sortField: "createdAt",
        maxWidth: "20px",
      },
      {
        name: "Employee Name",
        cell: EmployeeNameCell,
        maxWidth: "200px",
      },
      {
        name: "Department",
        cell: DepartmentCell,
        sortable: true,
        sortField: "departmentId",
        maxWidth: "200px",
      },
      {
        name: "Branch",
        cell: BranchCell,
        sortable: true,
        sortField: "branch",
        maxWidth: "150px",
      },
      {
        name: "Created By",
        cell: CreatedByCell,
        sortable: false,
        maxWidth: "150px",
      },
      {
        name: "Email",
        cell: EmailOfficeCell,
        sortable: true,
        sortField: "emailOffice",
        maxWidth: "250px",
      },
      {
        name: "Phone",
        selector: (row) => row.mobileNumber,
        sortable: true,
        sortField: "mobileNumber",
        maxWidth: "150px",
      },
      {
        name: "Action",
        cell: (row) => (
          <EmployeeActions
            row={row}
            currentPagePermissions={currentPagePermissions}
            handleTog_edit={handleTog_edit}
            tog_delete={tog_delete}
          />
        ),
        maxWidth: "150px",
      },
    ],
    [currentPagePermissions, activeTab]
  );

  // Client Admins columns definition
  const adminColumns = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => index + 1,
        sortable: true,
        maxWidth: "20px",
      },
      {
        name: "Company Name",
        cell: (row) => (
          <div className="d-flex align-items-center gap-2">
            {row.logo && (
              <img
                src={`${config.api.API_URL}/${row.logo.replace(/^\/+/, "")}`}
                alt="logo"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            )}
            <span className="fw-medium text-dark">{row.companyName}</span>
          </div>
        ),
        sortable: true,
        maxWidth: "250px",
      },
      {
        name: "Website",
        cell: (row) => (
          <a href={`http://${row.website}`} target="_blank" rel="noreferrer" className="text-primary">
            {row.website}
          </a>
        ),
        sortable: true,
        maxWidth: "200px",
      },
      {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        maxWidth: "250px",
      },
      {
        name: "Phone",
        selector: (row) => row.mobileNumber,
        sortable: true,
        maxWidth: "150px",
      },
      {
        name: "GST Number",
        cell: (row) => <span className="badge bg-light text-dark border">{row.gstNumber}</span>,
        sortable: true,
        maxWidth: "150px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success edit-item-btn" onClick={() => handleTog_edit(row._id)}>
              Edit
            </button>
            <button className="btn btn-sm btn-danger remove-item-btn" onClick={() => tog_delete(row._id)}>
              Remove
            </button>
          </div>
        ),
        maxWidth: "150px",
      },
    ],
    [activeTab]
  );

  document.title = `${activeTab === "admin" ? "Admin" : "Employee"} | ${adminData.companyName}`;

  return (
    <React.Fragment>
      <style>
        {`
          .custom-tab-btn {
              background-color: #ffffff !important;
              color: var(--vz-success, #0ab39c) !important;
              border: 1px solid var(--vz-success, #0ab39c) !important;
              transition: all 0.2s ease-in-out;
          }
          .custom-tab-btn:hover {
              background-color: var(--vz-success, #0ab39c) !important;
              color: #ffffff !important;
          }
          .custom-tab-btn-active {
              background-color: var(--vz-success, #0ab39c) !important;
              color: #ffffff !important;
              border: 1px solid var(--vz-success, #0ab39c) !important;
          }
        `}
      </style>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title={activeTab === "admin" ? "Admin" : "Employee"} pageTitle="Setup" />

          {/* Core Tab Header Selection (For Super Admin ONLY when grid is visible) */}
          {adminData?.isSuperAdmin === true && !(showForm || updateForm) && (
            <div className="mb-3 d-flex gap-2">
              <button
                className={`btn py-2 px-4 fw-semibold shadow-sm ${activeTab === "employee" ? "custom-tab-btn-active" : "custom-tab-btn"}`}
                onClick={() => {
                  setActiveTab("employee");
                  setQuery("");
                }}
              >
                <i className="ri-group-line align-middle me-1"></i> Employees
              </button>
              <button
                className={`btn py-2 px-4 fw-semibold shadow-sm ${activeTab === "admin" ? "custom-tab-btn-active" : "custom-tab-btn"}`}
                onClick={() => {
                  setActiveTab("admin");
                  setQuery("");
                  fetchAdminsList();
                }}
              >
                <i className="ri-shield-user-line align-middle me-1"></i> Admins
              </button>
            </div>
          )}

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName={activeTab === "admin" ? "Admin" : "Employee"}
                    filter={filter}
                    handleFilter={handleFilter}
                    tog_list={() => handleList()}
                    setQuery={setQuery}
                    initialState={initialState}
                    setValues={setValues}
                    updateForm={updateForm}
                    showForm={showForm}
                    setShowForm={setShowForm}
                    setUpdateForm={setUpdateForm}
                    showAddButton={currentPagePermissions.write}
                    openAddForm={handleAddClick}
                  />
                </CardHeader>

                {showForm || updateForm ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1 text-right">
                      {activeTab === "admin" ? (
                        <DataTable
                          columns={adminColumns}
                          data={filteredAdmins}
                          progressPending={loading}
                          pagination
                          paginationTotalRows={filteredAdmins.length}
                          paginationPerPage={50}
                        />
                      ) : (
                        <DataTable
                          columns={columns}
                          data={data}
                          progressPending={loading}
                          sortServer
                          onSort={(col, dir) => handleSort(col, dir)}
                          pagination
                          paginationServer
                          paginationTotalRows={totalRows}
                          paginationPerPage={100}
                          paginationRowsPerPageOptions={[50, 100, 200, 300, totalRows]}
                          onChangeRowsPerPage={handlePerRowsChange}
                          onChangePage={handlePageChange}
                        />
                      )}
                    </div>
                  </CardBody>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Delete Confirmation Warning Modal */}
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={handleDeleteClose}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />

      {/* Admin Onboarding Quick Modal Popup */}
      <Modal isOpen={showAdminModal} toggle={toggleAdminModal} centered>
        <ModalHeader toggle={toggleAdminModal} className="bg-light">
          <i className="ri-shield-user-line text-primary me-2 align-middle fs-18"></i>
          {isEditAdmin ? "Edit Client Admin" : "Onboard New Client Admin"}
        </ModalHeader>
        <Form onSubmit={handleAdminSubmit}>
          <ModalBody className="p-4">
            <Row className="gy-4">
              <Col lg={12}>
                <div className="form-group">
                  <Label htmlFor="companyName" className="form-label fw-medium">Company Name <span className="text-danger">*</span></Label>
                  <Input
                    type="text"
                    id="companyName"
                    name="companyName"
                    className="form-control"
                    placeholder="Enter client company name"
                    value={adminValues.companyName}
                    onChange={handleAdminInputChange}
                    invalid={!!adminErrors.companyName}
                  />
                  {adminErrors.companyName && <div className="invalid-feedback">{adminErrors.companyName}</div>}
                </div>
              </Col>
              <Col lg={12}>
                <div className="form-group">
                  <Label htmlFor="email" className="form-label fw-medium">Admin Email Address <span className="text-danger">*</span></Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    placeholder="e.g. admin@company.com"
                    value={adminValues.email}
                    onChange={handleAdminInputChange}
                    invalid={!!adminErrors.email}
                  />
                  {adminErrors.email && <div className="invalid-feedback">{adminErrors.email}</div>}
                </div>
              </Col>
              <Col lg={12}>
                <div className="form-group">
                  <Label htmlFor="password" className="form-label fw-medium">
                    Account Password {isEditAdmin ? <span className="text-muted fw-normal">(Leave blank to keep same)</span> : <span className="text-danger">*</span>}
                  </Label>
                  <div className="position-relative">
                    <Input
                      type={showAdminPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="form-control pe-5"
                      placeholder={isEditAdmin ? "Set new password (optional)" : "Set initial password"}
                      value={adminValues.password}
                      onChange={handleAdminInputChange}
                      invalid={!!adminErrors.password}
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      tabIndex={-1}
                      style={{ height: "100%", display: "flex", alignItems: "center" }}
                    >
                      <i className={`ri-eye${showAdminPassword ? "" : "-off"}-line align-middle fs-16`}></i>
                    </button>
                  </div>
                  {adminErrors.password && <div className="text-danger mt-1 fs-12">{adminErrors.password}</div>}
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter className="bg-light">
            <button type="button" className="btn btn-light" onClick={toggleAdminModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={isAdminSubmitting}>
              {isAdminSubmitting ? (
                <>
                  <Spinner size="sm" color="light" className="me-1" /> Onboarding...
                </>
              ) : isEditAdmin ? (
                "Save Changes"
              ) : (
                "Onboard Account"
              )}
            </button>
          </ModalFooter>
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default Employee;

const EmployeeNameCell = (props) => {
  const row = props.row || props;
  return <p className="text-wrap">{row.employeeName}</p>;
};

EmployeeNameCell.propTypes = {
  row: PropTypes.object,
};

const DepartmentCell = (props) => {
  const row = props.row || props;
  return <p className="text-wrap">{row.department?.departmentName || ""}</p>;
};

DepartmentCell.propTypes = {
  row: PropTypes.object,
};

const BranchCell = (props) => {
  const row = props.row || props;
  if (row.isSuperAdmin || !row.branch) {
    return <span className="badge bg-primary-subtle text-primary">All Branches</span>;
  }
  return <span className="badge bg-light text-dark border">{row.branch}</span>;
};

BranchCell.propTypes = {
  row: PropTypes.object,
};

const CreatedByCell = (props) => {
  const row = props.row || props;
  return <p className="text-wrap">{row.createdByEmployee?.employeeName || "Admin"}</p>;
};

CreatedByCell.propTypes = {
  row: PropTypes.object,
};

const EmailOfficeCell = (props) => {
  const row = props.row || props;
  return <p className="text-wrap">{row.emailOffice}</p>;
};

EmailOfficeCell.propTypes = {
  row: PropTypes.object,
};

const EmployeeActions = ({ row, currentPagePermissions, handleTog_edit, tog_delete }) => (
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

EmployeeActions.propTypes = {
  row: PropTypes.object.isRequired,
  currentPagePermissions: PropTypes.object.isRequired,
  handleTog_edit: PropTypes.func.isRequired,
  tog_delete: PropTypes.func.isRequired,
};

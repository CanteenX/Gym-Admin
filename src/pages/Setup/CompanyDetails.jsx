/* eslint-disable default-case */
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Row,
  Label,
  Spinner
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../../api/locations.api";
import { updateCompany } from "../../api/companies.api";
import config from "../../config";
import { fileUrl } from "@/utils/fileUrl";

const getInitialState = (adminData) => {
  if (!adminData) {
    return {
      companyName: "",
      email: "",
      mobileNumber: "",
      gstNumber: "",
      countryId: "",
      stateId: "",
      cityId: "",
      address: "",
      pincode: "",
      logo: "",
      favicon: "",
      loginBanner: "",
      website: "",
    };
  }
  return {
    companyName: adminData.companyName || "",
    email: adminData.email || "",
    mobileNumber: adminData.mobileNumber || "",
    gstNumber: adminData.gstNumber || "",
    countryId: adminData.countryId && typeof adminData.countryId === 'object' ? adminData.countryId._id : adminData.countryId || "",
    stateId: adminData.stateId && typeof adminData.stateId === 'object' ? adminData.stateId._id : adminData.stateId || "",
    cityId: adminData.cityId && typeof adminData.cityId === 'object' ? adminData.cityId._id : adminData.cityId || "",
    address: adminData.address || "",
    pincode: adminData.pincode || "",
    logo: adminData.logo || "",
    favicon: adminData.favicon || "",
    loginBanner: adminData.loginBanner || "",
    website: adminData.website || "",
  };
};

// Validate every field and specific validations for mobile and pincode
const validate = (values) => {
  let errors = {};
  if (!values.companyName.trim()) {
    errors.companyName = "Company name is required";
  }
  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors.email = "Invalid email address";
  }
  if (!values.mobileNumber.trim()) {
    errors.mobileNumber = "Mobile number is required";
  } else if (values.mobileNumber.length !== 10) {
    errors.mobileNumber = "Mobile number must be 10 digits";
  }
  if (!values.gstNumber.trim()) {
    errors.gstNumber = "GST number is required";
  }
  if (!values.countryId) {
    errors.countryId = "Country is required";
  }
  if (!values.stateId) {
    errors.stateId = "State is required";
  }
  if (!values.cityId) {
    errors.cityId = "City is required";
  }
  if (!values.address.trim()) {
    errors.address = "Address is required";
  }
  if (!values.pincode.trim()) {
    errors.pincode = "Pincode is required";
  } else if (values.pincode.length !== 6) {
    errors.pincode = "Pincode must be 6 digits";
  }
  if (!values.website.trim()) {
    errors.website = "Website is required";
  }
  return errors;
};


const CompanyDetails = () => {
  const { adminData, getAdmin } = useContext(AuthContext);

  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const imageRef = useRef(null);

  const [values, setValues] = useState(() => getInitialState(adminData));
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [showFileInput, setShowFileInput] = useState(true);

  // favicon file upload states
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState("");
  const [showFaviconInput, setShowFaviconInput] = useState(true);
  const faviconRef = useRef(null);

  // login banner file upload states
  const [loginBannerFile, setLoginBannerFile] = useState(null);
  const [loginBannerPreview, setLoginBannerPreview] = useState("");
  const [showLoginBannerInput, setShowLoginBannerInput] = useState(true);
  const loginBannerRef = useRef(null);

  const getStatePlaceholder = () => {
    if (!values.countryId) return "Select Country First";
    if (isStatesLoading) return "Loading states...";
    return "Select State";
  };

  const getCityPlaceholder = () => {
    if (!values.stateId) return "Select State First";
    if (isCitiesLoading) return "Loading cities...";
    return "Select City";
  };

  // Fetch countries on component mount
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

  // Fetch states by country
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

  // Fetch cities by state
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

  // Load initial data for existing records
  useEffect(() => {
    const loadInitialData = async () => {
      if (adminData?.countryId) {
        const countryId = adminData.countryId._id || adminData.countryId;
        await fetchStatesByCountry(countryId);

        if (adminData.stateId) {
          const stateId = adminData.stateId._id || adminData.stateId;
          await fetchCitiesByState(stateId);
        }
      }
    };

    // Only load if we have fetched countries first
    if (countryList.length > 0) {
      loadInitialData();
    }
  }, [adminData, countryList, fetchStatesByCountry, fetchCitiesByState]);

  useEffect(() => {
    if (adminData) {
      // Update values when adminData changes
      setValues(getInitialState(adminData));

      fetchCountries();
    }
  }, [adminData, fetchCountries]);

  useEffect(() => {
    if (adminData?.logo) {
      setLogoPreview(adminData.logo);
      setShowFileInput(false); // Hide file input when logo exists
    }
  }, [adminData?.logo]);

  useEffect(() => {
    if (adminData?.favicon) {
      setFaviconPreview(adminData.favicon);
      setShowFaviconInput(false); // Hide file input when favicon exists
    }
  }, [adminData?.favicon]);

  useEffect(() => {
    if (adminData?.loginBanner) {
      setLoginBannerPreview(adminData.loginBanner);
      setShowLoginBannerInput(false); // Hide file input when loginBanner exists
    }
  }, [adminData?.loginBanner]);


  const hasChanges = () => {
    const currentValues = { ...values };
    const originalValues = { ...adminData };
    return JSON.stringify(currentValues) !== JSON.stringify(originalValues) || selectedFile !== null || faviconFile !== null || loginBannerFile !== null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setShowFileInput(false); // Hide file input after selection
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should not exceed 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for logo");
        return;
      }
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setShowFileInput(false);
    }
  };

  const handleFaviconDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File size should not exceed 1MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for favicon");
        return;
      }
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
      setShowFaviconInput(false);
    }
  };

  const handleLoginBannerDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Only image files up to 2MB are allowed");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for login banner");
        return;
      }
      setLoginBannerFile(file);
      setLoginBannerPreview(URL.createObjectURL(file));
      setShowLoginBannerInput(false);
    }
  };

  // favicon file handling functions
  const handleFaviconChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Check file size (1MB = 1 * 1024 * 1024 bytes)
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File size should not exceed 1MB");
        e.target.value = "";
        return;
      }

      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        toast.error("Only image files are allowed for favicon");
        e.target.value = "";
        return;
      }

      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
      setShowFaviconInput(false); // Hide file input after selection
    }
  };

  const resetFaviconStates = () => {
    setFaviconFile(null);
    setFaviconPreview("");
    setShowFaviconInput(true);
    if (faviconRef.current) {
      faviconRef.current.value = ""; // Clears the file input
    }
  };

  const handleRemoveFavicon = () => {
    setFaviconPreview("");
    setFaviconFile(null);
    setValues({ ...values, favicon: "" });
    setShowFaviconInput(true); // Show file input when favicon is removed
    if (faviconRef.current) {
      faviconRef.current.value = ""; // Clears the file input
    }
  };

  // login banner file handling functions
  const handleLoginBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Only image files up to 2MB are allowed");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for login banner");
        return;
      }
      setLoginBannerFile(file);
      setLoginBannerPreview(URL.createObjectURL(file));
      setShowLoginBannerInput(false); // Hide file input after selection
    }
  };

  const resetLoginBannerStates = () => {
    setLoginBannerFile(null);
    setLoginBannerPreview("");
    setShowLoginBannerInput(true);
    if (loginBannerRef.current) {
      loginBannerRef.current.value = ""; // Clears the file input
    }
  };

  const handleRemoveLoginBanner = () => {
    setLoginBannerPreview("");
    setLoginBannerFile(null);
    setValues({ ...values, loginBanner: "" });
    setShowLoginBannerInput(true); // Show file input when banner is removed
    if (loginBannerRef.current) {
      loginBannerRef.current.value = ""; // Clears the file input
    }
  };

  useEffect(() => {
    if (!selectedFile && values.logo) {
      setLogoPreview(values.logo);
      setShowFileInput(false);
    }
  }, [values.logo, selectedFile]);

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length !== 0) {
      return;
    }
    const formData = new FormData();
    for (let key in values) {
      if (key === "countryId" || key === "stateId" || key === "cityId") {
        // If it's an object with _id, use the _id, otherwise use the value directly
        const idValue = values[key] && typeof values[key] === 'object' ? values[key]._id : values[key];
        formData.append(key, idValue);
      } else {
        formData.append(key, values[key]);
      }
    }
    if (selectedFile) {
      formData.append("logo", selectedFile);
    }
    if (faviconFile) {
      formData.append("favicon", faviconFile);
    }
    if (loginBannerFile) {
      formData.append("loginBanner", loginBannerFile);
    }
    setIsSubmitting(true);
    updateCompany(adminData._id, formData)
      .then((response) => {
        if (response.data.isOk) {
          toast.success("Company details updated successfully");
          getAdmin();
          // Reset file states after successful update
          setSelectedFile(null);
          resetFaviconStates();
          resetLoginBannerStates();
        } else {
          toast.error(response.data.message);
        }
      })
      .catch((error) => {
        console.error("Error updating company details:", error);
        toast.error("Failed to update company details");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // Allow only numeric input for mobileNumber and pincode
  const handleChange = async (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "mobileNumber" || name === "pincode") {
      newValue = value.replace(/\D/g, "");
      setValues({ ...values, [name]: newValue });
    } else if (name === "countryId") {
      // Handle country selection
      const selectedCountry = countryList.find(country => country._id === value);
      if (selectedCountry) {
        setValues({
          ...values,
          countryId: value,
          stateId: "",
          cityId: ""
        });
        // Fetch states for selected country
        await fetchStatesByCountry(value);
      }
    } else if (name === "stateId") {
      // Handle state selection
      setValues({
        ...values,
        stateId: value,
        cityId: ""
      });
      // Fetch cities for selected state
      await fetchCitiesByState(value);
    } else if (name === "cityId") {
      // Handle city selection
      setValues({ ...values, cityId: value });
    } else {
      setValues({ ...values, [name]: newValue });
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    setSelectedFile(null);
    setValues({ ...values, logo: "" });
    setShowFileInput(true); // Show file input when logo is removed
    if (imageRef.current) {
      imageRef.current.value = ""; // Clears the file input
    }
  };

  // Helper to resolve preview URLs - handles both blob URLs and server paths
  const resolvePreviewUrl = (preview) => {
    if (!preview) return "";
    // blob: URLs are from local file selection, return as-is
    if (preview.startsWith("blob:") || preview.startsWith("http")) return preview;
    // Server paths need the API URL prefix
    return fileUrl(preview);
  };

  document.title = `Company Details | Shree Balaji Trade-Wing`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Setup" title="Company Details" pageTitle="Setup" />
        
        {/* Style tag containing scoped premium overrides */}
        <style>
          {`
            .premium-profile-avatar-container {
              width: 110px;
              height: 110px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              font-size: 38px;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 15px auto;
              box-shadow: 0 4px 15px rgba(29, 78, 216, 0.2);
              border: 3px solid #ffffff;
            }
            .premium-profile-avatar-img {
              width: 110px;
              height: 110px;
              border-radius: 50%;
              object-fit: contain;
              background-color: #f8fafc;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 15px rgba(0,0,0,0.06);
              margin: 0 auto 15px auto;
              display: block;
            }
            .premium-upload-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              transition: all 0.3s ease;
              background-color: #ffffff;
              overflow: hidden;
            }
            .premium-upload-card:hover {
              box-shadow: 0 8px 24px rgba(148, 163, 184, 0.12);
              border-color: #cbd5e1;
            }
            .premium-upload-dropzone {
              border: 2px dashed #cbd5e1;
              border-radius: 8px;
              padding: 24px 16px;
              text-align: center;
              background-color: #f8fafc;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .premium-upload-dropzone:hover {
              border-color: #3b82f6;
              background-color: #eff6ff;
            }
            .premium-preview-wrapper {
              position: relative;
              display: inline-block;
              border-radius: 8px;
              padding: 6px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
            }
            .premium-delete-badge {
              position: absolute;
              top: -8px;
              right: -8px;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background-color: #ef4444;
              color: #ffffff;
              border: none;
              font-size: 14px;
              line-height: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
              transition: all 0.2s ease;
            }
            .premium-delete-badge:hover {
              background-color: #dc2626;
              transform: scale(1.1);
            }
            .form-section-card {
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
              padding: 24px;
              margin-bottom: 24px;
            }
            .form-section-header {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              border-left: 3px solid #3b82f6;
              padding-left: 10px;
            }
            .btn-save-changes {
              padding: 12px 28px;
              font-size: 15px;
              font-weight: 600;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
              transition: all 0.2s ease;
            }
            .btn-save-changes:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
            }
            @media (max-width: 575.98px) {
              .btn-save-changes {
                width: 100%;
              }
            }
          `}
        </style>

        <Row>
          {/* Left Column: Profile Summary & Brand Assets */}
          <Col lg={4} xl={3} className="d-flex flex-column">
            {/* Profile Summary Card */}
            <Card className="profile-card text-center p-4 mb-4">
              <CardBody className="p-0">
                {logoPreview ? (
                  <img
                    src={resolvePreviewUrl(logoPreview)}
                    alt="Company Logo"
                    className="premium-profile-avatar-img"
                  />
                ) : (
                  <div className="premium-profile-avatar-container">
                    {values.companyName ? values.companyName.charAt(0).toUpperCase() : "C"}
                  </div>
                )}
                
                <h4 className="fw-semibold mb-3 text-dark text-truncate">
                  {values.companyName || "Company Name"}
                </h4>

                <div className="text-muted text-start border-top pt-3 mt-3 fs-13">
                  {values.email && (
                    <div className="d-flex align-items-center mb-2">
                      <i className="ri-mail-line me-2 text-primary fs-15"></i>
                      <span className="text-truncate">{values.email}</span>
                    </div>
                  )}
                  {values.website && (
                    <div className="d-flex align-items-center">
                      <i className="ri-global-line me-2 text-primary fs-15"></i>
                      <a
                        href={values.website.startsWith("http") ? values.website : `https://${values.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-truncate text-primary text-decoration-none"
                      >
                        {values.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Branding Assets Card */}
            <Card className="premium-upload-card mb-4 flex-grow-1">
              <CardBody className="p-3 d-flex flex-column">
                <span className="fw-semibold d-block text-dark mb-3 fs-14 border-bottom pb-2">
                  <i className="ri-image-edit-line me-1 text-primary align-middle"></i>
                  Branding Assets
                </span>

                <div className="flex-grow-1 d-flex flex-column justify-content-around">
                  {/* Logo Slot */}
                  <div className="mb-3">
                    <span className="fw-medium d-block text-muted mb-2 fs-12">Company Logo</span>
                    
                    {logoPreview ? (
                      <div className="text-center">
                        <div className="premium-preview-wrapper">
                          <img
                            src={resolvePreviewUrl(logoPreview)}
                            alt="Logo Preview"
                            style={{ width: "90px", height: "90px", objectFit: "contain" }}
                          />
                          <button
                            type="button"
                            className="premium-delete-badge"
                            onClick={handleRemoveLogo}
                            title="Remove Logo"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="premium-upload-dropzone" 
                        onClick={() => imageRef.current && imageRef.current.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleLogoDrop}
                        style={{ padding: "16px 10px" }}
                      >
                        <i className="ri-image-add-line text-muted fs-20 mb-1 d-block"></i>
                        <span className="fs-11 fw-medium text-dark d-block">Upload Logo</span>
                      </div>
                    )}
                    
                    <input
                      id="logo"
                      type="file"
                      name="logo"
                      accept=".jpg, .jpeg, .png"
                      onChange={handleFileChange}
                      ref={imageRef}
                      style={{ display: "none" }}
                    />
                    {isSubmit && formErrors.logo && (
                      <p className="text-danger fs-11 mt-1 text-center mb-0">{formErrors.logo}</p>
                    )}
                  </div>

                  {/* Favicon & Login Banner side-by-side */}
                  <Row className="g-2">
                    {/* Favicon Slot */}
                    <Col xs={6}>
                      <span className="fw-medium d-block text-muted mb-2 fs-12" title="Max 1MB">Favicon</span>

                      {faviconPreview ? (
                        <div className="text-center">
                          <div className="premium-preview-wrapper">
                            <img
                              src={resolvePreviewUrl(faviconPreview)}
                              alt="Favicon Preview"
                              style={{ width: "32px", height: "32px", objectFit: "contain" }}
                            />
                            <button
                              type="button"
                              className="premium-delete-badge"
                              onClick={handleRemoveFavicon}
                              title="Remove Favicon"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="premium-upload-dropzone" 
                          onClick={() => faviconRef.current && faviconRef.current.click()}
                          onDragOver={handleDragOver}
                          onDrop={handleFaviconDrop}
                          style={{ padding: "16px 8px", minHeight: "100px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}
                        >
                          <i className="ri-global-line text-muted fs-20 mb-1 d-block"></i>
                          <span className="fs-10 fw-medium text-dark d-block">Upload Favicon</span>
                          <span className="fs-9 text-muted">Max 1MB</span>
                        </div>
                      )}

                      <input
                        id="favicon"
                        type="file"
                        name="favicon"
                        accept=".jpg, .jpeg, .png, .ico"
                        onChange={handleFaviconChange}
                        ref={faviconRef}
                        style={{ display: "none" }}
                      />
                    </Col>

                    {/* Login Banner Slot */}
                    <Col xs={6}>
                      <span className="fw-medium d-block text-muted mb-2 fs-12" title="Max 2MB">Login Banner</span>

                      {loginBannerPreview ? (
                        <div className="text-center">
                          <div className="premium-preview-wrapper" style={{ width: "100%", maxWidth: "120px" }}>
                            <img
                              src={resolvePreviewUrl(loginBannerPreview)}
                              alt="Login Banner Preview"
                              style={{ width: "100%", height: "32px", objectFit: "contain" }}
                            />
                            <button
                              type="button"
                              className="premium-delete-badge"
                              onClick={handleRemoveLoginBanner}
                              title="Remove Login Banner"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="premium-upload-dropzone" 
                          onClick={() => loginBannerRef.current && loginBannerRef.current.click()}
                          onDragOver={handleDragOver}
                          onDrop={handleLoginBannerDrop}
                          style={{ padding: "16px 8px", minHeight: "100px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}
                        >
                          <i className="ri-layout-grid-line text-muted fs-20 mb-1 d-block"></i>
                          <span className="fs-10 fw-medium text-dark d-block">Upload Banner</span>
                          <span className="fs-9 text-muted">Max 2MB</span>
                        </div>
                      )}

                      <input
                        id="loginBanner"
                        type="file"
                        name="loginBanner"
                        accept=".jpg, .jpeg, .png, .gif, .webp"
                        onChange={handleLoginBannerChange}
                        ref={loginBannerRef}
                        style={{ display: "none" }}
                      />
                    </Col>
                  </Row>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Right Column: Grouped Form Details */}
          <Col lg={8} xl={9}>
            <Form onSubmit={handleUpdate}>
              {/* Section 1: Company Information */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <i className="ri-building-line me-2 text-primary fs-17"></i>
                  Company Information
                </div>
                <Row>
                  <Col md={6} lg={4}>
                    <div className="form-floating mb-3">
                      <Input
                        id="companyName"
                        type="text"
                        className="form-control"
                        placeholder="Enter Company name"
                        required
                        name="companyName"
                        value={values.companyName}
                        onChange={handleChange}
                      />
                      <Label htmlFor="companyName">Company name <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.companyName && (
                        <p className="text-danger fs-12 mt-1">{formErrors.companyName}</p>
                      )}
                    </div>
                  </Col>
                  <Col md={6} lg={4}>
                    <div className="form-floating mb-3">
                      <Input
                        id="website"
                        type="text"
                        className="form-control"
                        placeholder="Website"
                        required
                        name="website"
                        value={values.website}
                        onChange={handleChange}
                        maxLength={100}
                      />
                      <Label htmlFor="website">Website <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.website && (
                        <p className="text-danger fs-12 mt-1">{formErrors.website}</p>
                      )}
                    </div>
                  </Col>
                  <Col md={6} lg={4}>
                    <div className="form-floating mb-3">
                      <Input
                        id="gstNumber"
                        type="text"
                        className="form-control"
                        placeholder="Enter GST Number"
                        required
                        name="gstNumber"
                        value={values.gstNumber}
                        onChange={handleChange}
                      />
                      <Label htmlFor="gstNumber">GST Number <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.gstNumber && (
                        <p className="text-danger fs-12 mt-1">{formErrors.gstNumber}</p>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Section 2: Contact Details */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <i className="ri-contacts-book-line me-2 text-primary fs-17"></i>
                  Contact Details
                </div>
                <Row>
                  <Col md={6}>
                    <div className="form-floating mb-3">
                      <Input
                        id="companyEmail"
                        type="text"
                        className="form-control"
                        placeholder="Enter Email"
                        required
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                      />
                      <Label htmlFor="companyEmail">Email <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.email && (
                        <p className="text-danger fs-12 mt-1">{formErrors.email}</p>
                      )}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="form-floating mb-3">
                      <Input
                        id="mobileNumber"
                        type="text"
                        className="form-control"
                        placeholder="Mobile Number"
                        required
                        name="mobileNumber"
                        value={values.mobileNumber}
                        onChange={handleChange}
                        maxLength={10}
                      />
                      <Label htmlFor="mobileNumber">Mobile Number <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.mobileNumber && (
                        <p className="text-danger fs-12 mt-1">{formErrors.mobileNumber}</p>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Section 3: Location Details */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <i className="ri-map-pin-line me-2 text-primary fs-17"></i>
                  Location Details
                </div>
                <Row>
                  <Col sm={6} md={3}>
                    <div className="form-floating mb-3">
                      <Input
                        id="countrySelect"
                        type="select"
                        className="form-control"
                        name="countryId"
                        value={values.countryId}
                        onChange={handleChange}
                        disabled={isLoading}
                      >
                        <option value="">
                          {isLoading ? "Loading countries..." : "Select Country"}
                        </option>
                        {countryList.map((country) => (
                          <option key={country._id} value={country._id}>
                            {country.countryName}
                          </option>
                        ))}
                      </Input>
                      <Label htmlFor="countrySelect">Country <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.countryId && (
                        <p className="text-danger fs-12 mt-1">{formErrors.countryId}</p>
                      )}
                    </div>
                  </Col>
                  <Col sm={6} md={3}>
                    <div className="form-floating mb-3">
                      <Input
                        id="stateSelect"
                        type="select"
                        className="form-control"
                        name="stateId"
                        value={values.stateId}
                        onChange={handleChange}
                        disabled={!values.countryId || isStatesLoading}
                      >
                        <option value="">
                          {getStatePlaceholder()}
                        </option>
                        {stateList.map((state) => (
                          <option key={state._id} value={state._id}>
                            {state.stateName}
                          </option>
                        ))}
                      </Input>
                      <Label htmlFor="stateSelect">State <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.stateId && (
                        <p className="text-danger fs-12 mt-1">{formErrors.stateId}</p>
                      )}
                    </div>
                  </Col>
                  <Col sm={6} md={3}>
                    <div className="form-floating mb-3">
                      <Input
                        id="citySelect"
                        type="select"
                        className="form-control"
                        name="cityId"
                        value={values.cityId}
                        onChange={handleChange}
                        disabled={!values.stateId || isCitiesLoading}
                      >
                        <option value="">
                          {getCityPlaceholder()}
                        </option>
                        {cityList.map((city) => (
                          <option key={city._id} value={city._id}>
                            {city.cityName}
                          </option>
                        ))}
                      </Input>
                      <Label htmlFor="citySelect">City <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.cityId && (
                        <p className="text-danger fs-12 mt-1">{formErrors.cityId}</p>
                      )}
                    </div>
                  </Col>
                  <Col sm={6} md={3}>
                    <div className="form-floating mb-3">
                      <Input
                        id="pincode"
                        type="text"
                        className="form-control"
                        placeholder="Enter Pincode"
                        required
                        name="pincode"
                        value={values.pincode}
                        onChange={handleChange}
                        maxLength={6}
                      />
                      <Label htmlFor="pincode">Pincode <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.pincode && (
                        <p className="text-danger fs-12 mt-1">{formErrors.pincode}</p>
                      )}
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div className="form-floating mb-3">
                      <Input
                        id="address"
                        type="textarea"
                        className="form-control"
                        placeholder="Enter Address"
                        required
                        name="address"
                        style={{ height: "100px" }}
                        value={values.address}
                        onChange={handleChange}
                      />
                      <Label htmlFor="address">Address <span className="text-danger">*</span></Label>
                      {isSubmit && formErrors.address && (
                        <p className="text-danger fs-12 mt-1">{formErrors.address}</p>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Submit Buttons */}
              <div className="text-end mb-4">
                <button
                  type="submit"
                  className="btn btn-success btn-save-changes"
                  disabled={!hasChanges() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-3-line align-middle me-1"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CompanyDetails;

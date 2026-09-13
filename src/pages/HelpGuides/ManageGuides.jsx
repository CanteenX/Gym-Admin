import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import DataTable from "@/Components/Common/DataTableBase";
import JoditEditor from "jodit-react";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import config from "../../config";
import { fileUrl } from "@/utils/fileUrl";
import {
  createGuide,
  updateGuide,
  deleteGuide,
  searchGuides,
} from "../../api/guides.api";

const initialState = {
  title: "",
  type: "YouTube",
  description: "",
  youtubeUrl: "",
  sequence: 0,
  isActive: true,
};

const ManageGuides = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || { read: true, write: true, edit: true, delete: true };

  const [values, setValues] = useState(initialState);
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFilePath, setExistingFilePath] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // View toggle
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

  // Custom filter state
  const [filterType, setFilterType] = useState("");

  const [modal_delete, setmodal_delete] = useState(false);
  const [modal_preview, setmodal_preview] = useState(false);
  const [previewGuide, setPreviewGuide] = useState(null);

  const handleOpenPreview = (row) => {
    setPreviewGuide(row);
    setmodal_preview(true);
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : "";
  };

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Write description or steps for the guide here...",
      height: 300,
      toolbarSticky: false,
      showXPathInStatusbar: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "eraser",
        "|",
        "ul",
        "ol",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "superscript",
        "subscript",
        "|",
        "image",
        "file",
        "video",
        "\n",
        "selectall",
        "speechRecognize",
        "|",
        "cut",
        "copy",
        "paste",
        "copyformat",
        "|",
        "table",
        "hr",
        "link",
        "symbol",
        "pagebreak",
        "emoji",
        "|",
        "align",
        "outdent",
        "indent",
        "|",
        "undo",
        "redo",
        "|",
        "find",
        "source",
        "fullsize",
        "preview",
        "print",
        "about",
      ],
    }),
    []
  );

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setSelectedFile(null);
    setExistingFilePath("");
    setIsSubmit(false);
    setFormErrors({});
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues(initialState);
    setSelectedFile(null);
    setExistingFilePath("");
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
    setSelectedFile(null);
    setExistingFilePath(row.filePath || "");
    setValues({
      title: row.title || "",
      type: row.type || "YouTube",
      description: row.description || "",
      youtubeUrl: row.youtubeUrl || "",
      sequence: row.sequence || 0,
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
      // Clear URL or file selection if type changes
      ...(name === "type" ? { youtubeUrl: "" } : {}),
    }));
    if (name === "type") {
      setSelectedFile(null);
      setExistingFilePath("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const validate = (val) => {
    const errors = {};
    if (!val.title.trim()) {
      errors.title = "Title is required!";
    }
    if (!val.type) {
      errors.type = "Type is required!";
    }
    if (val.type === "YouTube" && !val.youtubeUrl.trim()) {
      errors.youtubeUrl = "YouTube URL is required!";
    }
    if (val.type !== "YouTube" && !existingFilePath && !selectedFile) {
      errors.file = "File upload is required!";
    }
    return errors;
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("type", values.type);
    formData.append("description", values.description);
    formData.append("sequence", values.sequence);
    formData.append("isActive", values.isActive);

    if (values.type === "YouTube") {
      formData.append("youtubeUrl", values.youtubeUrl);
    } else if (selectedFile) {
      formData.append("file", selectedFile);
    }
    return formData;
  };

  const handleClick = (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsSubmitLoading(true);
      const formData = buildFormData();
      createGuide(formData)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Guide Added Successfully!");
            setShowForm(false);
            setValues(initialState);
            setSelectedFile(null);
            fetchGuides();
          } else {
            toast.error(res.data.message || "Failed to add Guide");
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to add Guide");
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
      const formData = buildFormData();
      updateGuide(selectedId, formData)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("Guide Updated Successfully!");
            setUpdateForm(false);
            setSelectedFile(null);
            fetchGuides();
          } else {
            toast.error(res.data.message || "Failed to update Guide");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to update Guide");
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
      const res = await deleteGuide(removeId);
      if (res.data.isOk) {
        toast.success("Guide Deleted Successfully");
        fetchGuides();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Failed to delete Guide");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const fetchGuides = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchGuides({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
        type: filterType || undefined,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setGuides(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setGuides([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [pageNo, perPage, column, sortDirection, query, filter, filterType]);

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "sequence");
    setsortDirection(direction);
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case "YouTube":
        return <i className="ri-youtube-fill text-danger fs-18 align-middle"></i>;
      case "System Video":
        return <i className="ri-video-chat-fill text-primary fs-18 align-middle"></i>;
      case "Document":
        return <i className="ri-file-pdf-fill text-info fs-18 align-middle"></i>;
      default:
        return <i className="ri-file-line align-middle"></i>;
    }
  };

  const col = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
      {
        name: "Title",
        selector: (row) => row.title,
        sortable: true,
        sortField: "title",
        minWidth: "200px",
      },
      {
        name: "Type",
        cell: (row) => (
          <div className="d-flex align-items-center gap-2">
            {getMediaIcon(row.type)}
            <span>{row.type}</span>
          </div>
        ),
        sortable: true,
        sortField: "type",
        width: "150px",
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
            {permissions.read && (
              row.type === "YouTube" ? (
                <a
                  href={row.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-info edit-item-btn d-inline-flex align-items-center gap-1"
                  style={{ height: "28px", lineHeight: "1.2" }}
                >
                  <i className="ri-eye-line"></i> Preview
                </a>
              ) : row.type === "Document" ? (
                <a
                  href={fileUrl(row.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-info edit-item-btn d-inline-flex align-items-center gap-1"
                  style={{ height: "28px", lineHeight: "1.2" }}
                >
                  <i className="ri-eye-line"></i> Preview
                </a>
              ) : (
                <button
                  className="btn btn-sm btn-info edit-item-btn d-flex align-items-center gap-1"
                  style={{ height: "28px" }}
                  onClick={() => handleOpenPreview(row)}
                >
                  <i className="ri-eye-line"></i> Preview
                </button>
              )
            )}
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
        minWidth: "260px",
      },
    ],
    [permissions, pageNo, perPage]
  );

  const getFileName = (path) => {
    if (!path) return "";
    return path.split("/").pop();
  };

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="g-guide-title" className="form-label fw-bold">
                Guide Title <span className="text-danger">*</span>
              </Label>
              <Input
                id="g-guide-title"
                type="text"
                name="title"
                placeholder="Enter Guide Title"
                value={values.title}
                onChange={handleChange}
              />
              {isSubmit && formErrors.title && (
                <p className="text-danger small mt-1">{formErrors.title}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="g-guide-type" className="form-label fw-bold">
                Guide Type <span className="text-danger">*</span>
              </Label>
              <Input
                id="g-guide-type"
                type="select"
                name="type"
                className="form-select"
                value={values.type}
                onChange={handleChange}
              >
                <option value="YouTube">YouTube</option>
                <option value="System Video">System Video (Self-Hosted)</option>
                <option value="Document">Document (PDF/Word)</option>
              </Input>
              {isSubmit && formErrors.type && (
                <p className="text-danger small mt-1">{formErrors.type}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={12}>
            {values.type === "YouTube" ? (
              <FormGroup className="mb-3">
                <Label htmlFor="g-youtube-url" className="form-label fw-bold">
                  YouTube URL <span className="text-danger">*</span>
                </Label>
                <Input
                  id="g-youtube-url"
                  type="url"
                  name="youtubeUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={values.youtubeUrl}
                  onChange={handleChange}
                />
                {isSubmit && formErrors.youtubeUrl && (
                  <p className="text-danger small mt-1">{formErrors.youtubeUrl}</p>
                )}
              </FormGroup>
            ) : (
              <FormGroup className="mb-3">
                <Label htmlFor="g-upload-file" className="form-label fw-bold">
                  Upload File <span className="text-danger">{(!existingFilePath && !selectedFile) ? "*" : ""}</span>
                </Label>
                <div className="d-flex align-items-center gap-2">
                  <Input
                    id="g-upload-file"
                    type="file"
                    innerRef={fileInputRef}
                    className="form-control"
                    onChange={handleFileChange}
                    accept={values.type === "System Video" ? "video/*" : ".pdf,.doc,.docx"}
                  />
                  {selectedFile && (
                    <Button
                      type="button"
                      color="danger"
                      outline
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      title="Cancel selected file"
                      className="d-flex align-items-center justify-content-center"
                      style={{ height: "38px", minWidth: "38px" }}
                    >
                      ✕
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <p className="text-success small mt-1 mb-0">
                    Selected: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                )}
                {existingFilePath && (
                  <div className="mt-2 p-2 rounded bg-light border d-flex align-items-center justify-content-between">
                    <span className="text-muted small">
                      Current file:{" "}
                      <a
                        href={fileUrl(existingFilePath)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary fw-medium"
                      >
                        {getFileName(existingFilePath)}
                      </a>
                    </span>
                    <Button
                      type="button"
                      color="danger"
                      size="sm"
                      className="py-0 px-2"
                      style={{ fontSize: "11px", height: "22px" }}
                      onClick={() => setExistingFilePath("")}
                      title="Remove current file reference"
                    >
                      ✕ Remove Link
                    </Button>
                  </div>
                )}
                {isSubmit && formErrors.file && (
                  <p className="text-danger small mt-1">{formErrors.file}</p>
                )}
              </FormGroup>
            )}
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label className="form-label fw-bold">Description</Label>
              <JoditEditor
                ref={editorRef}
                value={values.description}
                config={editorConfig}
                onBlur={(newContent) =>
                  setValues((prev) => ({ ...prev, description: newContent }))
                }
              />
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="g-sequence" className="form-label fw-bold">Sequence</Label>
              <Input
                id="g-sequence"
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
            {isSubmitLoading || isUpdateLoading ? "Saving..." : updateForm ? "Update Guide" : "Save Guide"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Manage Guides | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Help and Guide" title="Manage Guides" pageTitle="Guides" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm ? "Add Help Guide" : updateForm ? "Edit Help Guide" : "Help Guides List"}
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

                        {/* Guide Type Filter Dropdown */}
                        <div style={{ minWidth: "180px" }}>
                          <Input
                            aria-label="Filter guides by type"
                            type="select"
                            className="form-select form-select-sm"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="">All Types</option>
                            <option value="YouTube">YouTube</option>
                            <option value="System Video">System Video</option>
                            <option value="Document">Document</option>
                          </Input>
                        </div>

                        {/* Search Input Box */}
                        <div className="search-box mb-0" style={{ position: "relative", minWidth: "200px" }}>
                          <Input
                            aria-label="Search guides by title"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search guides..."
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                          <i className="ri-search-line search-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#878a99", fontSize: "12px" }}></i>
                        </div>

                        {/* Add Button */}
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add Help Guide
                          </Button>
                        )}
                      </>
                    ) : (
                      /* List Switch */
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
                        data={guides}
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

      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />

      {/* Preview Modal */}
      <Modal isOpen={modal_preview} toggle={() => setmodal_preview(false)} size="lg" centered scrollable>
        <ModalHeader toggle={() => setmodal_preview(false)} className="bg-light">
          <span className="text-capitalize">{previewGuide?.title}</span>
        </ModalHeader>
        <ModalBody className="p-4">
          <Row className="mb-3">
            <Col md={6}>
              <strong>Type:</strong> <span className="badge bg-info-subtle text-info ms-1">{previewGuide?.type}</span>
            </Col>
            <Col md={6}>
              <strong>Sequence:</strong> <span className="text-muted ms-1">{previewGuide?.sequence}</span>
            </Col>
          </Row>
          <hr />
          {previewGuide?.type === "YouTube" && previewGuide?.youtubeUrl && (
            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Video Playback</h6>
              <div className="ratio ratio-16x9">
                <iframe
                  src={getYoutubeEmbedUrl(previewGuide.youtubeUrl)}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
          {previewGuide?.type === "System Video" && previewGuide?.filePath && (
            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Video Playback</h6>
              <video controls width="100%" height="auto" className="rounded bg-dark">
                <source src={fileUrl(previewGuide.filePath)} />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {previewGuide?.type === "Document" && previewGuide?.filePath && (
            <div className="mb-4 d-flex align-items-center justify-content-between p-3 bg-light rounded border">
              <div>
                <i className="ri-file-pdf-fill text-info fs-24 me-2 align-middle"></i>
                <span className="fw-medium">{getFileName(previewGuide.filePath)}</span>
              </div>
              <a
                href={fileUrl(previewGuide.filePath)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary"
              >
                Open Document <i className="ri-external-link-line align-middle ms-1"></i>
              </a>
            </div>
          )}
          <div>
            <h6 className="fw-semibold mb-2">Description</h6>
            {previewGuide?.description ? (
              <div
                className="guide-description-content border rounded p-3 bg-white"
                style={{ maxHeight: "250px", overflowY: "auto" }}
                dangerouslySetInnerHTML={{ __html: previewGuide.description }}
              />
            ) : (
              <p className="text-muted italic">No description provided.</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="bg-light">
          <Button color="secondary" onClick={() => setmodal_preview(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default ManageGuides;

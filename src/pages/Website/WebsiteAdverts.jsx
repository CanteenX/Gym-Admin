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
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  searchSiteAds,
  createSiteAd,
  updateSiteAd,
  deleteSiteAd,
} from "../../api/siteAds.api";
import { unwrapList } from "@/utils/listResponse";
import { fileUrl } from "@/utils/fileUrl";
import { adLiveState } from "./adLiveState";

const PLACEMENTS = [
  { value: "HOME_HERO", label: "Home — Hero banner" },
  { value: "HOME_MID", label: "Home — Mid page" },
  { value: "SIDEBAR", label: "Sidebar" },
  { value: "FOOTER", label: "Footer" },
];

const placementLabel = (value) =>
  PLACEMENTS.find((p) => p.value === value)?.label || value || "—";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const humanSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * `<input type="datetime-local">` wants wall-clock time with no zone, while the
 * API stores an instant. toISOString() shifts by the UTC offset, so using it
 * here showed every Indian advert starting 5h30m earlier than it does.
 */
const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

/** The reverse: local wall clock back to an unambiguous instant for the API. */
const toApiDate = (localValue) => {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const formatWindow = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initialState = {
  title: "",
  targetUrl: "",
  placement: "HOME_HERO",
  startAt: "",
  endAt: "",
  sortOrder: 0,
  isActive: true,
};

const WebsiteAdverts = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // A super admin has full access: checkPermission returns next() immediately
  // for role === "ADMIN" and PermissionProtected short-circuits on isAdmin, so
  // gating the UI on a MenuMaster permission row would hide buttons the server
  // would happily honour. That is exactly what happened here - the Website
  // menus are seeded without blanket role grants (least privilege), which left
  // the owner looking at an empty state telling them to click a button that was
  // not rendered.
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true }
    : currentPagePermissions || {
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

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [existingImage, setExistingImage] = useState("");

  // Derive the preview once per file and revoke it. Calling
  // URL.createObjectURL() inline in JSX mints a new blob URL on every render of
  // the form and never releases the old one.
  const imagePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );
  useEffect(() => {
    if (!imagePreview) return undefined;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("sortOrder");
  const [sortDirection, setsortDirection] = useState("asc");

  const [modal_delete, setmodal_delete] = useState(false);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchSiteAds({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
      });
      const { rows, count } = unwrapList(response);
      setAds(rows);
      setTotalRows(count);
    } catch (err) {
      console.error(err);
      toast.error("Could not load adverts");
      setAds([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const resetFile = () => {
    setImageFile(null);
    setImageError("");
    setExistingImage("");
  };

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
    resetFile();
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
    resetFile();
  };

  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemoveId(id);
  };

  const handleTog_edit = (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setFormErrors({});
    setSelectedId(row._id);
    setImageFile(null);
    setImageError("");
    setExistingImage(row.imageUrl || "");
    setValues({
      title: row.title || "",
      targetUrl: row.targetUrl || "",
      placement: row.placement || "HOME_HERO",
      startAt: toLocalInput(row.startAt),
      endAt: toLocalInput(row.endAt),
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImageError("");
      return;
    }

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!IMAGE_ACCEPT.split(",").includes(ext)) {
      setImageError(`Only ${IMAGE_ACCEPT.replaceAll(",", ", ")} files are allowed`);
      e.target.value = "";
      setImageFile(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError(`File is ${humanSize(file.size)} — the limit is 2 MB`);
      e.target.value = "";
      setImageFile(null);
      return;
    }

    setImageError("");
    setImageFile(file);
  };

  const validate = (val) => {
    const errors = {};
    if (!String(val.title).trim()) {
      errors.title = "Title is required!";
    }
    if (!String(val.placement).trim()) {
      errors.placement = "Placement is required!";
    }
    // Required by the model, so a create with no file would 400 server-side.
    if (!updateForm && !imageFile) {
      errors.image = "A banner image is required";
    }
    if (val.startAt && val.endAt) {
      const start = new Date(val.startAt).getTime();
      const end = new Date(val.endAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        errors.endAt = "End date must be after the start date";
      }
    }
    return errors;
  };

  /**
   * Multipart, because the banner goes through the server's upload middleware.
   * Dates are sent as ISO instants; a cleared date is sent as an empty string
   * so "remove the end date" is expressible at all - omitting the key would be
   * indistinguishable from "leave it alone".
   */
  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", String(values.title).trim());
    fd.append("targetUrl", String(values.targetUrl).trim());
    fd.append("placement", values.placement);
    fd.append("startAt", toApiDate(values.startAt));
    fd.append("endAt", toApiDate(values.endAt));
    fd.append("sortOrder", String(Number(values.sortOrder) || 0));
    fd.append("isActive", String(Boolean(values.isActive)));
    if (imageFile) fd.append("image", imageFile);
    return fd;
  };

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitLoading(true);
    createSiteAd(buildFormData())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Advert Added Successfully!");
          tog_list();
          fetchAds();
        } else {
          toast.error(res.data.message || "Failed to add advert");
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to add advert");
      })
      .finally(() => {
        setIsSubmitLoading(false);
      });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsUpdateLoading(true);
    updateSiteAd(selectedId, buildFormData())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Advert Updated Successfully!");
          tog_list();
          fetchAds();
        } else {
          toast.error(res.data.message || "Failed to update advert");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to update advert");
      })
      .finally(() => {
        setIsUpdateLoading(false);
      });
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteSiteAd(removeId);
      if (res.data.isOk) {
        toast.success("Advert Deleted Successfully");
        fetchAds();
      } else {
        toast.error(res.data.message || "Failed to delete advert");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "An error occurred while deleting",
      );
    } finally {
      setIsDeleteLoading(false);
      setmodal_delete(false);
    }
  };

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "sortOrder");
    setsortDirection(direction);
  };

  /** Counted on the page in view, which is what the header says it is. */
  const liveOnPage = useMemo(
    () => ads.filter((ad) => adLiveState(ad).key === "LIVE").length,
    [ads],
  );

  const col = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
      {
        name: "Banner",
        cell: (row) =>
          row.imageUrl ? (
            <img
              src={fileUrl(row.imageUrl)}
              alt={`${row.title || "Advert"} banner`}
              style={{
                width: 72,
                height: 40,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ) : (
            <span className="text-muted small">
              <i className="ri-image-line" aria-hidden="true"></i> none
            </span>
          ),
        width: "110px",
      },
      {
        name: "Title",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 fw-semibold text-wrap">{row.title}</p>
            {row.targetUrl ? (
              <small className="text-muted text-wrap">
                <i className="ri-links-line" aria-hidden="true"></i>{" "}
                {row.targetUrl}
              </small>
            ) : null}
          </div>
        ),
        sortable: true,
        sortField: "title",
        minWidth: "220px",
      },
      {
        name: "Placement",
        cell: (row) => (
          <span className="badge bg-primary-subtle text-primary text-wrap">
            {placementLabel(row.placement)}
          </span>
        ),
        sortable: true,
        sortField: "placement",
        minWidth: "180px",
      },
      {
        name: "Schedule",
        cell: (row) => (
          <div className="py-1 small text-muted">
            <div>From: {formatWindow(row.startAt) || "always"}</div>
            <div>Until: {formatWindow(row.endAt) || "no end date"}</div>
          </div>
        ),
        minWidth: "200px",
      },
      {
        name: "State",
        cell: (row) => {
          const state = adLiveState(row);
          return (
            <span
              className={`badge ${state.badgeClass} d-inline-flex align-items-center gap-1`}
              title={state.hint}
            >
              <i className={state.icon} aria-hidden="true"></i> {state.label}
            </span>
          );
        },
        minWidth: "140px",
      },
      {
        name: "Order",
        selector: (row) => row.sortOrder ?? 0,
        sortable: true,
        sortField: "sortOrder",
        width: "100px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 py-1">
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success edit-item-btn d-flex align-items-center gap-1"
                onClick={() => handleTog_edit(row)}
              >
                <i className="ri-pencil-line" aria-hidden="true"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
                onClick={() => tog_delete(row._id)}
              >
                <i className="ri-delete-bin-line" aria-hidden="true"></i> Delete
              </button>
            )}
          </div>
        ),
        minWidth: "180px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, pageNo, perPage],
  );

  const livePreview = adLiveState({
    isActive: values.isActive,
    startAt: values.startAt,
    endAt: values.endAt,
  });

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertTitle" className="form-label fw-bold">
                Title <span className="text-danger">*</span>
              </Label>
              <Input
                id="advertTitle"
                name="title"
                placeholder="e.g. New Year Offer"
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
              <Label htmlFor="advertPlacement" className="form-label fw-bold">
                Placement <span className="text-danger">*</span>
              </Label>
              <Input
                id="advertPlacement"
                type="select"
                name="placement"
                value={values.placement}
                onChange={handleChange}
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Input>
              {isSubmit && formErrors.placement && (
                <p className="text-danger small mt-1">{formErrors.placement}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertImage" className="form-label fw-bold">
                Banner Image{" "}
                {!updateForm && <span className="text-danger">*</span>}
              </Label>
              <Input
                id="advertImage"
                type="file"
                name="image"
                accept={IMAGE_ACCEPT}
                onChange={handleFileChange}
              />
              <small className="text-muted d-block mt-1">
                JPG, PNG or WebP · max 2 MB
                {updateForm ? " · leave empty to keep the current banner" : ""}
              </small>
              {imageError && (
                <p className="text-danger small mt-1 mb-0">{imageError}</p>
              )}
              {isSubmit && formErrors.image && !imageFile && (
                <p className="text-danger small mt-1 mb-0">{formErrors.image}</p>
              )}
              {imageFile ? (
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  <img
                    src={imagePreview}
                    alt="Selected banner preview"
                    className="img-thumbnail"
                    style={{ maxWidth: "100%", width: 200, height: "auto" }}
                  />
                  <span className="small text-muted">
                    {imageFile.name} ({humanSize(imageFile.size)})
                  </span>
                </div>
              ) : null}
              {!imageFile && existingImage ? (
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  <img
                    src={fileUrl(existingImage)}
                    alt="Current banner"
                    className="img-thumbnail"
                    style={{ maxWidth: "100%", width: 200, height: "auto" }}
                  />
                  <span className="small text-muted">
                    Current banner — choose a file to replace it
                  </span>
                </div>
              ) : null}
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertTargetUrl" className="form-label fw-bold">
                Click-through Link
              </Label>
              <Input
                id="advertTargetUrl"
                name="targetUrl"
                placeholder="https://… or /programs"
                value={values.targetUrl}
                onChange={handleChange}
              />
              <small className="text-muted">
                Where a visitor goes when they click the banner. Leave empty for
                a banner that is not clickable.
              </small>
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertStartAt" className="form-label fw-bold">
                Starts
              </Label>
              <Input
                id="advertStartAt"
                type="datetime-local"
                name="startAt"
                value={values.startAt}
                onChange={handleChange}
              />
              <small className="text-muted">
                Leave empty to start showing immediately
              </small>
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertEndAt" className="form-label fw-bold">
                Ends
              </Label>
              <Input
                id="advertEndAt"
                type="datetime-local"
                name="endAt"
                value={values.endAt}
                onChange={handleChange}
              />
              <small className="text-muted">
                Leave empty to run until switched off
              </small>
              {isSubmit && formErrors.endAt && (
                <p className="text-danger small mt-1">{formErrors.endAt}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="advertSortOrder" className="form-label fw-bold">
                Sort Order
              </Label>
              <Input
                id="advertSortOrder"
                type="number"
                name="sortOrder"
                value={values.sortOrder}
                onChange={handleChange}
              />
              <small className="text-muted">
                Order among adverts in the same placement
              </small>
            </FormGroup>
          </Col>

          <Col md={6} className="d-flex align-items-center">
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="advertIsActive"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="advertIsActive"
              >
                Active
              </Label>
            </FormGroup>
          </Col>

          <Col md={12}>
            {/* Ticking Active is not the same as being visible; say which one
                these settings actually produce before the advert is saved. */}
            <div className="alert alert-light border d-flex align-items-center gap-2 flex-wrap mb-0">
              <span
                className={`badge ${livePreview.badgeClass} d-inline-flex align-items-center gap-1`}
              >
                <i className={livePreview.icon} aria-hidden="true"></i>{" "}
                {livePreview.label}
              </span>
              <span className="small text-muted">
                With these settings: {livePreview.hint}
              </span>
            </div>
          </Col>
        </Row>

        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button type="button" color="light" onClick={tog_list}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="success"
            disabled={isSubmitLoading || isUpdateLoading}
          >
            {isSubmitLoading || isUpdateLoading
              ? "Saving..."
              : updateForm
                ? "Update Advert"
                : "Save Advert"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Website Adverts | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Website"
            title="Website Adverts"
            pageTitle="Website Adverts"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Advert"
                      : updateForm
                        ? "Edit Advert"
                        : "Website Adverts"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <i className="ri-broadcast-line" aria-hidden="true"></i>{" "}
                          {liveOnPage} live on this page
                        </span>

                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Label
                            htmlFor="advertSearch"
                            className="visually-hidden"
                          >
                            Search adverts
                          </Label>
                          <Input
                            id="advertSearch"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search adverts..."
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPageNo(1);
                            }}
                          />
                          <i
                            className="ri-search-line search-icon text-muted"
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "12px",
                            }}
                          ></i>
                        </div>

                        <Button
                          color="light"
                          size="sm"
                          style={{ height: "30px" }}
                          onClick={fetchAds}
                          title="Reload adverts"
                          aria-label="Reload adverts"
                        >
                          <i className="ri-refresh-line" aria-hidden="true"></i>
                        </Button>

                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i
                              className="ri-add-line align-bottom"
                              aria-hidden="true"
                            ></i>{" "}
                            Add Advert
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
                  renderForm()
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={ads}
                        progressPending={loading}
                        sortServer
                        onSort={handleSort}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        onChangeRowsPerPage={(newPerPage) =>
                          setPerPage(newPerPage)
                        }
                        onChangePage={(page) => setPageNo(page)}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No adverts yet. Click <strong>Add Advert</strong> to
                            create one.
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

export default WebsiteAdverts;

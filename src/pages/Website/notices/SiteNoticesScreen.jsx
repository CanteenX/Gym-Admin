import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import PropTypes from "prop-types";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Label,
  Row,
} from "reactstrap";
import { toast } from "react-toastify";
import BreadCrumb from "@/Components/Common/BreadCrumb";
import DeleteModal from "@/Components/Common/DeleteModal";
import { AuthContext } from "@/context/AuthContext";
import { MenuContext } from "@/context/MenuContext";
import { unwrapList } from "@/utils/listResponse";
import {
  createSiteNotice,
  deleteSiteNotice,
  searchSiteNotices,
  updateSiteNotice,
  uploadSiteNoticeImage,
} from "@/api/siteNotices.api";
import { validateImageFile } from "../ImageField";
import NoticeForm from "./NoticeForm";
import NoticeList from "./NoticeList";
import { noticeLiveState } from "./noticeLiveState";
import { NOTICE_KIND_CONFIG, toApiDate, toLocalInput } from "./noticeConfig";

/**
 * The screen behind both /cms/announcements and /cms/banners.
 *
 * ONE COMPONENT, PARAMETERISED BY `kind`, for the reason noticeConfig.js gives:
 * the two differ in which fields they show, not in how they are scheduled,
 * listed, permissioned or saved. The routes stay separate (Announcements.jsx,
 * Banners.jsx) because the SERVER treats them as separate permissions.
 *
 * THE SAVE IS TWO REQUESTS WHEN A BANNER HAS A NEW FILE, and that is a server
 * decision rather than a convenience: create and update are JSON so that the
 * permission middleware can read `kind` out of the body and charge the write to
 * the right screen. On a multipart request the body is still unparsed at that
 * point, because the uploader runs last. So the row goes first and the creative
 * follows, addressed to an id whose kind the server can read back. See
 * api/siteNotices.api.jsx.
 *
 * A FAILED SECOND REQUEST IS REPORTED AS ITS OWN OUTCOME rather than as a
 * failed save. The row really was created; saying "failed" would have the
 * editor create it again and leave two.
 */

const initialValues = {
  title: "",
  body: "",
  tone: "INFO",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  placement: "",
  dismissible: true,
  startAt: "",
  endAt: "",
  sortOrder: 0,
  isActive: true,
};

const SiteNoticesScreen = ({ kind }) => {
  const config = NOTICE_KIND_CONFIG[kind];
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);

  /**
   * A super admin has full access: cmsPermission returns next() immediately for
   * a super-admin session and PermissionProtected short-circuits on isAdmin, so
   * gating the buttons on a MenuMaster row would hide actions the server would
   * happily honour. That is exactly what happened on the adverts screen - the
   * website menus are seeded without blanket role grants (least privilege),
   * which left the owner looking at an empty state telling them to click a
   * button that was not rendered.
   */
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true }
    : currentPagePermissions || {
        read: true,
        write: true,
        edit: true,
        delete: true,
      };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setColumn] = useState("sortOrder");
  const [sortDirection, setSortDirection] = useState("asc");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [values, setValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [savedStatus, setSavedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState("");

  const [removeId, setRemoveId] = useState("");
  const [modalDelete, setModalDelete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    const skip = Math.max((pageNo - 1) * perPage, 0);

    try {
      /**
       * `kind` goes TOP-LEVEL, never inside `match`. The permission middleware
       * reads the top-level field to decide which of the two screens this read
       * is authorised against; omitting it falls back to the all-pages grant,
       * which would hand a banners-only editor every announcement in the list.
       */
      const response = await searchSiteNotices({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        kind: config.kind,
        ...(activeFilter === "" ? {} : { isActive: activeFilter }),
      });
      const { rows: list, count } = unwrapList(response);
      setRows(list);
      setTotalRows(count);
    } catch (err) {
      console.error(err);
      toast.error(`Could not load ${config.screenTitle.toLowerCase()}`);
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [
    pageNo,
    perPage,
    column,
    sortDirection,
    query,
    activeFilter,
    config.kind,
    config.screenTitle,
  ]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  /**
   * Counted on the page in view, which is what the header says it is.
   *
   * THE EXPIRED COUNT IS THE ONE WORTH HAVING. "3 live" is reassurance; "2
   * expired" is the sentence that would have ended the original incident before
   * it became a bug report, because it is visible without opening a single row.
   */
  const summary = useMemo(() => {
    const counts = { LIVE: 0, SCHEDULED: 0, EXPIRED: 0, INACTIVE: 0 };
    rows.forEach((row) => {
      const key = noticeLiveState(row).key;
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [rows]);

  const resetForm = () => {
    setValues(initialValues);
    setFormErrors({});
    setIsSubmit(false);
    setImageFile(null);
    setImageError("");
    setSelectedId("");
    setSavedStatus("");
  };

  const closeForm = () => {
    setShowForm(false);
    setUpdateForm(false);
    resetForm();
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
    setUpdateForm(false);
  };

  const openEditForm = useCallback(
    (row) => {
      setShowForm(false);
      setUpdateForm(true);
      setFormErrors({});
      setIsSubmit(false);
      setImageFile(null);
      setImageError("");
      setSelectedId(row._id);
      // Kept so the form can say "this was already expired when you opened it",
      // which is a different statement from "the dates you are typing are past".
      setSavedStatus(noticeLiveState(row).key);
      setValues({
        title: row.title || "",
        body: row.body || "",
        tone: row.tone || "INFO",
        imageUrl: row.imageUrl || "",
        ctaLabel: row.ctaLabel || "",
        ctaUrl: row.ctaUrl || "",
        placement: row.placement || "",
        dismissible: row.dismissible !== undefined ? row.dismissible : true,
        startAt: toLocalInput(row.startAt),
        endAt: toLocalInput(row.endAt),
        sortOrder: row.sortOrder ?? 0,
        isActive: row.isActive !== undefined ? row.isActive : true,
      });
    },
    [],
  );

  const handleField = (e) =>
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheck = (e) =>
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.checked }));

  const handleImageUrl = (value) =>
    setValues((prev) => ({ ...prev, imageUrl: value }));

  const handleImageFile = (file, event) => {
    // The server checks extension, MIME and magic bytes and is the real
    // authority; this only makes the obvious mistakes fail instantly.
    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      setImageFile(null);
      if (event?.target) event.target.value = "";
      return;
    }
    setImageError("");
    setImageFile(file);
  };

  const validate = (val) => {
    const errors = {};
    if (!String(val.title).trim()) {
      errors.title = "A title is required";
    }
    if (config.bodyRequired && !String(val.body).trim()) {
      errors.body =
        "A message is required - a title on its own is a headline with no news in it";
    }
    if (config.hasPlacement && !String(val.placement).trim()) {
      errors.placement = "Choose where on the site this banner appears";
    }
    if (val.startAt && val.endAt) {
      const start = new Date(val.startAt).getTime();
      const end = new Date(val.endAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        errors.endAt = "The end date must be after the start date";
      }
    }
    return errors;
  };

  /**
   * JSON, not FormData. Only the fields this kind actually owns are sent: the
   * server would normalise a stray `placement` on an announcement to null and a
   * stray `dismissible` on a banner to false, but sending them anyway means the
   * request says something the screen does not mean.
   *
   * An empty date string is sent deliberately rather than omitted - "" is how
   * the server is told "open-ended", while omitting the key means "leave it
   * alone", so clearing an end date would otherwise be unexpressible.
   */
  const buildPayload = () => ({
    kind: config.kind,
    title: String(values.title).trim(),
    body: String(values.body).trim(),
    tone: values.tone,
    ctaLabel: String(values.ctaLabel).trim(),
    ctaUrl: String(values.ctaUrl).trim(),
    startAt: toApiDate(values.startAt),
    endAt: toApiDate(values.endAt),
    sortOrder: Number(values.sortOrder) || 0,
    isActive: Boolean(values.isActive),
    ...(config.hasPlacement ? { placement: values.placement } : {}),
    ...(config.hasDismissible ? { dismissible: Boolean(values.dismissible) } : {}),
    ...(config.hasImage ? { imageUrl: String(values.imageUrl).trim() } : {}),
  });

  /**
   * The creative, if one was picked, on its own request against the saved row.
   *
   * Reported separately on failure: the notice itself is already saved, and
   * telling the editor the save failed would have them do it again.
   *
   * @param {string} id the saved row
   * @returns {Promise<boolean>} whether the notice is now complete
   */
  const attachImage = async (id) => {
    if (!config.hasImage || !imageFile || !id) return true;
    try {
      const form = new FormData();
      // The multer field name is pinned to `image` by the route; any other name
      // and the file is silently dropped.
      form.append("image", imageFile);
      const res = await uploadSiteNoticeImage(id, form);
      if (res.data?.isOk) return true;
      toast.warning(
        res.data?.message ||
          "The banner was saved, but its image could not be uploaded",
      );
      return false;
    } catch (err) {
      console.error(err);
      toast.warning(
        err.response?.data?.message ||
          "The banner was saved, but its image could not be uploaded",
      );
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload = buildPayload();
      const res = updateForm
        ? await updateSiteNotice(selectedId, payload)
        : await createSiteNotice(payload);

      // The envelope can say isOk: false on an HTTP 200, so the status code is
      // not the test - this is the house rule for every call in the panel.
      if (!res.data?.isOk) {
        toast.error(
          res.data?.message || `Failed to save the ${config.singular.toLowerCase()}`,
        );
        return;
      }

      const savedId = updateForm ? selectedId : res.data?.data?._id;
      const complete = await attachImage(savedId);
      if (complete) {
        toast.success(
          `${config.singular} ${updateForm ? "updated" : "added"} successfully`,
        );
      }
      closeForm();
      fetchNotices();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          `Failed to save the ${config.singular.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const openDelete = useCallback((id) => {
    setRemoveId(id);
    setModalDelete(true);
  }, []);

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteSiteNotice(removeId);
      if (res.data?.isOk) {
        toast.success(`${config.singular} deleted successfully`);
        fetchNotices();
      } else {
        toast.error(res.data?.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "An error occurred while deleting",
      );
    } finally {
      setIsDeleteLoading(false);
      setModalDelete(false);
    }
  };

  const handleSort = (col, direction) => {
    setColumn(col.sortField || "sortOrder");
    setSortDirection(direction);
  };

  document.title = `${config.screenTitle} | ${adminData?.companyName || "Admin"}`;

  const formOpen = showForm || updateForm;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Website"
            title={config.screenTitle}
            pageTitle={config.screenTitle}
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? config.addLabel
                      : updateForm
                        ? `Edit ${config.singular}`
                        : config.screenTitle}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!formOpen ? (
                      <>
                        {/* The state of the page at a glance. The expired count
                            is the one that matters: it is the fact that was
                            invisible when a two-minute window was reported as
                            broken software. */}
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <i className="ri-broadcast-line" aria-hidden="true"></i>{" "}
                          {summary.LIVE} live
                        </span>
                        {summary.SCHEDULED > 0 ? (
                          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                            <i className="ri-time-line" aria-hidden="true"></i>{" "}
                            {summary.SCHEDULED} scheduled
                          </span>
                        ) : null}
                        {summary.EXPIRED > 0 ? (
                          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                            <i
                              className="ri-calendar-close-line"
                              aria-hidden="true"
                            ></i>{" "}
                            {summary.EXPIRED} expired
                          </span>
                        ) : null}

                        <div style={{ minWidth: "150px" }}>
                          <Label htmlFor="noticeActiveFilter" className="visually-hidden">
                            Filter by switch
                          </Label>
                          <Input
                            id="noticeActiveFilter"
                            type="select"
                            className="form-select form-select-sm"
                            style={{ height: "30px", padding: "0 0.5rem" }}
                            value={activeFilter}
                            onChange={(e) => {
                              setActiveFilter(e.target.value);
                              setPageNo(1);
                            }}
                          >
                            <option value="">All</option>
                            <option value="true">Switched on</option>
                            <option value="false">Switched off</option>
                          </Input>
                        </div>

                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Label htmlFor="noticeSearch" className="visually-hidden">
                            Search {config.screenTitle.toLowerCase()}
                          </Label>
                          <Input
                            id="noticeSearch"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder={`Search ${config.screenTitle.toLowerCase()}...`}
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
                          onClick={fetchNotices}
                          title={`Reload ${config.screenTitle.toLowerCase()}`}
                          aria-label={`Reload ${config.screenTitle.toLowerCase()}`}
                        >
                          <i className="ri-refresh-line" aria-hidden="true"></i>
                        </Button>

                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={openAddForm}
                          >
                            <i
                              className="ri-add-line align-bottom"
                              aria-hidden="true"
                            ></i>{" "}
                            {config.addLabel}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button color="dark" size="sm" onClick={closeForm}>
                        Back to list
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardBody>
                  {formOpen ? (
                    <NoticeForm
                      config={config}
                      values={values}
                      formErrors={formErrors}
                      isSubmit={isSubmit}
                      imageFile={imageFile}
                      imageError={imageError}
                      savedStatus={savedStatus}
                      updateForm={updateForm}
                      saving={saving}
                      onField={handleField}
                      onCheck={handleCheck}
                      onImageUrl={handleImageUrl}
                      onImageFile={handleImageFile}
                      onSubmit={handleSubmit}
                      onCancel={closeForm}
                    />
                  ) : (
                    <NoticeList
                      config={config}
                      rows={rows}
                      loading={loading}
                      permissions={permissions}
                      pageNo={pageNo}
                      perPage={perPage}
                      totalRows={totalRows}
                      onSort={handleSort}
                      onChangePage={(page) => setPageNo(page)}
                      onChangeRowsPerPage={(next) => setPerPage(next)}
                      onEdit={openEditForm}
                      onDelete={openDelete}
                    />
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <DeleteModal
        show={modalDelete}
        handleDelete={handleDelete}
        toggle={() => setModalDelete(false)}
        setmodal_delete={setModalDelete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

SiteNoticesScreen.propTypes = {
  kind: PropTypes.oneOf(["ANNOUNCEMENT", "BANNER"]).isRequired,
};

export default SiteNoticesScreen;

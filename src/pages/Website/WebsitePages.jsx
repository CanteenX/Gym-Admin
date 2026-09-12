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
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  searchSiteContent,
  createSiteContent,
  updateSiteContent,
  deleteSiteContent,
} from "../../api/siteContent.api";
import { unwrapList } from "@/utils/listResponse";
import { fileUrl } from "@/utils/fileUrl";

/**
 * The pages the marketing site renders. A row whose pageKey is not in this list
 * still shows up - the tab strip is built from the data as well as this list -
 * because an editor who mistypes a pageKey would otherwise lose the row with no
 * way to find or fix it.
 */
const PAGE_KEYS = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "programs", label: "Programs" },
  { key: "contact", label: "Contact" },
];

const pageLabel = (key) =>
  PAGE_KEYS.find((p) => p.key === key)?.label || key || "Unassigned";

/**
 * One fetch, grouped in the browser.
 *
 * Site content is a handful of rows per page - tens in total, not thousands -
 * and the screen has to show every section of a page at once to be usable. A
 * server round trip per tab would add latency and a `pageKey` filter parameter
 * that the by-params contract does not define.
 */
const FETCH_LIMIT = 500;

const initialState = {
  pageKey: "home",
  sectionKey: "",
  title: "",
  subtitle: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  sortOrder: 0,
  isActive: true,
};

const WebsitePages = () => {
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
  const [activePage, setActivePage] = useState("home");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [modal_delete, setmodal_delete] = useState(false);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchSiteContent({
        skip: 0,
        per_page: FETCH_LIMIT,
        sorton: "sortOrder",
        sortdir: "asc",
        match: query,
      });
      const { rows } = unwrapList(response);
      setSections(rows);
    } catch (err) {
      console.error(err);
      toast.error("Could not load website content");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  /** Tabs = the known pages plus whatever pageKeys the data actually contains. */
  const tabs = useMemo(() => {
    const fromData = sections.map((s) => s.pageKey).filter(Boolean);
    const keys = [...new Set([...PAGE_KEYS.map((p) => p.key), ...fromData])];
    return keys.map((key) => ({
      key,
      label: pageLabel(key),
      count: sections.filter((s) => s.pageKey === key).length,
    }));
  }, [sections]);

  const visibleSections = useMemo(
    () =>
      sections
        .filter((s) => s.pageKey === activePage)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [sections, activePage],
  );

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    // Pre-select the tab being viewed so "Add Section" adds to the page the
    // editor is actually looking at.
    setValues({ ...initialState, pageKey: activePage });
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
    setFormErrors({});
    setSelectedId(row._id);
    setValues({
      pageKey: row.pageKey || "home",
      sectionKey: row.sectionKey || "",
      title: row.title || "",
      subtitle: row.subtitle || "",
      body: row.body || "",
      imageUrl: row.imageUrl || "",
      ctaLabel: row.ctaLabel || "",
      ctaHref: row.ctaHref || "",
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

  const validate = (val) => {
    const errors = {};
    if (!String(val.pageKey).trim()) {
      errors.pageKey = "Page is required!";
    }
    if (!String(val.sectionKey).trim()) {
      errors.sectionKey = "Section key is required!";
    } else if (!/^[a-z0-9_-]+$/.test(String(val.sectionKey).trim())) {
      errors.sectionKey =
        "Lowercase letters, numbers, hyphen and underscore only (e.g. hero)";
    }
    // A CTA with a label but no link renders a dead button on the live site.
    if (String(val.ctaLabel).trim() && !String(val.ctaHref).trim()) {
      errors.ctaHref = "A button label needs a link";
    }
    return errors;
  };

  const buildPayload = () => ({
    ...values,
    pageKey: String(values.pageKey).trim(),
    sectionKey: String(values.sectionKey).trim().toLowerCase(),
    title: String(values.title).trim(),
    subtitle: String(values.subtitle).trim(),
    imageUrl: String(values.imageUrl).trim(),
    ctaLabel: String(values.ctaLabel).trim(),
    ctaHref: String(values.ctaHref).trim(),
    sortOrder: Number(values.sortOrder) || 0,
  });

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitLoading(true);
    createSiteContent(buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Section Added Successfully!");
          setActivePage(buildPayload().pageKey);
          setShowForm(false);
          setValues(initialState);
          fetchSections();
        } else {
          // The unique (pageKey, sectionKey) index is what rejects a duplicate.
          toast.error(res.data.message || "Failed to add section");
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to add section");
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
    updateSiteContent(selectedId, buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Section Updated Successfully!");
          setUpdateForm(false);
          fetchSections();
        } else {
          toast.error(res.data.message || "Failed to update section");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to update section");
      })
      .finally(() => {
        setIsUpdateLoading(false);
      });
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteSiteContent(removeId);
      if (res.data.isOk) {
        toast.success("Section Deleted Successfully");
        fetchSections();
      } else {
        toast.error(res.data.message || "Failed to delete section");
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

  const col = useMemo(
    () => [
      {
        name: "Order",
        selector: (row) => row.sortOrder ?? 0,
        width: "90px",
      },
      {
        name: "Section",
        cell: (row) => (
          <span className="fw-semibold text-wrap">{row.sectionKey}</span>
        ),
        minWidth: "150px",
      },
      {
        name: "Title",
        cell: (row) => (
          <div className="py-1">
            <p className="mb-0 text-wrap">{row.title || "—"}</p>
            {row.subtitle ? (
              <small className="text-muted text-wrap">{row.subtitle}</small>
            ) : null}
          </div>
        ),
        minWidth: "220px",
      },
      {
        name: "Body",
        cell: (row) => (
          <span className="text-muted small text-wrap">
            {row.body ? `${String(row.body).slice(0, 80)}${String(row.body).length > 80 ? "…" : ""}` : "—"}
          </span>
        ),
        minWidth: "220px",
      },
      {
        name: "Image",
        cell: (row) =>
          row.imageUrl ? (
            <img
              src={fileUrl(row.imageUrl)}
              alt={`${row.sectionKey} section`}
              style={{
                width: 56,
                height: 36,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ) : (
            <span className="text-muted small">—</span>
          ),
        width: "100px",
      },
      {
        name: "Button",
        cell: (row) =>
          row.ctaLabel ? (
            <span className="badge bg-info text-wrap">{row.ctaLabel}</span>
          ) : (
            <span className="text-muted small">—</span>
          ),
        minWidth: "130px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Published" : "Hidden"}
          </span>
        ),
        width: "120px",
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
                <i className="ri-pencil-line"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions],
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentPageKey" className="form-label fw-bold">
                Page <span className="text-danger">*</span>
              </Label>
              <Input
                id="contentPageKey"
                type="select"
                name="pageKey"
                value={values.pageKey}
                onChange={handleChange}
              >
                {PAGE_KEYS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
                {/* An existing row on an unknown page must still be editable. */}
                {!PAGE_KEYS.some((p) => p.key === values.pageKey) &&
                values.pageKey ? (
                  <option value={values.pageKey}>{values.pageKey}</option>
                ) : null}
              </Input>
              {isSubmit && formErrors.pageKey && (
                <p className="text-danger small mt-1">{formErrors.pageKey}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentSectionKey" className="form-label fw-bold">
                Section Key <span className="text-danger">*</span>
              </Label>
              <Input
                id="contentSectionKey"
                name="sectionKey"
                placeholder="e.g. hero"
                value={values.sectionKey}
                onChange={handleChange}
              />
              <small className="text-muted">
                The site looks the section up by this key — renaming it hides
                the section until the page is updated to match.
              </small>
              {isSubmit && formErrors.sectionKey && (
                <p className="text-danger small mt-1">{formErrors.sectionKey}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentTitle" className="form-label fw-bold">
                Title
              </Label>
              <Input
                id="contentTitle"
                name="title"
                placeholder="Headline shown on the site"
                value={values.title}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentSubtitle" className="form-label fw-bold">
                Subtitle
              </Label>
              <Input
                id="contentSubtitle"
                name="subtitle"
                placeholder="Supporting line under the headline"
                value={values.subtitle}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentBody" className="form-label fw-bold">
                Body
              </Label>
              <Input
                id="contentBody"
                type="textarea"
                rows="5"
                name="body"
                placeholder="Paragraph text for this section"
                value={values.body}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentImageUrl" className="form-label fw-bold">
                Image URL
              </Label>
              <Input
                id="contentImageUrl"
                name="imageUrl"
                placeholder="https://… or uploads/site/hero.webp"
                value={values.imageUrl}
                onChange={handleChange}
              />
              <small className="text-muted">
                Paste a link. Upload a file on the Adverts screen if you need one
                hosted here.
              </small>
              {values.imageUrl ? (
                <div className="mt-2">
                  <img
                    src={fileUrl(values.imageUrl)}
                    alt="Section preview"
                    className="img-thumbnail"
                    style={{ maxWidth: "100%", width: 180, height: "auto" }}
                  />
                </div>
              ) : null}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentCtaLabel" className="form-label fw-bold">
                Button Label
              </Label>
              <Input
                id="contentCtaLabel"
                name="ctaLabel"
                placeholder="e.g. Join Now"
                value={values.ctaLabel}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentCtaHref" className="form-label fw-bold">
                Button Link
              </Label>
              <Input
                id="contentCtaHref"
                name="ctaHref"
                placeholder="e.g. /contact"
                value={values.ctaHref}
                onChange={handleChange}
              />
              {isSubmit && formErrors.ctaHref && (
                <p className="text-danger small mt-1">{formErrors.ctaHref}</p>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="contentSortOrder" className="form-label fw-bold">
                Sort Order
              </Label>
              <Input
                id="contentSortOrder"
                type="number"
                name="sortOrder"
                value={values.sortOrder}
                onChange={handleChange}
              />
              <small className="text-muted">
                Lower numbers appear higher up the page
              </small>
            </FormGroup>
          </Col>

          <Col md={6} className="d-flex align-items-center">
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="contentIsActive"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="contentIsActive"
              >
                Published on the website
              </Label>
            </FormGroup>
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
                ? "Update Section"
                : "Save Section"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Website Pages | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Website"
            title="Website Pages"
            pageTitle="Website Pages"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Page Section"
                      : updateForm
                        ? "Edit Page Section"
                        : "Website Pages"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Label
                            htmlFor="contentSearch"
                            className="visually-hidden"
                          >
                            Search website content
                          </Label>
                          <Input
                            id="contentSearch"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search sections..."
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
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
                          className="d-flex align-items-center gap-1"
                          style={{ height: "30px" }}
                          onClick={fetchSections}
                          title="Reload sections"
                          aria-label="Reload sections"
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
                            Add Section
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
                    <Nav pills className="nav-custom-light mb-3 flex-wrap gap-1">
                      {tabs.map((tab) => (
                        <NavItem key={tab.key}>
                          <NavLink
                            href="#"
                            active={activePage === tab.key}
                            onClick={(e) => {
                              e.preventDefault();
                              setActivePage(tab.key);
                            }}
                          >
                            {tab.label}{" "}
                            <span className="badge bg-light text-body ms-1">
                              {tab.count}
                            </span>
                          </NavLink>
                        </NavItem>
                      ))}
                    </Nav>

                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={visibleSections}
                        progressPending={loading}
                        pagination
                        paginationPerPage={10}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No sections on the{" "}
                            <strong>{pageLabel(activePage)}</strong> page yet.
                            Click <strong>Add Section</strong> to create one.
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

export default WebsitePages;

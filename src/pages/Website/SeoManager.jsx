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
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  searchSeoMeta,
  createSeoMeta,
  updateSeoMeta,
  deleteSeoMeta,
} from "../../api/seoMeta.api";
import { unwrapList } from "@/utils/listResponse";
import SeoList from "./seo/SeoList";
import SeoEditor, { CATEGORIES } from "./seo/SeoEditor";
import SeoScorePanel from "./seo/SeoScorePanel";
import GooglePreview from "./seo/GooglePreview";
import SocialPreview from "./seo/SocialPreview";
import {
  absoluteUrlFor,
  canonicalProblem,
  keywordList,
  normaliseSlug,
} from "./seo/seoRules";

/**
 * One fetch, filtered in the browser.
 *
 * There is one row per route of the public site - a dozen or so, not thousands
 * - and the category chips have to show a count for every category at once,
 * which a server-side filter could not do without a second request per chip.
 */
const FETCH_LIMIT = 500;

const initialState = {
  slug: "",
  pageTitle: "",
  category: "Marketing",
  icon: "",
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogType: "website",
  noIndex: false,
  isActive: true,
};

const SeoManager = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // A super admin has full access: checkPermission returns next() immediately
  // for role === "ADMIN" and PermissionProtected short-circuits on isAdmin, so
  // gating the UI on a MenuMaster permission row alone would hide buttons the
  // server would happily honour. That is exactly what happened on the Phase 1
  // Website screens - those menus are seeded without blanket role grants (least
  // privilege), which left the owner looking at an empty state telling them to
  // click a button that was never rendered.
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
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [previewView, setPreviewView] = useState("desktop");

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [modal_delete, setmodal_delete] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchSeoMeta({
        skip: 0,
        per_page: FETCH_LIMIT,
        sorton: "slug",
        sortdir: "asc",
        match: query,
      });
      const { rows } = unwrapList(response);
      setPages(rows);
    } catch (err) {
      console.error(err);
      toast.error("Could not load SEO settings");
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  /** Known categories plus whatever the data actually contains. */
  const categories = useMemo(() => {
    const fromData = pages.map((p) => p.category).filter(Boolean);
    const keys = [...new Set([...CATEGORIES, ...fromData])];
    return [
      { value: "ALL", label: "All pages", count: pages.length },
      ...keys.map((key) => ({
        value: key,
        label: key,
        count: pages.filter((p) => (p.category || "Other") === key).length,
      })),
    ];
  }, [pages]);

  const visiblePages = useMemo(() => {
    if (activeCategory === "ALL") return pages;
    return pages.filter((p) => (p.category || "Other") === activeCategory);
  }, [pages, activeCategory]);

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
    setValues({
      ...initialState,
      // Pre-select the category being viewed so "Add Page" adds to the list the
      // editor is actually looking at.
      category: activeCategory === "ALL" ? "Marketing" : activeCategory,
      noIndex: activeCategory === "Portal",
    });
    setIsSubmit(false);
    setFormErrors({});
  };

  const tog_delete = useCallback((id) => {
    setmodal_delete(true);
    setRemoveId(id);
  }, []);

  const handleTog_edit = useCallback((row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setFormErrors({});
    setSelectedId(row._id);
    setValues({
      slug: row.slug || "",
      pageTitle: row.pageTitle || "",
      category: row.category || "Marketing",
      icon: row.icon || "",
      metaTitle: row.metaTitle || "",
      metaDescription: row.metaDescription || "",
      keywords: keywordList(row.keywords),
      canonicalUrl: row.canonicalUrl || "",
      ogTitle: row.ogTitle || "",
      ogDescription: row.ogDescription || "",
      ogImage: row.ogImage || "",
      ogType: row.ogType || "website",
      noIndex: row.noIndex === true,
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
  }, []);

  /**
   * Immutable field update, with the two defaults that would otherwise be
   * chores an editor forgets.
   */
  const handleField = (name, value) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "slug") {
        // Keep the canonical pointed at this page while it is still the default
        // one. A canonical someone deliberately aimed elsewhere is left alone -
        // overwriting that would silently undo a considered decision.
        const wasDefault =
          !prev.canonicalUrl ||
          prev.canonicalUrl === absoluteUrlFor(prev.slug);
        if (wasDefault) next.canonicalUrl = absoluteUrlFor(value);
      }

      if (name === "category" && value === "Portal" && prev.category !== "Portal") {
        // Every portal route sits behind the member login, so indexing one is
        // always a mistake. Still a switch the editor can turn back off.
        next.noIndex = true;
      }

      return next;
    });
  };

  const validate = (val) => {
    const errors = {};
    const slug = normaliseSlug(val.slug);
    if (!slug) {
      errors.slug = "Route is required, e.g. / or /programs";
    } else if (!/^\/[A-Za-z0-9\-_/]*$/.test(slug)) {
      errors.slug =
        "Use the plain path only - letters, numbers, hyphen, underscore and slashes (e.g. /programs)";
    }
    if (!String(val.pageTitle).trim()) {
      errors.pageTitle = "Page name is required!";
    }
    // A broken canonical de-indexes the page, so it is worth blocking the save
    // rather than only colouring the field.
    const canonicalError = canonicalProblem(val.canonicalUrl);
    if (canonicalError) errors.canonicalUrl = canonicalError;
    return errors;
  };

  const buildPayload = () => ({
    slug: normaliseSlug(values.slug),
    pageTitle: String(values.pageTitle).trim(),
    category: String(values.category || "Other").trim(),
    icon: String(values.icon || "").trim(),
    metaTitle: String(values.metaTitle).trim(),
    metaDescription: String(values.metaDescription).trim(),
    keywords: keywordList(values.keywords),
    canonicalUrl: String(values.canonicalUrl).trim(),
    ogTitle: String(values.ogTitle).trim(),
    ogDescription: String(values.ogDescription).trim(),
    ogImage: String(values.ogImage).trim(),
    ogType: String(values.ogType || "website").trim(),
    noIndex: Boolean(values.noIndex),
    isActive: Boolean(values.isActive),
  });

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitLoading(true);
    createSeoMeta(buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Page SEO Added Successfully!");
          setShowForm(false);
          setValues(initialState);
          fetchPages();
        } else {
          // The unique index on slug is what rejects a duplicate route.
          toast.error(res.data.message || "Failed to add page SEO");
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to add page SEO");
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
    updateSeoMeta(selectedId, buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Page SEO Updated Successfully!");
          setUpdateForm(false);
          fetchPages();
        } else {
          toast.error(res.data.message || "Failed to update page SEO");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to update page SEO");
      })
      .finally(() => {
        setIsUpdateLoading(false);
      });
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteSeoMeta(removeId);
      if (res.data.isOk) {
        toast.success("Page SEO Deleted Successfully");
        fetchPages();
      } else {
        toast.error(res.data.message || "Failed to delete page SEO");
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

  const liveUrl = absoluteUrlFor(values.slug);

  const renderForm = () => (
    <CardBody>
      <Row>
        <Col xl={7}>
          <Form onSubmit={updateForm ? handleUpdate : handleClick}>
            <SeoEditor
              values={values}
              onField={handleField}
              formErrors={formErrors}
              isSubmit={isSubmit}
              disabled={isSubmitLoading || isUpdateLoading}
            />
            <div className="mt-2 d-flex justify-content-end gap-2 flex-wrap">
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
                    ? "Update Page SEO"
                    : "Save Page SEO"}
              </Button>
            </div>
          </Form>
        </Col>

        <Col xl={5}>
          {/* Previews read the same `values` the form writes, so they update as
              you type rather than on save. */}
          <div className="border rounded p-3 mt-3 mt-xl-0">
            <SeoScorePanel values={values} />
            <hr />
            <GooglePreview
              values={values}
              view={previewView}
              onViewChange={setPreviewView}
            />
            <hr />
            <SocialPreview values={values} />
            {liveUrl ? (
              <p className="mt-3 mb-0">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-break"
                >
                  <i className="ri-external-link-line" aria-hidden="true"></i>{" "}
                  Open {liveUrl} in a new tab
                </a>
              </p>
            ) : null}
          </div>
        </Col>
      </Row>
    </CardBody>
  );

  document.title = `SEO Manager | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Website"
            title="SEO Manager"
            pageTitle="SEO Manager"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Page SEO"
                      : updateForm
                        ? `Edit SEO - ${values.pageTitle || values.slug}`
                        : "SEO Manager"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Label htmlFor="seoSearch" className="visually-hidden">
                            Search pages by name, route or meta title
                          </Label>
                          <Input
                            id="seoSearch"
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search pages..."
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
                          onClick={fetchPages}
                          title="Reload pages"
                          aria-label="Reload pages"
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
                            Add Page
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button color="dark" size="sm" onClick={tog_list}>
                        &#8801; List
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <SeoList
                      rows={visiblePages}
                      loading={loading}
                      permissions={permissions}
                      categories={categories}
                      activeCategory={activeCategory}
                      onCategoryChange={setActiveCategory}
                      onEdit={handleTog_edit}
                      onDelete={tog_delete}
                    />
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

export default SeoManager;

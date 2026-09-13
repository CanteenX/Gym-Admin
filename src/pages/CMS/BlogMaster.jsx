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
  Badge,
  Button,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionBody,
  FormGroup,
  Form,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import DataTable from "react-data-table-component";
import JoditEditor from "jodit-react";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import config from "../../config";
import {
  createBlog,
  updateBlog,
  getBlogById,
  deleteBlog,
  toggleBlogStatus,
  searchBlogs,
  getBlogStats,
} from "../../api/blogs.api";

const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (
    imagePath.startsWith("blob:") ||
    imagePath.startsWith("data:") ||
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }
  const baseUrl = config.api.API_URL.replace(/\/+$/, "");
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const initialFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  tags: "",
  author: "Admin",
  status: "Draft",
  publishDate: new Date().toISOString().substring(0, 10),
  featuredImageAlt: "",
  isFeatured: false,
  isTrending: false,
  allowComments: true,
  isActive: true,
  // SEO fields
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
};

const BlogMaster = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || { read: true, write: true, edit: true, delete: true };

  // Data & Filter states
  const [blogs, setBlogs] = useState([]);
  const [stats, setStats] = useState({ totalBlogs: 0, publishedBlogs: 0, draftBlogs: 0, totalViews: 0 });

  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [query, setQuery] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [column, setcolumn] = useState("createdAt");
  const [sortDirection, setsortDirection] = useState("desc");

  // Form states
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [formValues, setFormValues] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeFeaturedImage, setRemoveFeaturedImage] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [modal_delete, setModalDelete] = useState(false);
  const [modal_preview, setModalPreview] = useState(false);
  const [previewBlog, setPreviewBlog] = useState(null);

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState("");

  const toggleAccordion = (id) => {
    setAccordionOpen(accordionOpen === id ? "" : id);
  };

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder:
        "Write amazing blog content here... Drag and drop multiple images directly to upload and insert them!",
      height: 380,
      toolbarSticky: false,
      showXPathInStatusbar: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "image",
        "file",
        "video",
        "table",
        "link",
        "|",
        "align",
        "undo",
        "redo",
        "|",
        "fullsize",
        "dots",
      ],
    }),
    []
  );

  const loadMasterData = async () => {
    try {
      const statsRes = await getBlogStats();
      if (statsRes.data.isOk) setStats(statsRes.data.data);
    } catch (err) {
      console.error("Error loading blog stats:", err);
    }
  };

  const fetchBlogs = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchBlogs({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filterActive,
        category: filterCategory,
        status: filterStatus,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setBlogs(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setBlogs([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showForm && !updateForm) {
      fetchBlogs();
      loadMasterData();
    }
  }, [
    pageNo,
    perPage,
    column,
    sortDirection,
    query,
    filterActive,
    filterCategory,
    filterStatus,
    showForm,
    updateForm,
  ]);

  const handleOpenAddForm = () => {
    loadMasterData();
    setShowForm(true);
    setUpdateForm(false);
    setSelectedId("");
    setFormValues(initialFormState);
    setImageFile(null);
    setImagePreview("");
    setRemoveFeaturedImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormErrors({});
    setIsSubmit(false);
  };

  const handleOpenEditForm = (id) => {
    loadMasterData();
    setSelectedId(id);
    setFormErrors({});
    setIsSubmit(false);
    getBlogById(id)
      .then((res) => {
        if (res.data.isOk) {
          const blog = res.data.data;
          setFormValues({
            title: blog.title || "",
            slug: blog.slug || "",
            excerpt: blog.excerpt || "",
            content: blog.content || "",
            category: blog.category || "",
            tags: Array.isArray(blog.tags) ? blog.tags.join(", ") : blog.tags || "",
            author: blog.author || "Admin",
            status: blog.status || "Draft",
            publishDate: blog.publishDate
              ? new Date(blog.publishDate).toISOString().substring(0, 10)
              : new Date().toISOString().substring(0, 10),
            featuredImageAlt: blog.featuredImageAlt || "",
            isFeatured: !!blog.isFeatured,
            isTrending: !!blog.isTrending,
            allowComments: blog.allowComments !== false,
            isActive: blog.isActive !== false,
            metaTitle: blog.seo?.metaTitle || "",
            metaDescription: blog.seo?.metaDescription || "",
            metaKeywords: blog.seo?.metaKeywords ? blog.seo.metaKeywords.join(", ") : "",
            canonicalUrl: blog.seo?.canonicalUrl || "",
            ogTitle: blog.seo?.ogTitle || "",
            ogDescription: blog.seo?.ogDescription || "",
          });
          if (blog.featuredImage) {
            setImagePreview(getImageUrl(blog.featuredImage));
          } else {
            setImagePreview("");
          }
          setImageFile(null);
          setRemoveFeaturedImage(false);
          setShowForm(false);
          setUpdateForm(true);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to fetch blog post details");
      });
  };

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setFormValues(initialFormState);
    setImageFile(null);
    setImagePreview("");
    setRemoveFeaturedImage(false);
    setFormErrors({});
    setIsSubmit(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setRemoveFeaturedImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenPreview = (blog) => {
    setPreviewBlog(blog);
    setModalPreview(true);
  };

  const handlePublish = async (id) => {
    try {
      const res = await toggleBlogStatus(id, { field: "status", value: "Published" });
      if (res.data.isOk) {
        toast.success("Blog Published Successfully");
        fetchBlogs();
        loadMasterData();
      } else {
        toast.error(res.data.message || "Failed to publish blog");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish blog");
    }
  };

  const handleToggle = async (id, field, currentValue) => {
    try {
      const res = await toggleBlogStatus(id, { field, value: !currentValue });
      if (res.data.isOk) {
        toast.success(`Updated blog ${field}`);
        fetchBlogs();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      return updated;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveFeaturedImage(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formValues.title.trim()) errors.title = "Title is required";
    if (!formValues.excerpt.trim()) errors.excerpt = "Short excerpt is required";
    return errors;
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      setIsSubmitLoading(true);

      const formData = new FormData();
      formData.append("title", formValues.title);
      if (formValues.slug) formData.append("slug", formValues.slug);
      formData.append("excerpt", formValues.excerpt);
      formData.append("content", formValues.content);
      formData.append("category", formValues.category || "");

      const parsedTags = typeof formValues.tags === "string"
        ? formValues.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : Array.isArray(formValues.tags)
        ? formValues.tags
        : [];
      formData.append("tags", JSON.stringify(parsedTags));

      formData.append("author", formValues.author);
      formData.append("status", formValues.status);
      formData.append("publishDate", formValues.publishDate);
      formData.append("featuredImageAlt", formValues.featuredImageAlt);
      formData.append("isFeatured", formValues.isFeatured);
      formData.append("isTrending", formValues.isTrending);
      formData.append("allowComments", formValues.allowComments);
      formData.append("isActive", formValues.isActive);
      formData.append("removeFeaturedImage", removeFeaturedImage);

      const seoData = {
        metaTitle: formValues.metaTitle,
        metaDescription: formValues.metaDescription,
        metaKeywords: formValues.metaKeywords,
        canonicalUrl: formValues.canonicalUrl,
        ogTitle: formValues.ogTitle,
        ogDescription: formValues.ogDescription,
      };
      formData.append("seo", JSON.stringify(seoData));

      if (imageFile) {
        formData.append("featuredImage", imageFile);
      }

      const apiCall = updateForm ? updateBlog(selectedId, formData) : createBlog(formData);

      apiCall
        .then((res) => {
          if (res.data.isOk) {
            toast.success(`Blog ${updateForm ? "Updated" : "Created"} Successfully!`);
            tog_list();
            fetchBlogs();
            loadMasterData();
          } else {
            toast.error(res.data.message || "Operation failed");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to save blog post");
        })
        .finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleDeleteBlog = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteBlog(removeId);
      if (res.data.isOk) {
        toast.success("Blog Deleted Successfully");
        setModalDelete(false);
        fetchBlogs();
        loadMasterData();
      } else {
        toast.error(res.data.message || "Failed to delete blog");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete blog");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Published":
        return <Badge color="success">Published</Badge>;
      case "Draft":
        return <Badge color="warning">Draft</Badge>;
      case "Scheduled":
        return <Badge color="info">Scheduled</Badge>;
      case "Archived":
        return <Badge color="secondary">Archived</Badge>;
      default:
        return <Badge color="dark">{status}</Badge>;
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => (pageNo - 1) * perPage + index + 1,
        width: "80px",
      },
      {
        name: "Thumbnail",
        cell: (row) => (
          <div className="py-1">
            {row.featuredImage ? (
              <img
                src={getImageUrl(row.featuredImage)}
                alt={row.title}
                className="rounded"
                style={{ width: "48px", height: "48px", objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none"; /* via.placeholder.com is shut down - its fallback 404s too */
                }}
              />
            ) : (
              <div
                className="rounded border d-flex align-items-center justify-content-center text-secondary fw-bold"
                style={{ width: "48px", height: "48px", fontSize: "11px", backgroundColor: "#f3f3f9" }}
              >
                NO IMG
              </div>
            )}
          </div>
        ),
        width: "90px",
      },
      {
        name: "Title",
        cell: (row) => (
          <div>
            <div className="fw-semibold text-truncate" style={{ maxWidth: "220px" }} title={row.title}>
              {row.title}
            </div>
            <small className="text-muted d-block" title={row.slug}>{row.slug}</small>
          </div>
        ),
        minWidth: "200px",
        sortable: true,
        sortField: "title",
      },
      {
        name: "Category",
        selector: (row) => row.category || "Uncategorized",
        minWidth: "120px",
      },
      {
        name: "Status",
        cell: (row) => getStatusBadge(row.status),
        width: "110px",
      },
      {
        name: "Active",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
        width: "100px",
      },
      {
        name: "Created Date",
        selector: (row) => row.createdAt,
        cell: (row) => {
          if (!row.createdAt) return "-";
          const date = new Date(row.createdAt);
          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
        width: "140px",
        sortable: true,
        sortField: "createdAt",
      },
      {
        name: "Actions",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1">
            <Button
              color="info"
              size="sm"
              className="btn-icon waves-effect waves-light"
              onClick={() => handleOpenPreview(row)}
              title="Preview Article"
            >
              <i className="ri-eye-fill"></i>
            </Button>
            {row.status === "Draft" && permissions.edit && (
              <Button
                color="primary"
                size="sm"
                className="px-2 d-flex align-items-center gap-1"
                onClick={() => handlePublish(row._id)}
                title="Publish Article"
                style={{ height: "28px" }}
              >
                <i className="ri-rocket-line"></i> Publish
              </Button>
            )}
            {permissions.edit && (
              <Button
                color="success"
                size="sm"
                className="px-2 d-flex align-items-center gap-1"
                onClick={() => handleOpenEditForm(row._id)}
                title="Edit Article"
                style={{ height: "28px" }}
              >
                <i className="ri-pencil-fill"></i> Edit
              </Button>
            )}
            {permissions.delete && (
              <Button
                color="danger"
                size="sm"
                className="btn-icon waves-effect waves-light"
                onClick={() => {
                  setRemoveId(row._id);
                  setModalDelete(true);
                }}
                title="Delete Article"
              >
                <i className="ri-delete-bin-fill"></i>
              </Button>
            )}
          </div>
        ),
        minWidth: "220px",
      },
    ],
    [permissions, handlePublish, pageNo, perPage]
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={handleSubmitForm}>
        <Row>
          {/* Main Form Area */}
          <Col lg={8}>
            <div className="mb-3">
              <Label htmlFor="blog-title" className="form-label fw-bold">
                Title <span className="text-danger">*</span>
              </Label>
              <Input
                id="blog-title"
                type="text"
                name="title"
                placeholder="Enter blog title"
                value={formValues.title}
                onChange={handleInputChange}
              />
              {isSubmit && formErrors.title && (
                <p className="text-danger small mt-1">{formErrors.title}</p>
              )}
            </div>

            <div className="mb-3">
              <Label htmlFor="blog-slug" className="form-label fw-bold">
                Slug (URL Friendly Name) <small className="text-muted fw-normal">(Leave blank to auto-generate)</small>
              </Label>
              <Input
                id="blog-slug"
                type="text"
                name="slug"
                placeholder="e.g. why-pure-silver-wedding-cards"
                value={formValues.slug}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-3">
              <Label className="form-label fw-bold">
                Content <span className="text-danger">*</span>
              </Label>
              <JoditEditor
                ref={editorRef}
                value={formValues.content}
                config={editorConfig}
                tabIndex={1}
                onBlur={(newContent) =>
                  setFormValues((prev) => ({ ...prev, content: newContent }))
                }
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="blog-excerpt" className="form-label fw-bold">
                Short Description / Excerpt <span className="text-danger">*</span>
              </Label>
              <Input
                id="blog-excerpt"
                type="textarea"
                rows="3"
                name="excerpt"
                placeholder="Provide a concise 2-3 line summary for card preview..."
                value={formValues.excerpt}
                onChange={handleInputChange}
              />
              {isSubmit && formErrors.excerpt && (
                <p className="text-danger small mt-1">{formErrors.excerpt}</p>
              )}
            </div>

            {/* SEO Accordion */}
            <Accordion open={accordionOpen} toggle={toggleAccordion} className="mt-4">
              <AccordionItem>
                <AccordionHeader targetId="seo-1">
                  🔍 Search Engine Optimization (SEO & Social Meta Details)
                </AccordionHeader>
                <AccordionBody accordionId="seo-1">
                  <FormGroup>
                    <Label htmlFor="blog-meta-title" className="form-label">Meta Title</Label>
                    <Input
                      id="blog-meta-title"
                      type="text"
                      name="metaTitle"
                      placeholder="Meta title for Google search"
                      value={formValues.metaTitle}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="blog-meta-description" className="form-label">Meta Description</Label>
                    <Input
                      id="blog-meta-description"
                      type="textarea"
                      rows="2"
                      name="metaDescription"
                      placeholder="Meta description (150-160 characters recommended)"
                      value={formValues.metaDescription}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="blog-meta-keywords" className="form-label">Meta Keywords</Label>
                    <Input
                      id="blog-meta-keywords"
                      type="text"
                      name="metaKeywords"
                      placeholder="Comma-separated keywords (e.g. blog, news, update)"
                      value={formValues.metaKeywords}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="blog-canonical-url" className="form-label">Canonical URL</Label>
                    <Input
                      id="blog-canonical-url"
                      type="text"
                      name="canonicalUrl"
                      placeholder="https://example.com/blog/my-post"
                      value={formValues.canonicalUrl}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label htmlFor="blog-og-title" className="form-label">OG Share Title</Label>
                        <Input
                          id="blog-og-title"
                          type="text"
                          name="ogTitle"
                          placeholder="Title for Facebook/LinkedIn"
                          value={formValues.ogTitle}
                          onChange={handleInputChange}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label htmlFor="blog-og-description" className="form-label">OG Share Description</Label>
                        <Input
                          id="blog-og-description"
                          type="text"
                          name="ogDescription"
                          placeholder="Description for social preview"
                          value={formValues.ogDescription}
                          onChange={handleInputChange}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </AccordionBody>
              </AccordionItem>
            </Accordion>
          </Col>

          {/* Sidebar Area */}
          <Col lg={4}>
            <Card className="border shadow-sm p-3 bg-light">
              <h6 className="fw-bold mb-3 text-uppercase text-secondary">Publish Settings</h6>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-status" className="form-label fw-bold">Status</Label>
                <Input
                  id="blog-status"
                  type="select"
                  name="status"
                  value={formValues.status}
                  onChange={handleInputChange}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Archived">Archived</option>
                </Input>
              </FormGroup>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-publish-date" className="form-label fw-bold">Publish Date</Label>
                <Input
                  id="blog-publish-date"
                  type="date"
                  name="publishDate"
                  value={formValues.publishDate}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-category" className="form-label fw-bold">Category</Label>
                <Input
                  id="blog-category"
                  type="text"
                  name="category"
                  placeholder="e.g. Wedding Trends"
                  value={formValues.category}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-author" className="form-label fw-bold">Author</Label>
                <Input
                  id="blog-author"
                  type="text"
                  name="author"
                  placeholder="Author name"
                  value={formValues.author}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-tags" className="form-label fw-bold">Tags (comma separated)</Label>
                <Input
                  id="blog-tags"
                  type="text"
                  name="tags"
                  placeholder="silver, wedding, luxury"
                  value={formValues.tags}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <hr />

              <FormGroup className="mb-3">
                <Label htmlFor="blog-featured-image" className="form-label fw-bold">Featured Banner Image</Label>
                <Input
                  id="blog-featured-image"
                  type="file"
                  accept="image/*"
                  innerRef={fileInputRef}
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="mt-2 text-center">
                    <div className="position-relative d-inline-block border rounded p-1 bg-white">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="img-fluid rounded"
                        style={{ maxHeight: "150px", maxWidth: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = "none"; /* via.placeholder.com is shut down - its fallback 404s too */
                        }}
                      />
                      <Button
                        type="button"
                        color="danger"
                        size="sm"
                        className="position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: "24px", height: "24px", fontSize: "12px" }}
                        onClick={handleRemoveImage}
                        title="Remove Image"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <small className="text-muted d-block mt-1">
                    Upload PNG, JPG, or WEBP banner image.
                  </small>
                )}
              </FormGroup>

              <FormGroup className="mb-3">
                <Label htmlFor="blog-featured-image-alt" className="form-label">Image Alt Text (SEO)</Label>
                <Input
                  id="blog-featured-image-alt"
                  type="text"
                  name="featuredImageAlt"
                  placeholder="Image alt description"
                  value={formValues.featuredImageAlt}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <hr />

              <div className="mb-2 form-check">
                <Input
                  type="checkbox"
                  className="form-check-input"
                  id="isActive"
                  name="isActive"
                  checked={formValues.isActive}
                  onChange={handleInputChange}
                />
                <Label className="form-check-label ms-1 fw-semibold" htmlFor="isActive">
                  Is Active
                </Label>
              </div>

              <div className="mt-4">
                {updateForm ? (
                  <FormUpdateFooter
                    handleUpdate={handleSubmitForm}
                    handleUpdateCancel={tog_list}
                    isLoading={isSubmitLoading}
                  />
                ) : (
                  <FormsFooter
                    handleSubmit={handleSubmitForm}
                    handleSubmitCancel={tog_list}
                    isLoading={isSubmitLoading}
                  />
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </CardBody>
  );

  document.title = `Blog Master | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="CMS" title="Blog Post Master" pageTitle="CMS" />

          {/* Quick Metrics Summary Bar (Visible in List Mode) */}
          {!showForm && !updateForm && (
            <Row className="mb-3">
              <Col xl={3} md={6}>
                <Card className="card-animate bg-primary text-white mb-2">
                  <CardBody className="p-3">
                    <h6 className="text-white-50 text-uppercase fw-semibold mb-1" style={{ fontSize: "12px" }}>
                      Total Blogs
                    </h6>
                    <h3 className="text-white mb-0">{stats.totalBlogs}</h3>
                  </CardBody>
                </Card>
              </Col>
              <Col xl={3} md={6}>
                <Card className="card-animate bg-success text-white mb-2">
                  <CardBody className="p-3">
                    <h6 className="text-white-50 text-uppercase fw-semibold mb-1" style={{ fontSize: "12px" }}>
                      Published
                    </h6>
                    <h3 className="text-white mb-0">{stats.publishedBlogs}</h3>
                  </CardBody>
                </Card>
              </Col>
              <Col xl={3} md={6}>
                <Card className="card-animate bg-warning text-white mb-2">
                  <CardBody className="p-3">
                    <h6 className="text-white-50 text-uppercase fw-semibold mb-1" style={{ fontSize: "12px" }}>
                      Drafts
                    </h6>
                    <h3 className="text-white mb-0">{stats.draftBlogs}</h3>
                  </CardBody>
                </Card>
              </Col>
              <Col xl={3} md={6}>
                <Card className="card-animate bg-info text-white mb-2">
                  <CardBody className="p-3">
                    <h6 className="text-white-50 text-uppercase fw-semibold mb-1" style={{ fontSize: "12px" }}>
                      Total Views
                    </h6>
                    <h3 className="text-white mb-0">{stats.totalViews}</h3>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between">
                  <h5 className="card-title mb-0">
                    {showForm ? "Add Blog" : updateForm ? "Edit Blog" : "Blog Posts"}
                  </h5>
                  <div>
                    {showForm || updateForm ? (
                      <Button color="dark" size="sm" onClick={tog_list}>
                        ≡ List
                      </Button>
                    ) : (
                      permissions.write && (
                        <Button color="primary" size="sm" onClick={handleOpenAddForm}>
                          + Add Blog
                        </Button>
                      )
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <Row className="g-2 mb-3">
                      <Col md={4}>
                        <Input
                          id="blog-list-search"
                          aria-label="Search blog posts by title or excerpt"
                          type="text"
                          className="form-control"
                          placeholder="Search title, excerpt..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <Input
                          id="blog-list-status-filter"
                          aria-label="Filter blog posts by status"
                          type="select"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="Published">Published</option>
                          <option value="Draft">Draft</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Archived">Archived</option>
                        </Input>
                      </Col>
                    </Row>

                    <div className="table-responsive table-card">
                      <DataTable
                        columns={columns}
                        data={blogs}
                        progressPending={loading}
                        sortServer
                        onSort={(col, dir) => {
                          setcolumn(col.sortField || "createdAt");
                          setsortDirection(dir);
                        }}
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

      {/* Preview Article Modal */}
      <Modal isOpen={modal_preview} toggle={() => setModalPreview(false)} size="lg" centered scrollable>
        <ModalHeader toggle={() => setModalPreview(false)} className="bg-light">
          Blog Post Preview
        </ModalHeader>
        <ModalBody style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {previewBlog && (
            <div>
              <h3>{previewBlog.title}</h3>
              <div className="text-muted mb-2">
                <span>By {previewBlog.author || "Admin"}</span> •{" "}
                <span>{new Date(previewBlog.publishDate || previewBlog.createdAt).toLocaleDateString()}</span> •{" "}
                <span>{previewBlog.readingTime || 1} min read</span>
              </div>
              {previewBlog.featuredImage && (
                <div className="text-center mb-3 bg-light rounded p-2 border">
                  <img
                    src={getImageUrl(previewBlog.featuredImage)}
                    alt={previewBlog.title}
                    className="img-fluid rounded"
                    style={{ maxHeight: "450px", maxWidth: "100%", height: "auto", objectFit: "contain" }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none"; /* via.placeholder.com is shut down - its fallback 404s too */
                    }}
                  />
                </div>
              )}
              <p className="lead">{previewBlog.excerpt}</p>
              <hr />
              <div
                className="blog-content-view"
                style={{ overflowX: "auto" }}
                dangerouslySetInnerHTML={{ __html: previewBlog.content || "<p><i>No detailed body content written.</i></p>" }}
              />
              {previewBlog.tags && previewBlog.tags.length > 0 && (
                <div className="d-flex flex-wrap align-items-center gap-1 mt-3 pt-2 border-top">
                  <span className="fw-bold me-2 text-muted small">Tags:</span>
                  {(Array.isArray(previewBlog.tags)
                    ? previewBlog.tags
                    : typeof previewBlog.tags === "string"
                    ? previewBlog.tags.split(",")
                    : []
                  ).map((t, idx) => (
                    <Badge key={idx} color="light" className="text-dark border me-1">
                      #{t.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDeleteBlog}
        toggle={() => setModalDelete(false)}
        setmodal_delete={setModalDelete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default BlogMaster;

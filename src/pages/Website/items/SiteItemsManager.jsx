import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
} from "reactstrap";
import { toast } from "react-toastify";
import DeleteModal from "../../../Components/Common/DeleteModal";
import { unwrapList } from "@/utils/listResponse";
import {
  searchSiteItems,
  createSiteItem,
  updateSiteItem,
  deleteSiteItem,
  uploadSiteItemImage,
} from "../../../api/siteItems.api";
import { listBranches } from "../../../api/branches.api";
import SiteItemForm, {
  IMAGE_ACCEPT,
  MAX_UPLOAD_BYTES,
  humanSize,
} from "./SiteItemForm";
import SiteItemList from "./SiteItemList";
import CollectionChips from "./CollectionChips";
import ClassTimetable, { supportsGrid } from "./ClassTimetable";
import {
  collectionLabel,
  editableFields,
  fieldsToForm,
  formToFields,
  imageSlots,
  validateFieldValues,
} from "./itemSpecs";

/**
 * One fetch, grouped in the browser.
 *
 * There are 48 rows across all seven lists today and the chips have to show a
 * count for every list at once, which a server-side collection filter could not
 * do without one request per chip. `match` still goes to the server, because
 * that is the house contract for search.
 */
const FETCH_LIMIT = 500;

/** Gaps of ten, matching the seed: a new row fits between two without renumbering. */
const ORDER_STEP = 10;

const initialValues = {
  collectionKey: "",
  title: "",
  subtitle: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  sortOrder: 0,
  isActive: true,
  branch: "",
};

/** Keeps whatever the new list also declares, defaults the rest. */
const remapFieldValues = (previous, defs) =>
  defs.reduce((acc, def) => {
    const existing = previous?.[def.key];
    if (existing === undefined) {
      return { ...acc, [def.key]: def.type === "boolean" ? false : "" };
    }
    return { ...acc, [def.key]: existing };
  }, {});

/**
 * The repeating lists of the marketing site: programme cards, pricing plans,
 * FAQs, trainers, the class timetable, testimonials and transformations.
 *
 * On `/website-pages` this lives beside the sections editor under one menu
 * permission. On `/cms/*` routes `lockedCollectionKey` scopes to a single list
 * so the React path matches MenuMaster (no query-string menus — see todo.md).
 *
 * @param {object} props
 * @param {object} props.permissions
 * @param {string|null} [props.lockedCollectionKey]
 */
const SiteItemsManager = ({ permissions, lockedCollectionKey = null }) => {
  const [rows, setRows] = useState([]);
  const [collections, setCollections] = useState([]);
  const [fieldSpecs, setFieldSpecs] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState(lockedCollectionKey || "");
  const [view, setView] = useState("grid");

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [editingFields, setEditingFields] = useState({});

  const [values, setValues] = useState(() => ({
    ...initialValues,
    collectionKey: lockedCollectionKey || "",
  }));
  const [fieldValues, setFieldValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);

  const [pendingFiles, setPendingFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [modal_delete, setmodal_delete] = useState(false);

  useEffect(() => {
    if (lockedCollectionKey) setActiveKey(lockedCollectionKey);
  }, [lockedCollectionKey]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchSiteItems({
        skip: 0,
        per_page: FETCH_LIMIT,
        sorton: "collectionKey",
        sortdir: "asc",
        match: query,
      });
      const { rows: data } = unwrapList(response);
      setRows(data);
      /**
       * `collections` and `fieldSpecs` ride alongside the envelope on every
       * page — that is why the server sends them, and reading them here is what
       * keeps the form from drifting out of step with what the API accepts.
       * The fallback derives the chips from the data so a failed or older
       * response still renders something editable rather than an empty screen.
       */
      const served = response?.data?.collections;
      setCollections(
        Array.isArray(served) && served.length
          ? served
          : [...new Set(data.map((r) => r.collectionKey).filter(Boolean))],
      );
      const specs = response?.data?.fieldSpecs;
      if (specs && typeof specs === "object") setFieldSpecs(specs);
    } catch (err) {
      console.error(err);
      toast.error("Could not load website lists");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // The branch tag is a free string server-side, so the picker is built from
  // the branch master rather than a hardcoded pair of names.
  useEffect(() => {
    let cancelled = false;
    listBranches(true)
      .then((res) => {
        if (cancelled || !res?.data?.isOk) return;
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setBranches(list.map((b) => b?.name || "").filter(Boolean));
      })
      .catch((err) => {
        // Not fatal: the tag is optional and the select still offers "every
        // branch" plus whatever the row already carries.
        console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (lockedCollectionKey) return;
    if (activeKey || !collections.length) return;
    setActiveKey(collections[0]);
  }, [collections, activeKey, lockedCollectionKey]);

  const chips = useMemo(
    () =>
      (lockedCollectionKey
        ? collections.filter((key) => key === lockedCollectionKey)
        : collections
      ).map((key) => ({
        key,
        label: collectionLabel(key),
        count: rows.filter((r) => r.collectionKey === key).length,
      })),
    [collections, rows, lockedCollectionKey],
  );

  const visibleRows = useMemo(
    () =>
      rows
        .filter((r) => r.collectionKey === activeKey)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [rows, activeKey],
  );

  /** The list being browsed drives the table; the form follows its own list. */
  const listDefs = useMemo(
    () => editableFields(fieldSpecs, activeKey, visibleRows[0]?.fields),
    [fieldSpecs, activeKey, visibleRows],
  );

  const formDefs = useMemo(
    () => editableFields(fieldSpecs, values.collectionKey, editingFields),
    [fieldSpecs, values.collectionKey, editingFields],
  );

  const gridAvailable = supportsGrid(listDefs);

  const resetForm = () => {
    setShowForm(false);
    setUpdateForm(false);
    setSelectedId("");
    setEditingFields({});
    setValues({
      ...initialValues,
      collectionKey: lockedCollectionKey || "",
    });
    setFieldValues({});
    setFormErrors({});
    setFieldErrors({});
    setIsSubmit(false);
    setPendingFiles({});
    setFileErrors({});
  };

  const nextSortOrder = () =>
    visibleRows.reduce((max, r) => Math.max(max, r.sortOrder || 0), 0) +
    ORDER_STEP;

  /**
   * @param {object} [prefill] extra `fields` values, e.g. the day and time of
   *   the empty timetable cell that was clicked
   */
  const handleOpenAdd = (prefill) => {
    const defs = editableFields(fieldSpecs, activeKey, prefill);
    resetForm();
    setShowForm(true);
    setValues({
      ...initialValues,
      collectionKey: activeKey,
      sortOrder: nextSortOrder(),
    });
    setFieldValues(fieldsToForm(prefill || {}, defs));
    setEditingFields(prefill || {});
  };

  const handleOpenEdit = (row) => {
    const defs = editableFields(fieldSpecs, row.collectionKey, row.fields);
    resetForm();
    setUpdateForm(true);
    setSelectedId(row._id);
    setEditingFields(row.fields || {});
    setValues({
      collectionKey: row.collectionKey || activeKey,
      title: row.title || "",
      subtitle: row.subtitle || "",
      body: row.body || "",
      imageUrl: row.imageUrl || "",
      ctaLabel: row.ctaLabel || "",
      ctaHref: row.ctaHref || "",
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive !== false,
      branch: row.branch || "",
    });
    setFieldValues(fieldsToForm(row.fields, defs));
  };

  const handleField = (name, value) => {
    if (name === "collectionKey" && lockedCollectionKey) {
      return;
    }
    if (name !== "collectionKey") {
      setValues((prev) => ({ ...prev, [name]: value }));
      return;
    }
    // Moving lists changes which extras exist; keep the ones the new list also
    // declares so a mis-click does not empty the form.
    const defs = editableFields(fieldSpecs, value, editingFields);
    setValues((prev) => ({ ...prev, collectionKey: value }));
    setFieldValues((prev) => remapFieldValues(prev, defs));
  };

  const handleFieldValue = (key, value) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (slot, file, event) => {
    if (!file) {
      setPendingFiles((prev) => ({ ...prev, [slot]: null }));
      setFileErrors((prev) => ({ ...prev, [slot]: "" }));
      return;
    }

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!IMAGE_ACCEPT.split(",").includes(ext)) {
      if (event?.target) event.target.value = "";
      setPendingFiles((prev) => ({ ...prev, [slot]: null }));
      setFileErrors((prev) => ({
        ...prev,
        [slot]: `Only ${IMAGE_ACCEPT.replaceAll(",", ", ")} files are allowed`,
      }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      if (event?.target) event.target.value = "";
      setPendingFiles((prev) => ({ ...prev, [slot]: null }));
      setFileErrors((prev) => ({
        ...prev,
        [slot]: `File is ${humanSize(file.size)} — the limit is 5 MB`,
      }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, [slot]: "" }));
    setPendingFiles((prev) => ({ ...prev, [slot]: file }));
  };

  const validate = () => {
    const errors = {};
    if (!String(values.collectionKey).trim()) {
      errors.collectionKey = "Pick a list for this row";
    }
    if (!String(values.title).trim()) {
      errors.title = "Title is required!";
    }
    // A button with a label and no link renders a dead control on the live site.
    if (String(values.ctaLabel).trim() && !String(values.ctaHref).trim()) {
      errors.ctaHref = "A button label needs a link";
    }
    return errors;
  };

  const buildPayload = () => ({
    collectionKey: String(values.collectionKey).trim(),
    title: String(values.title).trim(),
    subtitle: String(values.subtitle).trim(),
    body: values.body,
    imageUrl: String(values.imageUrl).trim(),
    ctaLabel: String(values.ctaLabel).trim(),
    ctaHref: String(values.ctaHref).trim(),
    sortOrder: Number(values.sortOrder) || 0,
    isActive: Boolean(values.isActive),
    branch: String(values.branch).trim(),
    fields: formToFields(fieldValues, formDefs),
  });

  /**
   * Photos go up one at a time, after the row exists.
   *
   * Sequential on purpose: each upload re-saves the whole document, so two in
   * flight at once would race on the same Mixed `fields` bag and one slot would
   * silently win.
   */
  const uploadPending = async (id) => {
    const slots = Object.entries(pendingFiles).filter(([, file]) => file);
    for (const [slot, file] of slots) {
      // eslint-disable-next-line no-await-in-loop
      await uploadSiteItemImage(id, file, slot === "imageUrl" ? "" : slot);
    }
    return slots.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    const extraErrors = validateFieldValues(fieldValues, formDefs);
    setFormErrors(errors);
    setFieldErrors(extraErrors);
    setIsSubmit(true);
    if (Object.keys(errors).length || Object.keys(extraErrors).length) return;

    setSaving(true);
    try {
      const res = updateForm
        ? await updateSiteItem(selectedId, buildPayload())
        : await createSiteItem(buildPayload());

      if (!res.data.isOk) {
        toast.error(res.data.message || "Failed to save the row");
        return;
      }

      const id = res.data.data?._id || selectedId;
      if (id) {
        try {
          await uploadPending(id);
        } catch (uploadError) {
          console.error(uploadError);
          // The row itself saved; saying "failed" would be wrong and would
          // invite a second save that creates a duplicate.
          toast.warn(
            uploadError.response?.data?.message ||
              "The row saved, but a photo could not be uploaded",
          );
        }
      }

      toast.success(updateForm ? "Row Updated Successfully!" : "Row Added Successfully!");
      setActiveKey(buildPayload().collectionKey);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save the row");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Swaps a row with its neighbour and renumbers the list in tens.
   *
   * Only the rows whose number actually changed are written, so a normal move
   * is two requests rather than the whole list.
   */
  const handleMove = async (row, direction) => {
    const index = visibleRows.findIndex((r) => r._id === row._id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visibleRows.length) return;

    const reordered = visibleRows.map((r, i) => {
      if (i === index) return visibleRows[target];
      if (i === target) return visibleRows[index];
      return r;
    });
    const writes = reordered
      .map((r, i) => ({ id: r._id, from: r.sortOrder ?? 0, to: (i + 1) * ORDER_STEP }))
      .filter((w) => w.from !== w.to);

    setBusyId(row._id);
    try {
      for (const write of writes) {
        // eslint-disable-next-line no-await-in-loop
        await updateSiteItem(write.id, { sortOrder: write.to });
      }
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Could not reorder the list");
    } finally {
      setBusyId("");
    }
  };

  const handleToggleActive = async (row) => {
    setBusyId(row._id);
    try {
      const res = await updateSiteItem(row._id, {
        isActive: row.isActive === false,
      });
      if (!res.data.isOk) {
        toast.error(res.data.message || "Could not change the row");
        return;
      }
      toast.success(
        row.isActive === false
          ? `“${row.title}” is live on the website`
          : `“${row.title}” is hidden from the website`,
      );
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Could not change the row");
    } finally {
      setBusyId("");
    }
  };

  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemoveId(id);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteSiteItem(removeId);
      if (res.data.isOk) {
        toast.success("Row Deleted Successfully");
        fetchItems();
      } else {
        toast.error(res.data.message || "Failed to delete the row");
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

  const formOpen = showForm || updateForm;
  const slotCount = imageSlots(formDefs).length;

  return (
    <React.Fragment>
      <Card>
        <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
          <h5 className="card-title mb-0 flex-grow-1">
            {showForm
              ? `Add to ${collectionLabel(values.collectionKey || activeKey)}`
              : updateForm
                ? `Edit ${values.title || "row"}`
                : collectionLabel(activeKey)}
          </h5>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {!formOpen ? (
              <>
                <div
                  className="search-box mb-0"
                  style={{ position: "relative", minWidth: "180px" }}
                >
                  <Label htmlFor="itemSearch" className="visually-hidden">
                    Search website lists by title, subtitle or text
                  </Label>
                  <Input
                    id="itemSearch"
                    type="text"
                    className="form-control form-control-sm search"
                    placeholder="Search rows..."
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
                  onClick={fetchItems}
                  title="Reload lists"
                  aria-label="Reload lists"
                >
                  <i className="ri-refresh-line" aria-hidden="true"></i>
                </Button>

                {permissions.write && (
                  <Button
                    color="success"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    style={{ height: "30px" }}
                    onClick={() => handleOpenAdd()}
                  >
                    <i className="ri-add-line align-bottom" aria-hidden="true"></i>{" "}
                    Add Row
                  </Button>
                )}
              </>
            ) : (
              <Button color="dark" size="sm" onClick={resetForm}>
                &#8801; List
              </Button>
            )}
          </div>
        </CardHeader>

        <CardBody>
          {formOpen ? (
            <SiteItemForm
              values={values}
              fieldValues={fieldValues}
              defs={formDefs}
              fieldSpecs={fieldSpecs}
              collections={collections}
              branches={branches}
              formErrors={formErrors}
              fieldErrors={fieldErrors}
              fileErrors={fileErrors}
              pendingFiles={pendingFiles}
              isSubmit={isSubmit}
              disabled={saving}
              updateForm={updateForm}
              onField={handleField}
              onFieldValue={handleFieldValue}
              onFileChange={handleFileChange}
              onSubmit={handleSubmit}
            >
              <div className="mt-3 d-flex justify-content-end gap-2">
                <Button type="button" color="light" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" color="success" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : updateForm
                      ? "Update Row"
                      : slotCount
                        ? "Save Row & Photos"
                        : "Save Row"}
                </Button>
              </div>
            </SiteItemForm>
          ) : (
            <>
              {!lockedCollectionKey ? (
              <CollectionChips
                chips={chips}
                activeKey={activeKey}
                gridAvailable={gridAvailable}
                view={view}
                onSelect={setActiveKey}
                onViewChange={setView}
              />
              ) : gridAvailable ? (
                <div className="mb-3 d-flex gap-2">
                  <Button
                    color={view === "grid" ? "primary" : "light"}
                    size="sm"
                    type="button"
                    onClick={() => setView("grid")}
                  >
                    Timetable
                  </Button>
                  <Button
                    color={view === "list" ? "primary" : "light"}
                    size="sm"
                    type="button"
                    onClick={() => setView("list")}
                  >
                    List
                  </Button>
                </div>
              ) : null}

              {gridAvailable && view === "grid" ? (
                <ClassTimetable
                  rows={visibleRows}
                  permissions={permissions}
                  busyId={busyId}
                  onEdit={handleOpenEdit}
                  onAdd={handleOpenAdd}
                />
              ) : (
                <SiteItemList
                  rows={visibleRows}
                  defs={listDefs}
                  loading={loading}
                  permissions={permissions}
                  canReorder={!query.trim()}
                  busyId={busyId}
                  emptyLabel={collectionLabel(activeKey)}
                  onEdit={handleOpenEdit}
                  onDelete={tog_delete}
                  onMove={handleMove}
                  onToggleActive={handleToggleActive}
                />
              )}
            </>
          )}
        </CardBody>
      </Card>

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

SiteItemsManager.propTypes = {
  permissions: PropTypes.object.isRequired,
  lockedCollectionKey: PropTypes.string,
};

export default SiteItemsManager;

import { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Col, Form, FormGroup, Input, Label, Row } from "reactstrap";
import { fileUrl } from "@/utils/fileUrl";
import {
  baseLabel,
  collectionLabel,
  hasSpec,
  imageSlots,
} from "./itemSpecs";

/** The server's uploader accepts images only, up to 5 MB. */
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const humanSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * One photo: the stored reference (typed or uploaded) plus a file picker.
 *
 * The preview URL is derived ONCE per file and revoked on change. Calling
 * URL.createObjectURL() inline in JSX mints a new blob url on every render and
 * never releases the old one — the same leak that was fixed on the adverts
 * screen.
 */
const ImageField = ({
  id,
  label,
  hint,
  value,
  file,
  error,
  disabled,
  onUrlChange,
  onFileChange,
}) => {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview || fileUrl(value);

  return (
    <FormGroup className="mb-3">
      <Label htmlFor={id} className="form-label fw-bold">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      <div className="mt-2">
        <Label htmlFor={`${id}Upload`} className="form-label mb-1">
          Upload a photo for {label.toLowerCase()}
        </Label>
        <Input
          id={`${id}Upload`}
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={disabled}
          onChange={(e) => onFileChange(e.target.files?.[0] || null, e)}
        />
        <small className="text-muted d-block mt-1">
          {hint || "Paste a link, or upload a file to host it here."} JPG, PNG,
          GIF or WebP · max 5 MB.
        </small>
        {error ? <p className="text-danger small mt-1 mb-0">{error}</p> : null}
      </div>
      {shown ? (
        <div className="mt-2">
          <img
            src={shown}
            alt={`${label} preview`}
            className="img-thumbnail"
            style={{ maxWidth: "100%", width: 160, height: "auto" }}
          />
        </div>
      ) : null}
    </FormGroup>
  );
};

ImageField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  value: PropTypes.string,
  file: PropTypes.object,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  onUrlChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
};

/**
 * The editor for one row of one list.
 *
 * The fixed half (title, subtitle, body, photo, button, order, branch) is the
 * SiteItem schema and is the same for every list — only its wording changes.
 * The variable half is rendered from `defs`, which the caller derives from the
 * `fieldSpecs` the list endpoint returned: a price input exists because the
 * server said `plans.price` exists, not because this file knows about pricing.
 */
const SiteItemForm = ({
  values,
  fieldValues,
  defs,
  fieldSpecs,
  collections,
  branches,
  formErrors,
  fieldErrors,
  fileErrors,
  pendingFiles,
  isSubmit,
  disabled,
  updateForm,
  onField,
  onFieldValue,
  onFileChange,
  onSubmit,
  children,
}) => {
  const key = values.collectionKey;
  const slots = imageSlots(defs);
  const knownCollection = hasSpec(fieldSpecs, key);

  const err = (name) => (isSubmit && formErrors[name] ? formErrors[name] : "");

  return (
    <Form onSubmit={onSubmit}>
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemCollectionKey" className="form-label fw-bold">
              List <span className="text-danger">*</span>
            </Label>
            <Input
              id="itemCollectionKey"
              type="select"
              value={key}
              disabled={disabled}
              onChange={(e) => onField("collectionKey", e.target.value)}
            >
              {collections.map((c) => (
                <option key={c} value={c}>
                  {collectionLabel(c)}
                </option>
              ))}
              {/* A row already sitting in a list the server did not report must
                  stay editable rather than silently move on the next save. */}
              {key && !collections.includes(key) ? (
                <option value={key}>{key}</option>
              ) : null}
            </Input>
            <small className="text-muted">
              Moving a row to another list re-checks its extra fields against
              that list.
            </small>
            {err("collectionKey") ? (
              <p className="text-danger small mt-1 mb-0">
                {err("collectionKey")}
              </p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemTitle" className="form-label fw-bold">
              {baseLabel(key, "title")} <span className="text-danger">*</span>
            </Label>
            <Input
              id="itemTitle"
              value={values.title}
              disabled={disabled}
              onChange={(e) => onField("title", e.target.value)}
            />
            {err("title") ? (
              <p className="text-danger small mt-1 mb-0">{err("title")}</p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemSubtitle" className="form-label fw-bold">
              {baseLabel(key, "subtitle")}
            </Label>
            <Input
              id="itemSubtitle"
              value={values.subtitle}
              disabled={disabled}
              onChange={(e) => onField("subtitle", e.target.value)}
            />
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemBranch" className="form-label fw-bold">
              Branch tag
            </Label>
            <Input
              id="itemBranch"
              type="select"
              value={values.branch}
              disabled={disabled}
              onChange={(e) => onField("branch", e.target.value)}
            >
              <option value="">Shows at every branch</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              {values.branch && !branches.includes(values.branch) ? (
                <option value={values.branch}>{values.branch}</option>
              ) : null}
            </Input>
            <small className="text-muted">
              Only for a row that runs at one branch. Leave it on “every branch”
              unless it genuinely does not.
            </small>
          </FormGroup>
        </Col>

        <Col md={12}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemBody" className="form-label fw-bold">
              {baseLabel(key, "body")}
            </Label>
            <Input
              id="itemBody"
              type="textarea"
              rows="4"
              value={values.body}
              disabled={disabled}
              onChange={(e) => onField("body", e.target.value)}
            />
          </FormGroup>
        </Col>

        {/* ---- the spec-driven half ---- */}
        {defs.length ? (
          <Col md={12}>
            <h6 className="text-uppercase text-muted fw-semibold mb-2">
              {collectionLabel(key)} details
            </h6>
          </Col>
        ) : null}

        {defs
          .filter((def) => def.type !== "image")
          .map((def) => {
            const id = `itemField_${def.key}`;
            const error = isSubmit ? fieldErrors[def.key] : "";
            const value = fieldValues[def.key];

            if (def.type === "boolean") {
              return (
                <Col md={6} key={def.key}>
                  <FormGroup className="form-check mb-3 mt-md-4">
                    <Input
                      type="checkbox"
                      className="form-check-input"
                      id={id}
                      checked={value === true}
                      disabled={disabled}
                      onChange={(e) => onFieldValue(def.key, e.target.checked)}
                    />
                    <Label
                      className="form-check-label ms-1 fw-semibold"
                      htmlFor={id}
                    >
                      {def.label}
                    </Label>
                  </FormGroup>
                </Col>
              );
            }

            if (def.type === "string[]") {
              return (
                <Col md={6} key={def.key}>
                  <FormGroup className="mb-3">
                    <Label htmlFor={id} className="form-label fw-bold">
                      {def.label}
                      {def.required ? (
                        <span className="text-danger"> *</span>
                      ) : null}
                    </Label>
                    <Input
                      id={id}
                      type="textarea"
                      rows="4"
                      value={value}
                      disabled={disabled}
                      onChange={(e) => onFieldValue(def.key, e.target.value)}
                    />
                    <small className="text-muted">
                      One per line. A line may contain commas.
                    </small>
                    {error ? (
                      <p className="text-danger small mt-1 mb-0">{error}</p>
                    ) : null}
                  </FormGroup>
                </Col>
              );
            }

            return (
              <Col md={6} key={def.key}>
                <FormGroup className="mb-3">
                  <Label htmlFor={id} className="form-label fw-bold">
                    {def.label}
                    {def.required ? (
                      <span className="text-danger"> *</span>
                    ) : null}
                  </Label>
                  <Input
                    id={id}
                    /* `plans.price` is a STRING on purpose ("₹1,200"), so a
                       number input would strip the symbol and the grouping the
                       site prints verbatim. Only a spec-declared number gets
                       one. */
                    type={def.type === "number" ? "number" : "text"}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onFieldValue(def.key, e.target.value)}
                  />
                  {def.type === "number" ? (
                    <small className="text-muted">
                      Leave it empty to remove it — an empty box is not zero.
                    </small>
                  ) : null}
                  {error ? (
                    <p className="text-danger small mt-1 mb-0">{error}</p>
                  ) : null}
                </FormGroup>
              </Col>
            );
          })}

        {!knownCollection ? (
          <Col md={12}>
            <p className="text-muted small">
              This list has no published field contract, so its extra fields are
              shown exactly as they are stored.
            </p>
          </Col>
        ) : null}

        {/* ---- photos ---- */}
        <Col md={6}>
          <ImageField
            id="itemImageUrl"
            label="Photo"
            hint={
              slots.length
                ? "This list uses the photos below; the main photo can stay empty."
                : ""
            }
            value={values.imageUrl}
            file={pendingFiles.imageUrl}
            error={fileErrors.imageUrl}
            disabled={disabled}
            onUrlChange={(v) => onField("imageUrl", v)}
            onFileChange={(file, e) => onFileChange("imageUrl", file, e)}
          />
        </Col>

        {slots.map((slot) => (
          <Col md={6} key={slot.key}>
            <ImageField
              id={`itemField_${slot.key}`}
              label={slot.label}
              value={fieldValues[slot.key] || ""}
              file={pendingFiles[slot.key]}
              error={fileErrors[slot.key]}
              disabled={disabled}
              onUrlChange={(v) => onFieldValue(slot.key, v)}
              onFileChange={(file, e) => onFileChange(slot.key, file, e)}
            />
          </Col>
        ))}

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemCtaLabel" className="form-label fw-bold">
              Button label
            </Label>
            <Input
              id="itemCtaLabel"
              value={values.ctaLabel}
              disabled={disabled}
              onChange={(e) => onField("ctaLabel", e.target.value)}
            />
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemCtaHref" className="form-label fw-bold">
              Button link
            </Label>
            <Input
              id="itemCtaHref"
              value={values.ctaHref}
              disabled={disabled}
              onChange={(e) => onField("ctaHref", e.target.value)}
            />
            {err("ctaHref") ? (
              <p className="text-danger small mt-1 mb-0">{err("ctaHref")}</p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="itemSortOrder" className="form-label fw-bold">
              Sort order
            </Label>
            <Input
              id="itemSortOrder"
              type="number"
              value={values.sortOrder}
              disabled={disabled}
              onChange={(e) => onField("sortOrder", e.target.value)}
            />
            <small className="text-muted">
              Lower numbers come first. The list is numbered in tens so a new
              row fits between two others without renumbering.
            </small>
          </FormGroup>
        </Col>

        <Col md={6} className="d-flex align-items-center">
          <FormGroup className="form-check mb-0 mt-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="itemIsActive"
              checked={values.isActive}
              disabled={disabled}
              onChange={(e) => onField("isActive", e.target.checked)}
            />
            <Label
              className="form-check-label ms-1 fw-semibold"
              htmlFor="itemIsActive"
            >
              Published on the website
            </Label>
          </FormGroup>
        </Col>
      </Row>

      {!updateForm ? (
        <p className="text-muted small mb-0">
          A photo you pick now is uploaded straight after the row is saved.
        </p>
      ) : null}

      {children}
    </Form>
  );
};

SiteItemForm.propTypes = {
  values: PropTypes.object.isRequired,
  fieldValues: PropTypes.object.isRequired,
  defs: PropTypes.array.isRequired,
  fieldSpecs: PropTypes.object.isRequired,
  collections: PropTypes.array.isRequired,
  branches: PropTypes.array.isRequired,
  formErrors: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object.isRequired,
  fileErrors: PropTypes.object.isRequired,
  pendingFiles: PropTypes.object.isRequired,
  isSubmit: PropTypes.bool,
  disabled: PropTypes.bool,
  updateForm: PropTypes.bool,
  onField: PropTypes.func.isRequired,
  onFieldValue: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default SiteItemForm;

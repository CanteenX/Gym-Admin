import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Col, FormGroup, Input, Label, Row } from "reactstrap";
import IconPicker from "../../../Components/Common/IconPicker";
import { fileUrl } from "@/utils/fileUrl";
import CharacterCounter from "./CharacterCounter";
import KeywordInput from "./KeywordInput";
import {
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
  absoluteUrlFor,
  canonicalPointsElsewhere,
  canonicalProblem,
} from "./seoRules";

export const CATEGORIES = ["Marketing", "Portal", "Other"];

const OG_TYPES = [
  { value: "website", label: "Website (default)" },
  { value: "article", label: "Article" },
  { value: "profile", label: "Profile" },
];

/**
 * The editor pane. Presentational: every value comes from SeoManager, which
 * owns the row, so the previews beside it and the fields here can never show
 * different text.
 *
 * Field ids are part of the contract with SeoScorePanel - a rule names the id
 * of the control that would fix it, and clicking the rule focuses that id. If
 * you rename an id here, rename its `targetId` in seoRules.js too.
 */
// Defaults live in the signature, not in SeoEditor.defaultProps: React 18.3
// console.errors on defaultProps for a function component, and the browser gate
// treats any console.error as a fatal page error.
const SeoEditor = ({
  values,
  onField,
  formErrors = {},
  isSubmit = false,
  disabled = false,
}) => {
  const [showHiddenExtras, setShowHiddenExtras] = useState(false);
  const ownUrl = absoluteUrlFor(values.slug);
  const canonicalError = canonicalProblem(values.canonicalUrl);
  const canonicalElsewhere = canonicalPointsElsewhere(
    values.canonicalUrl,
    values.slug,
  );
  const hidden = values.noIndex === true;
  // A hidden page needs a tab title and nothing else; the rest is noise unless
  // it is asked for. It is revealed rather than removed because a row can be
  // flipped back to indexable and the old values must still be editable.
  const showSearchExtras = !hidden || showHiddenExtras;

  return (
    <>
      <h6 className="text-uppercase text-muted fw-semibold mb-2">Page</h6>
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="seoSlug" className="form-label fw-bold">
              Route <span className="text-danger">*</span>
            </Label>
            <Input
              id="seoSlug"
              name="slug"
              value={values.slug}
              disabled={disabled}
              aria-describedby="seoSlug-help"
              onChange={(e) => onField("slug", e.target.value)}
            />
            <small id="seoSlug-help" className="text-muted">
              The path on the public site, starting with a slash - <code>/</code>{" "}
              for the home page, <code>/programs</code> for programs. This is how
              the site finds the row, so changing it moves the SEO to a different
              page.
            </small>
            {isSubmit && formErrors.slug ? (
              <p className="text-danger small mt-1 mb-0">{formErrors.slug}</p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="seoPageTitle" className="form-label fw-bold">
              Page name <span className="text-danger">*</span>
            </Label>
            <Input
              id="seoPageTitle"
              name="pageTitle"
              value={values.pageTitle}
              disabled={disabled}
              aria-describedby="seoPageTitle-help"
              onChange={(e) => onField("pageTitle", e.target.value)}
            />
            <small id="seoPageTitle-help" className="text-muted">
              Label for this list only - visitors never see it.
            </small>
            {isSubmit && formErrors.pageTitle ? (
              <p className="text-danger small mt-1 mb-0">
                {formErrors.pageTitle}
              </p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="seoCategory" className="form-label fw-bold">
              Category
            </Label>
            <Input
              id="seoCategory"
              type="select"
              name="category"
              value={values.category}
              disabled={disabled}
              onChange={(e) => onField("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {/* A row saved with an unknown category must stay editable. */}
              {values.category && !CATEGORIES.includes(values.category) ? (
                <option value={values.category}>{values.category}</option>
              ) : null}
            </Input>
          </FormGroup>
        </Col>

        <Col md={6}>
          {/* Wrapper id so a score rule can jump here - the picker is a
              dropdown button, not an input, so it has no id of its own. */}
          <div id="seoIconField">
            <IconPicker
              label="Icon"
              value={values.icon || ""}
              onChange={(icon) => onField("icon", icon)}
            />
          </div>
        </Col>

        <Col md={6}>
          <FormGroup className="form-check form-switch mb-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="seoNoIndex"
              name="noIndex"
              role="switch"
              checked={Boolean(values.noIndex)}
              disabled={disabled}
              onChange={(e) => onField("noIndex", e.target.checked)}
            />
            <Label className="form-check-label fw-semibold" htmlFor="seoNoIndex">
              Hide this page from search engines
            </Label>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="form-check form-switch mb-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="seoIsActive"
              name="isActive"
              role="switch"
              checked={Boolean(values.isActive)}
              disabled={disabled}
              onChange={(e) => onField("isActive", e.target.checked)}
            />
            <Label className="form-check-label fw-semibold" htmlFor="seoIsActive">
              In use on the site
            </Label>
          </FormGroup>
        </Col>
      </Row>

      {hidden ? (
        <div className="alert alert-warning d-flex align-items-start gap-2">
          <i className="ri-eye-off-line fs-5" aria-hidden="true"></i>
          <div>
            <strong>Hidden from search engines.</strong> This page is excluded
            from the sitemap and sends <code>noindex</code> to crawlers - correct
            for anything behind the member login. Only the browser tab title
            below still matters.
            <div className="mt-2">
              <Button
                type="button"
                color="light"
                size="sm"
                onClick={() => setShowHiddenExtras((prev) => !prev)}
              >
                {showHiddenExtras
                  ? "Hide the search fields"
                  : "Show the search fields anyway"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <h6 className="text-uppercase text-muted fw-semibold mb-2">
        Search appearance
      </h6>
      <Row>
        <Col md={12}>
          <FormGroup className="mb-3">
            <Label htmlFor="seoMetaTitle" className="form-label fw-bold">
              {hidden ? "Browser tab title" : "Meta title"}
            </Label>
            <Input
              id="seoMetaTitle"
              name="metaTitle"
              value={values.metaTitle}
              disabled={disabled}
              aria-describedby="seoMetaTitle-counter"
              onChange={(e) => onField("metaTitle", e.target.value)}
            />
            <CharacterCounter
              inputId="seoMetaTitle"
              value={values.metaTitle}
              limit={TITLE_LIMIT}
            />
          </FormGroup>
        </Col>

        {showSearchExtras ? (
          <>
            <Col md={12}>
              <FormGroup className="mb-3">
                <Label
                  htmlFor="seoMetaDescription"
                  className="form-label fw-bold"
                >
                  Meta description
                </Label>
                <Input
                  id="seoMetaDescription"
                  type="textarea"
                  rows="3"
                  name="metaDescription"
                  value={values.metaDescription}
                  disabled={disabled}
                  aria-describedby="seoMetaDescription-counter"
                  onChange={(e) => onField("metaDescription", e.target.value)}
                />
                <CharacterCounter
                  inputId="seoMetaDescription"
                  value={values.metaDescription}
                  limit={DESCRIPTION_LIMIT}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <KeywordInput
                  inputId="seoKeywordInput"
                  keywords={values.keywords}
                  disabled={disabled}
                  onChange={(keywords) => onField("keywords", keywords)}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <Label htmlFor="seoCanonicalUrl" className="form-label fw-bold">
                  Canonical URL
                </Label>
                <div className="d-flex gap-2 flex-wrap">
                  <Input
                    id="seoCanonicalUrl"
                    name="canonicalUrl"
                    className="flex-grow-1"
                    style={{ minWidth: "180px" }}
                    value={values.canonicalUrl}
                    disabled={disabled}
                    invalid={Boolean(canonicalError)}
                    aria-describedby="seoCanonicalUrl-help"
                    onChange={(e) => onField("canonicalUrl", e.target.value)}
                  />
                  <Button
                    type="button"
                    color="light"
                    disabled={disabled || !ownUrl}
                    onClick={() => onField("canonicalUrl", ownUrl)}
                  >
                    Use this page
                  </Button>
                </div>
                <small id="seoCanonicalUrl-help" className="text-muted">
                  The one true address for this page. Defaults to{" "}
                  <span className="text-break">{ownUrl || "its own URL"}</span>.
                </small>
                {canonicalError ? (
                  <p className="text-danger small mt-1 mb-0">
                    {canonicalError}
                  </p>
                ) : null}
                {!canonicalError && canonicalElsewhere ? (
                  <p className="text-warning small mt-1 mb-0">
                    This points at a different page, which tells Google to rank
                    that one instead. Correct only if this page is a duplicate.
                  </p>
                ) : null}
                {isSubmit && formErrors.canonicalUrl ? (
                  <p className="text-danger small mt-1 mb-0">
                    {formErrors.canonicalUrl}
                  </p>
                ) : null}
              </FormGroup>
            </Col>
          </>
        ) : null}
      </Row>

      {showSearchExtras ? (
        <>
          <h6 className="text-uppercase text-muted fw-semibold mb-2">
            Social sharing
          </h6>
          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <Label htmlFor="seoOgTitle" className="form-label fw-bold">
                  Social title
                </Label>
                <Input
                  id="seoOgTitle"
                  name="ogTitle"
                  value={values.ogTitle}
                  disabled={disabled}
                  aria-describedby="seoOgTitle-help"
                  onChange={(e) => onField("ogTitle", e.target.value)}
                />
                <small id="seoOgTitle-help" className="text-muted">
                  Leave blank to reuse the meta title.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <Label htmlFor="seoOgType" className="form-label fw-bold">
                  Social type
                </Label>
                <Input
                  id="seoOgType"
                  type="select"
                  name="ogType"
                  value={values.ogType}
                  disabled={disabled}
                  onChange={(e) => onField("ogType", e.target.value)}
                >
                  {OG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <Label
                  htmlFor="seoOgDescription"
                  className="form-label fw-bold"
                >
                  Social description
                </Label>
                <Input
                  id="seoOgDescription"
                  type="textarea"
                  rows="2"
                  name="ogDescription"
                  value={values.ogDescription}
                  disabled={disabled}
                  aria-describedby="seoOgDescription-help"
                  onChange={(e) => onField("ogDescription", e.target.value)}
                />
                <small id="seoOgDescription-help" className="text-muted">
                  Leave blank to reuse the meta description.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <Label htmlFor="seoOgImage" className="form-label fw-bold">
                  Social image URL
                </Label>
                <Input
                  id="seoOgImage"
                  name="ogImage"
                  value={values.ogImage}
                  disabled={disabled}
                  aria-describedby="seoOgImage-help"
                  onChange={(e) => onField("ogImage", e.target.value)}
                />
                <small id="seoOgImage-help" className="text-muted">
                  Paste a link, or upload the image on the Adverts screen and
                  paste the path it gives you. 1200x630 renders best.
                </small>
                {values.ogImage ? (
                  <div className="mt-2">
                    <img
                      src={fileUrl(values.ogImage)}
                      alt="Social share image"
                      className="img-thumbnail"
                      style={{ maxWidth: "100%", width: 180, height: "auto" }}
                    />
                  </div>
                ) : null}
              </FormGroup>
            </Col>
          </Row>
        </>
      ) : null}
    </>
  );
};

SeoEditor.propTypes = {
  values: PropTypes.object.isRequired,
  onField: PropTypes.func.isRequired,
  formErrors: PropTypes.object,
  isSubmit: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default SeoEditor;

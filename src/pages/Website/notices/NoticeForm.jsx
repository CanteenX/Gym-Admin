import PropTypes from "prop-types";
import { Button, Col, Form, FormGroup, Input, Label, Row } from "reactstrap";
import ImageField from "../ImageField";
import { noticeLiveState } from "./noticeLiveState";
import {
  PLACEMENTS,
  TONES,
  formatWhen,
  scheduleNotes,
} from "./noticeConfig";

/**
 * The editor for one announcement or one banner.
 *
 * KIND-CONDITIONAL FIELDS come from `config` rather than from an `if (kind ===
 * ...)` in the markup, so the rule lives in noticeConfig.js next to the comment
 * explaining it. The three that differ:
 *
 *   placement    BANNER only. An announcement is site-wide.
 *   image        BANNER only. An announcement is a sentence; the server 400s an
 *                upload against one rather than quietly taking the file.
 *   dismissible  ANNOUNCEMENT only. A banner is part of the page, and the
 *                server forces the stored value to false regardless.
 *
 * THE DATES GET MORE ROOM THAN THEIR IMPORTANCE SUGGESTS, deliberately. They
 * are the field pair that produced the incident this screen exists to prevent,
 * so: the end date says what leaving it empty means IN ITS OWN LABEL rather
 * than in the small print underneath, an already-past window is stated in
 * plain words instead of leaving somebody to go hunting on the website, and a
 * live-state preview says what these settings will actually produce before
 * anything is saved.
 */

/** A control's error, only once the editor has actually tried to save. */
const errorFor = (isSubmit, formErrors, name) =>
  isSubmit && formErrors[name] ? formErrors[name] : "";

const NoticeForm = ({
  config,
  values,
  formErrors,
  isSubmit,
  imageFile,
  imageError,
  savedStatus,
  updateForm,
  saving,
  onField,
  onCheck,
  onImageUrl,
  onImageFile,
  onSubmit,
  onCancel,
}) => {
  const notes = scheduleNotes(values);

  /**
   * What these settings produce, said before the save rather than after it.
   * Built from the form values - there is no saved row to ask the server about
   * yet - which is the fallback path noticeLiveState documents.
   */
  const preview = noticeLiveState({
    isActive: values.isActive,
    startAt: values.startAt,
    endAt: values.endAt,
  });

  /**
   * A row that was ALREADY expired when it was opened, and still is as edited.
   *
   * SHOWN AT THE TOP, in the loudest style the panel has, because the
   * alternative - which is what actually happened - is somebody opening a
   * notice that looks perfectly fine and never learning that the website
   * stopped showing it days ago.
   *
   * IT ANSWERS A DIFFERENT QUESTION FROM THE INLINE NOTE beside the date
   * fields: this one is "what you walked in on", that one is "what the date you
   * are typing will do", and it carries the concrete date and the fix. So this
   * banner names no date of its own - a date read out of a field the editor is
   * currently changing goes stale mid-sentence.
   *
   * GATED ON THE LIVE VALUES TOO (`hasPastWindow`), so the moment the end date
   * is cleared or pushed out both disappear together. A banner still shouting
   * "expired" over a form that has just been fixed is the same failure in the
   * other direction: the screen disagreeing with what the site will do.
   */
  const hasPastWindow = notes.some((note) => note.id === "past");
  const openedExpired = updateForm && savedStatus === "EXPIRED" && hasPastWindow;

  return (
    <Form onSubmit={onSubmit}>
      {openedExpired ? (
        <div className="alert alert-danger d-flex align-items-start gap-2">
          <i className="ri-calendar-close-line fs-5" aria-hidden="true"></i>
          <div>
            <strong>This {config.singular.toLowerCase()} has expired.</strong>{" "}
            Its end date
            {formatWhen(values.endAt) ? ` (${formatWhen(values.endAt)})` : ""} has
            passed, so it is no longer showing on the website. Clear the end date
            below to run it until you switch it off, or set a later one.
          </div>
        </div>
      ) : null}

      <p className="text-muted">{config.intro}</p>

      <Row>
        <Col md={config.hasPlacement ? 6 : 12}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeTitle" className="form-label fw-bold">
              Title <span className="text-danger">*</span>
            </Label>
            <Input
              id="noticeTitle"
              name="title"
              value={values.title}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">{config.titleHint}</small>
            {errorFor(isSubmit, formErrors, "title") ? (
              <p className="text-danger small mt-1 mb-0">{formErrors.title}</p>
            ) : null}
          </FormGroup>
        </Col>

        {config.hasPlacement ? (
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="noticePlacement" className="form-label fw-bold">
                Where it appears <span className="text-danger">*</span>
              </Label>
              <Input
                id="noticePlacement"
                type="select"
                name="placement"
                value={values.placement}
                onChange={onField}
              >
                <option value="">Choose a slot...</option>
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Input>
              <small className="text-muted d-block mt-1">
                The page and the slot on it this banner fills.
              </small>
              {errorFor(isSubmit, formErrors, "placement") ? (
                <p className="text-danger small mt-1 mb-0">
                  {formErrors.placement}
                </p>
              ) : null}
            </FormGroup>
          </Col>
        ) : null}

        <Col md={12}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeBody" className="form-label fw-bold">
              {config.bodyLabel}{" "}
              {config.bodyRequired ? <span className="text-danger">*</span> : null}
            </Label>
            <Input
              id="noticeBody"
              type="textarea"
              rows={3}
              name="body"
              value={values.body}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">{config.bodyHint}</small>
            {errorFor(isSubmit, formErrors, "body") ? (
              <p className="text-danger small mt-1 mb-0">{formErrors.body}</p>
            ) : null}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeTone" className="form-label fw-bold">
              Tone
            </Label>
            <Input
              id="noticeTone"
              type="select"
              name="tone"
              value={values.tone}
              onChange={onField}
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Input>
            <small className="text-muted d-block mt-1">
              The colour it is drawn in. These are severities, not moods - keep
              Urgent for something that genuinely must not be missed.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeSortOrder" className="form-label fw-bold">
              Sort order
            </Label>
            <Input
              id="noticeSortOrder"
              type="number"
              name="sortOrder"
              value={values.sortOrder}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">
              Order when more than one is showing at once. Lower comes first.
            </small>
          </FormGroup>
        </Col>

        {config.hasImage ? (
          <Col md={12}>
            {/* The shared CMS picker: a free-text reference AND a file picker,
                never one instead of the other, so an external CDN link and a
                fresh upload are both valid values for the same field. The file
                itself is sent on a SECOND request after the row exists - see
                api/siteNotices.api.jsx for why that is a permission decision. */}
            <ImageField
              id="noticeImage"
              label="Banner image"
              hint="Optional - a text-and-button banner on a colour block is a perfectly good banner."
              placeholder="https://... or uploads/cms/notices/..."
              value={values.imageUrl}
              file={imageFile}
              error={imageError}
              onUrlChange={onImageUrl}
              onFileChange={onImageFile}
            />
          </Col>
        ) : null}

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeCtaLabel" className="form-label fw-bold">
              Button text
            </Label>
            <Input
              id="noticeCtaLabel"
              name="ctaLabel"
              value={values.ctaLabel}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">
              The words on the button, e.g. Claim the offer.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeCtaUrl" className="form-label fw-bold">
              Button link
            </Label>
            <Input
              id="noticeCtaUrl"
              name="ctaUrl"
              value={values.ctaUrl}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">{config.ctaHint}</small>
          </FormGroup>
        </Col>

        {/* ---------------------------- THE SCHEDULE ---------------------- */}
        <Col md={12}>
          <h6 className="text-uppercase text-muted fw-semibold mt-2 mb-2">
            When it shows
          </h6>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="noticeStartAt" className="form-label fw-bold">
              Starts - leave empty to start straight away
            </Label>
            <Input
              id="noticeStartAt"
              type="datetime-local"
              name="startAt"
              value={values.startAt}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">
              Before this moment nothing is shown on the website.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            {/* The sentence is IN THE LABEL, not in the hint below it. An empty
                end date is the safe, usual choice and the one the owner
                actually wanted; it has to be readable without reading the small
                print. */}
            <Label htmlFor="noticeEndAt" className="form-label fw-bold">
              Ends - leave empty to run until you switch it off
            </Label>
            <Input
              id="noticeEndAt"
              type="datetime-local"
              name="endAt"
              value={values.endAt}
              onChange={onField}
            />
            <small className="text-muted d-block mt-1">
              After this moment it stops showing by itself. There is no warning
              on the website when that happens.
            </small>
            {errorFor(isSubmit, formErrors, "endAt") ? (
              <p className="text-danger small mt-1 mb-0">{formErrors.endAt}</p>
            ) : null}
          </FormGroup>
        </Col>

        {notes.length ? (
          <Col md={12}>
            {notes.map((note) => (
              <div
                key={note.id}
                className={`alert alert-${note.color} d-flex align-items-start gap-2 py-2`}
              >
                <i className={`${note.icon} fs-5`} aria-hidden="true"></i>
                <span>{note.text}</span>
              </div>
            ))}
          </Col>
        ) : null}

        <Col md={6} className="d-flex align-items-center">
          <FormGroup className="form-check mb-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="noticeIsActive"
              name="isActive"
              checked={values.isActive}
              onChange={onCheck}
            />
            <Label
              className="form-check-label ms-1 fw-semibold"
              htmlFor="noticeIsActive"
            >
              Active - the switch that is independent of the dates
            </Label>
          </FormGroup>
        </Col>

        {config.hasDismissible ? (
          <Col md={6} className="d-flex align-items-center">
            <FormGroup className="form-check mb-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="noticeDismissible"
                name="dismissible"
                checked={values.dismissible}
                onChange={onCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="noticeDismissible"
              >
                Members can close this
              </Label>
            </FormGroup>
          </Col>
        ) : null}

        <Col md={12}>
          {/* Ticking Active is NOT the same as being visible, and that gap is
              the whole misunderstanding. Say which of the two these settings
              actually produce, before the save. */}
          <div className="alert alert-light border d-flex align-items-center gap-2 flex-wrap mb-0">
            <span
              className={`badge ${preview.badgeClass} d-inline-flex align-items-center gap-1`}
            >
              <i className={preview.icon} aria-hidden="true"></i> {preview.label}
            </span>
            <span className="small text-muted">
              With these settings: {preview.hint}
            </span>
          </div>
        </Col>
      </Row>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <Button type="button" color="light" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="success" disabled={saving}>
          {saving
            ? "Saving..."
            : `${updateForm ? "Update" : "Save"} ${config.singular}`}
        </Button>
      </div>
    </Form>
  );
};

NoticeForm.propTypes = {
  config: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  formErrors: PropTypes.object.isRequired,
  isSubmit: PropTypes.bool,
  imageFile: PropTypes.object,
  imageError: PropTypes.string,
  savedStatus: PropTypes.string,
  updateForm: PropTypes.bool,
  saving: PropTypes.bool,
  onField: PropTypes.func.isRequired,
  onCheck: PropTypes.func.isRequired,
  onImageUrl: PropTypes.func.isRequired,
  onImageFile: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default NoticeForm;

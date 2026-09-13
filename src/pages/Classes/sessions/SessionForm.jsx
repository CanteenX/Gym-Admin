import React from "react";
import PropTypes from "prop-types";
import { Button, Col, Form, FormGroup, Input, Label, Row } from "reactstrap";
import { capacityState, formatDateTime } from "../classesFormat";

/**
 * Create / edit one class.
 *
 * Mirrors the server's validation rather than inventing its own, so the form
 * refuses what the API would refuse and says the same thing. The ceilings come
 * from models/ClassSession.js (MAX_CAPACITY / MAX_DURATION_MINUTES) and are
 * named here rather than typed inline at the three places they are used.
 */
export const MAX_CAPACITY = 500;
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 480;

export const emptySession = {
  title: "",
  description: "",
  notes: "",
  branch: "",
  trainer: "",
  start: "",
  durationMinutes: 60,
  capacity: 20,
  allowGuests: true,
  isActive: true,
};

/**
 * @param {object} values - the form state
 * @param {object|null} editing - the row being edited, or null on create
 * @returns {object} field -> message
 */
export const validateSession = (values, editing) => {
  const errors = {};

  if (!String(values.title || "").trim()) {
    errors.title = "Title is required!";
  }
  if (!String(values.branch || "").trim()) {
    errors.branch = "Branch is required!";
  }
  if (!String(values.start || "").trim()) {
    errors.start = "Start date and time is required!";
  } else if (Number.isNaN(new Date(values.start).getTime())) {
    errors.start = "Start must be a valid date and time";
  }

  const capacity = Number(values.capacity);
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
    errors.capacity = `Capacity must be between 1 and ${MAX_CAPACITY}`;
  } else if (editing && capacity < (Number(editing.bookedCount) || 0)) {
    /**
     * The server refuses this, and the reason is worth repeating in the UI:
     * leaving bookedCount above capacity puts somebody who already holds a
     * confirmed place over the line, and nothing tells them. The bookings have
     * to be cancelled first, by a human who then speaks to the people affected.
     */
    errors.capacity =
      `${editing.bookedCount} place(s) are already booked. Cancel those ` +
      `bookings on the roster first, then lower the capacity.`;
  }

  const duration = Number(values.durationMinutes);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_DURATION_MINUTES ||
    duration > MAX_DURATION_MINUTES
  ) {
    errors.durationMinutes = `Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`;
  }

  return errors;
};

const SessionForm = ({
  values,
  errors,
  isSubmit,
  editing,
  branches,
  trainers,
  saving,
  onChange,
  onCheck,
  onSubmit,
  onCancel,
}) => {
  const seats = editing ? capacityState(editing) : null;

  return (
    <Form onSubmit={onSubmit}>
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classTitle" className="form-label fw-bold">
              Title <span className="text-danger">*</span>
            </Label>
            <Input
              id="classTitle"
              name="title"
              value={values.title}
              onChange={onChange}
            />
            <small className="text-muted">
              What a visitor sees on the timetable, e.g. Morning Zumba.
            </small>
            {isSubmit && errors.title && (
              <p className="text-danger small mt-1 mb-0">{errors.title}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classBranch" className="form-label fw-bold">
              Branch <span className="text-danger">*</span>
            </Label>
            <Input
              id="classBranch"
              type="select"
              name="branch"
              value={values.branch}
              onChange={onChange}
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b._id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
              {/* Keep an unlisted branch selectable rather than silently
                  blanking it: the list may have failed to load, or that branch
                  may since have been deactivated. */}
              {values.branch &&
                !branches.some((b) => b.name === values.branch) && (
                  <option value={values.branch}>{values.branch}</option>
                )}
            </Input>
            <small className="text-muted">
              A branch admin&apos;s own branch is applied by the server whatever
              is chosen here — a class belongs to whoever unlocks the door.
            </small>
            {isSubmit && errors.branch && (
              <p className="text-danger small mt-1 mb-0">{errors.branch}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classStart" className="form-label fw-bold">
              Starts <span className="text-danger">*</span>
            </Label>
            <Input
              id="classStart"
              type="datetime-local"
              name="start"
              value={values.start}
              onChange={onChange}
            />
            <small className="text-muted">
              Local time. Only classes that have not started yet can be booked.
            </small>
            {isSubmit && errors.start && (
              <p className="text-danger small mt-1 mb-0">{errors.start}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={3}>
          <FormGroup className="mb-3">
            <Label htmlFor="classDuration" className="form-label fw-bold">
              Duration (minutes)
            </Label>
            <Input
              id="classDuration"
              type="number"
              name="durationMinutes"
              min={MIN_DURATION_MINUTES}
              max={MAX_DURATION_MINUTES}
              value={values.durationMinutes}
              onChange={onChange}
            />
            {isSubmit && errors.durationMinutes && (
              <p className="text-danger small mt-1 mb-0">
                {errors.durationMinutes}
              </p>
            )}
          </FormGroup>
        </Col>

        <Col md={3}>
          <FormGroup className="mb-3">
            <Label htmlFor="classCapacity" className="form-label fw-bold">
              Capacity <span className="text-danger">*</span>
            </Label>
            <Input
              id="classCapacity"
              type="number"
              name="capacity"
              min={1}
              max={MAX_CAPACITY}
              value={values.capacity}
              onChange={onChange}
            />
            {seats ? (
              <small className="text-muted d-block mt-1">
                {seats.booked} place(s) already booked
              </small>
            ) : null}
            {isSubmit && errors.capacity && (
              <p className="text-danger small mt-1 mb-0">{errors.capacity}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classTrainer" className="form-label fw-bold">
              Trainer
            </Label>
            <Input
              id="classTrainer"
              type="select"
              name="trainer"
              value={values.trainer}
              onChange={onChange}
            >
              <option value="">Not assigned yet</option>
              {trainers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName}
                  {t.branch ? ` — ${t.branch}` : ""}
                </option>
              ))}
            </Input>
            <small className="text-muted">
              A slot with no trainer is still bookable; classes are often
              scheduled before the rota is set.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classDescription" className="form-label fw-bold">
              Description
            </Label>
            <Input
              id="classDescription"
              type="textarea"
              rows={3}
              name="description"
              value={values.description}
              onChange={onChange}
            />
            <small className="text-muted">
              Shown publicly under the title on the booking form.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <Label htmlFor="classNotes" className="form-label fw-bold">
              Internal notes
            </Label>
            <Input
              id="classNotes"
              type="textarea"
              rows={3}
              name="notes"
              value={values.notes}
              onChange={onChange}
            />
            <small className="text-muted">
              Staff only. Never returned by the public timetable.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="form-check mb-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="classAllowGuests"
              name="allowGuests"
              checked={values.allowGuests}
              onChange={onCheck}
            />
            <Label
              className="form-check-label ms-1 fw-semibold"
              htmlFor="classAllowGuests"
            >
              Open to non-members (free trial)
            </Label>
            <small className="text-muted d-block">
              Off makes it members-only: the website booking form refuses, the
              member portal still works.
            </small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="form-check mb-3">
            <Input
              type="checkbox"
              className="form-check-input"
              id="classIsActive"
              name="isActive"
              checked={values.isActive}
              onChange={onCheck}
            />
            <Label
              className="form-check-label ms-1 fw-semibold"
              htmlFor="classIsActive"
            >
              Active
            </Label>
            <small className="text-muted d-block">
              Switching this off hides the class from the website and keeps
              every existing booking — it is the safe alternative to deleting.
            </small>
          </FormGroup>
        </Col>

        {editing ? (
          <Col md={12}>
            <div className="alert alert-light border d-flex align-items-center gap-2 flex-wrap mb-0">
              <i className="ri-information-line" aria-hidden="true"></i>
              <span className="small text-muted">
                Moving this class rewrites the time and branch stored on its{" "}
                {editing.bookedCount || 0} booking(s) as well. It is currently{" "}
                {formatDateTime(editing.start) || "unscheduled"}.
              </span>
            </div>
          </Col>
        ) : null}
      </Row>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <Button type="button" color="light" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="success" disabled={saving}>
          {saving ? "Saving..." : editing ? "Update Class" : "Save Class"}
        </Button>
      </div>
    </Form>
  );
};

SessionForm.propTypes = {
  values: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isSubmit: PropTypes.bool,
  editing: PropTypes.object,
  branches: PropTypes.array.isRequired,
  trainers: PropTypes.array.isRequired,
  saving: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onCheck: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default SessionForm;

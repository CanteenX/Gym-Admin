import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Row,
} from "reactstrap";

export const holidayInitialState = {
  title: "",
  date: "",
  /**
   * The toggle is UI-only state and never leaves this screen. The server's
   * contract is `endDate: null` for a single day, so `isMultiDay: false`
   * submits an explicit null rather than omitting the field — omitting it on an
   * UPDATE would leave a previously-set endDate in place and quietly turn
   * "shorten this to one day" into a no-op.
   */
  isMultiDay: false,
  endDate: "",
  note: "",
  branch: "",
  isActive: true,
};

/**
 * Client-side mirror of buildHolidayValues() in
 * Gym-Server/controllers/v1/holiday.controller.js. The server is still the
 * authority — this exists so the three mistakes that are actually made
 * (no title, no date, end before start) are caught before a round trip, not so
 * validation can move to the browser.
 */
export const validateHoliday = (values) => {
  const errors = {};
  if (!String(values.title || "").trim()) errors.title = "Title is required!";
  if (!values.date) errors.date = "Date is required!";
  if (values.isMultiDay) {
    if (!values.endDate) {
      errors.endDate = "Last day is required for a multi-day closure!";
    } else if (values.date && values.endDate < values.date) {
      // Both are yyyy-mm-dd strings from <input type="date">, so a plain string
      // comparison is a correct date comparison — no Date parsing needed, and
      // no timezone to get wrong.
      errors.endDate = "The last day cannot be before the first day!";
    }
  }
  return errors;
};

/**
 * Add / edit a closure.
 *
 * ============================================================================
 * ONE ROW PER CLOSURE, NOT ONE PER DAY.
 * ============================================================================
 * The multi-day toggle is the whole reason this form is not just two date
 * fields. Diwali shuts the gym for three days and that is ONE holiday with an
 * inclusive `endDate`; entering it as three rows produces three things to edit,
 * three things to deactivate, and a list nobody can read. The toggle makes the
 * single-day case (the common one) a single field and the range case explicit.
 *
 * ============================================================================
 * THE BRANCH PICKER IS NOT SHOWN TO A BRANCH ADMIN.
 * ============================================================================
 * Not disabled — absent. The server takes a branch admin's branch from their
 * session and IGNORES whatever `branch` the body carries (holidayWriteBranch()),
 * so a picker would be a control whose value is discarded: they would choose
 * "All branches", get a single-branch holiday, and have no way to tell it went
 * wrong. Only a super admin, who really can file against any branch, is given
 * the choice — defaulting to "All branches", because a gym-wide festival
 * closure is the common case.
 */
const HolidayForm = ({
  values,
  setValues,
  formErrors,
  isSubmit,
  isSaving,
  isUpdate,
  branches,
  showBranchPicker,
  onSubmit,
  onCancel,
}) => {
  const setField = (name, value) =>
    setValues((v) => ({ ...v, [name]: value }));

  const handleChange = (e) => setField(e.target.name, e.target.value);

  /**
   * Turning the toggle OFF clears endDate in the same update. Leaving a stale
   * value behind meant re-ticking the box re-armed a date the user had already
   * talked themselves out of.
   */
  const handleMultiDayToggle = (e) => {
    const isMultiDay = e.target.checked;
    setValues((v) => ({
      ...v,
      isMultiDay,
      endDate: isMultiDay ? v.endDate : "",
    }));
  };

  return (
    <Form onSubmit={onSubmit}>
      <Row>
        <Col md={5}>
          <FormGroup className="mb-3">
            <Label htmlFor="holiday-title" className="form-label fw-bold">
              Holiday Title <span className="text-danger">*</span>
            </Label>
            <Input
              id="holiday-title"
              name="title"
              placeholder="e.g. Diwali"
              value={values.title}
              onChange={handleChange}
              maxLength={200}
            />
            {isSubmit && formErrors.title && (
              <p className="text-danger small mt-1 mb-0">{formErrors.title}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={3}>
          <FormGroup className="mb-3">
            <Label htmlFor="holiday-date" className="form-label fw-bold">
              {values.isMultiDay ? "First Day" : "Date"}{" "}
              <span className="text-danger">*</span>
            </Label>
            <Input
              id="holiday-date"
              type="date"
              name="date"
              value={values.date}
              onChange={handleChange}
            />
            {isSubmit && formErrors.date && (
              <p className="text-danger small mt-1 mb-0">{formErrors.date}</p>
            )}
          </FormGroup>
        </Col>

        <Col md={4}>
          <FormGroup className="mb-3">
            <Label htmlFor="holiday-end-date" className="form-label fw-bold">
              Last Day {values.isMultiDay && <span className="text-danger">*</span>}
            </Label>
            <Input
              id="holiday-end-date"
              type="date"
              name="endDate"
              value={values.endDate}
              min={values.date || undefined}
              onChange={handleChange}
              disabled={!values.isMultiDay}
            />
            <div className="form-check mt-2">
              <Input
                type="checkbox"
                className="form-check-input"
                id="holiday-multi-day"
                name="isMultiDay"
                checked={values.isMultiDay}
                onChange={handleMultiDayToggle}
              />
              <Label
                className="form-check-label ms-1"
                htmlFor="holiday-multi-day"
              >
                Closed for more than one day
              </Label>
            </div>
            {isSubmit && formErrors.endDate && (
              <p className="text-danger small mt-1 mb-0">{formErrors.endDate}</p>
            )}
          </FormGroup>
        </Col>

        {showBranchPicker && (
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="holiday-branch" className="form-label fw-bold">
                Branch
              </Label>
              <Input
                id="holiday-branch"
                type="select"
                name="branch"
                value={values.branch}
                onChange={handleChange}
              >
                {/* Empty string is the "all branches" choice and is converted
                    to a real null on submit — see HolidayMaster's toPayload().
                    An <option value={null}> would come back as the string
                    "null" and be looked up as a branch name. */}
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b._id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
                {/* Keep an unlisted branch selectable rather than silently
                    blanking it — and blanking here would WIDEN a one-branch
                    closure to the whole gym, which is the dangerous direction. */}
                {values.branch &&
                  !branches.some((b) => b.name === values.branch) && (
                    <option value={values.branch}>{values.branch}</option>
                  )}
              </Input>
            </FormGroup>
          </Col>
        )}

        <Col md={showBranchPicker ? 8 : 12}>
          <FormGroup className="mb-3">
            <Label htmlFor="holiday-note" className="form-label fw-bold">
              Note
            </Label>
            <Input
              id="holiday-note"
              name="note"
              placeholder="optional — e.g. Half day, confirm with front desk"
              value={values.note}
              onChange={handleChange}
              maxLength={1000}
            />
          </FormGroup>
        </Col>

        <Col md={12}>
          <FormGroup className="form-check mb-0">
            <Input
              type="checkbox"
              className="form-check-input"
              id="holiday-active"
              name="isActive"
              checked={values.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
            />
            <Label
              className="form-check-label ms-1 fw-semibold"
              htmlFor="holiday-active"
            >
              Is Active
            </Label>
            {/* Deactivate rather than delete is the house rule for every
                master here, and it is the one the calendar honours: the
                calendar endpoint returns active holidays only. */}
            <div className="text-muted small">
              Unticking hides this closure from the calendar without deleting
              it.
            </div>
          </FormGroup>
        </Col>
      </Row>

      <div className="mt-3 d-flex justify-content-end gap-2">
        <Button type="button" color="light" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="success" disabled={isSaving}>
          {isSaving ? "Saving..." : isUpdate ? "Update" : "Save"}
        </Button>
      </div>
    </Form>
  );
};

HolidayForm.propTypes = {
  values: PropTypes.object.isRequired,
  setValues: PropTypes.func.isRequired,
  formErrors: PropTypes.object.isRequired,
  isSubmit: PropTypes.bool,
  isSaving: PropTypes.bool,
  isUpdate: PropTypes.bool,
  branches: PropTypes.array.isRequired,
  showBranchPicker: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default HolidayForm;

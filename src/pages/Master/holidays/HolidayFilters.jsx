import React from "react";
import PropTypes from "prop-types";
import { Col, Input, Label, Row } from "reactstrap";

/**
 * Filters above the list and the calendar.
 *
 * The branch filter is OUTSIDE the `isListView` block on purpose: it narrows
 * both views, and moving it inside either one would mean a super admin looking
 * at "Gotri only" in the list and "everything" in the calendar without
 * anything on screen explaining the difference.
 *
 * The other four are list-only because the calendar already answers them by
 * construction — it shows one month (so from/to are the month) and active
 * closures only (so a status filter would be a control with one legal value).
 *
 * Branch is shown to a super admin alone. The server ignores a branch admin's
 * `branch` on every read (holidayReadFilter), answering with their own branch
 * plus the all-branches rows either way, so for them it would be a control
 * that changes nothing.
 */
const HolidayFilters = ({
  isListView,
  showBranchFilter,
  query,
  onQueryChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  statusFilter,
  onStatusFilterChange,
  branchFilter,
  onBranchFilterChange,
  branches,
}) => (
  <Row className="g-2 mb-3 align-items-end">
    {isListView && (
      <>
        <Col md={3}>
          <Label
            htmlFor="holiday-search"
            className="form-label mb-1 small text-muted"
          >
            Search
          </Label>
          <Input
            id="holiday-search"
            bsSize="sm"
            type="text"
            placeholder="Title or note..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Label
            htmlFor="holiday-from"
            className="form-label mb-1 small text-muted"
          >
            From
          </Label>
          <Input
            id="holiday-from"
            bsSize="sm"
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Label
            htmlFor="holiday-to"
            className="form-label mb-1 small text-muted"
          >
            To
          </Label>
          <Input
            id="holiday-to"
            bsSize="sm"
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Label
            htmlFor="holiday-status"
            className="form-label mb-1 small text-muted"
          >
            Status
          </Label>
          <Input
            id="holiday-status"
            bsSize="sm"
            type="select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Input>
        </Col>
      </>
    )}
    {showBranchFilter && (
      <Col md={3}>
        <Label
          htmlFor="holiday-branch-filter"
          className="form-label mb-1 small text-muted"
        >
          Branch
        </Label>
        <Input
          id="holiday-branch-filter"
          bsSize="sm"
          type="select"
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
        >
          {/* Distinct from the FORM's "All branches": there, it is the value
              stored on the row; here it means "do not filter", which also
              returns the branch-specific rows. */}
          <option value="">Every branch</option>
          {branches.map((b) => (
            <option key={b._id || b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </Input>
      </Col>
    )}
  </Row>
);

HolidayFilters.propTypes = {
  isListView: PropTypes.bool,
  showBranchFilter: PropTypes.bool,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  fromDate: PropTypes.string.isRequired,
  onFromDateChange: PropTypes.func.isRequired,
  toDate: PropTypes.string.isRequired,
  onToDateChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
  branchFilter: PropTypes.string.isRequired,
  onBranchFilterChange: PropTypes.func.isRequired,
  branches: PropTypes.array.isRequired,
};

export default HolidayFilters;

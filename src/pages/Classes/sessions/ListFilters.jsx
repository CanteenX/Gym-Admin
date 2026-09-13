import React from "react";
import PropTypes from "prop-types";
import { Col, Input, Label, Row } from "reactstrap";

/**
 * The filter bars above the two lists.
 *
 * Every control is named by a VISIBLE `<Label htmlFor>`, not a placeholder. A
 * placeholder is not an accessible name — it is announced inconsistently, and
 * it vanishes the moment anything is typed, which is precisely when somebody
 * coming back to a half-filled filter needs to know what the box is.
 */
export const CLASS_STATUS_FILTERS = [
  { value: "", label: "Active and switched off" },
  { value: "true", label: "Active only" },
  { value: "false", label: "Switched off only" },
];

export const BOOKING_STATUS_FILTERS = [
  { value: "", label: "Every status" },
  { value: "BOOKED", label: "Booked" },
  { value: "ATTENDED", label: "Attended" },
  { value: "NO_SHOW", label: "No show" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const ClassFilters = ({
  query,
  branch,
  branches,
  activeFilter,
  upcomingOnly,
  onQueryChange,
  onBranchChange,
  onActiveChange,
  onUpcomingChange,
}) => (
  <Row className="g-2 mb-3">
    <Col sm={6} md={4} lg={3}>
      <Label htmlFor="classSearch" className="form-label small mb-1">
        Search classes
      </Label>
      <Input
        id="classSearch"
        type="text"
        bsSize="sm"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </Col>
    <Col sm={6} md={4} lg={3}>
      <Label htmlFor="classBranchFilter" className="form-label small mb-1">
        Branch
      </Label>
      <Input
        id="classBranchFilter"
        type="select"
        bsSize="sm"
        value={branch}
        onChange={(e) => onBranchChange(e.target.value)}
      >
        {/* "my branches", not "all branches": for a branch admin the server
            ignores this and answers with their own branch either way. */}
        <option value="">All my branches</option>
        {branches.map((b) => (
          <option key={b._id || b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </Input>
    </Col>
    <Col sm={6} md={4} lg={3}>
      <Label htmlFor="classStatusFilter" className="form-label small mb-1">
        Show
      </Label>
      <Input
        id="classStatusFilter"
        type="select"
        bsSize="sm"
        value={activeFilter}
        onChange={(e) => onActiveChange(e.target.value)}
      >
        {CLASS_STATUS_FILTERS.map((s) => (
          <option key={s.value || "all"} value={s.value}>
            {s.label}
          </option>
        ))}
      </Input>
    </Col>
    <Col sm={6} md={4} lg={3} className="d-flex align-items-end">
      <div className="form-check mb-1">
        <Input
          type="checkbox"
          className="form-check-input"
          id="classUpcomingOnly"
          checked={upcomingOnly}
          onChange={(e) => onUpcomingChange(e.target.checked)}
        />
        <Label className="form-check-label ms-1" htmlFor="classUpcomingOnly">
          Upcoming only
        </Label>
      </div>
    </Col>
  </Row>
);

ClassFilters.propTypes = {
  query: PropTypes.string.isRequired,
  branch: PropTypes.string.isRequired,
  branches: PropTypes.array.isRequired,
  activeFilter: PropTypes.string.isRequired,
  upcomingOnly: PropTypes.bool,
  onQueryChange: PropTypes.func.isRequired,
  onBranchChange: PropTypes.func.isRequired,
  onActiveChange: PropTypes.func.isRequired,
  onUpcomingChange: PropTypes.func.isRequired,
};

export const BookingFilters = ({
  query,
  status,
  onQueryChange,
  onStatusChange,
}) => (
  <Row className="g-2 mb-3">
    <Col sm={6} md={4} lg={3}>
      <Label htmlFor="bookingSearch" className="form-label small mb-1">
        Search name, phone or email
      </Label>
      <Input
        id="bookingSearch"
        type="text"
        bsSize="sm"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </Col>
    <Col sm={6} md={4} lg={3}>
      <Label htmlFor="bookingStatusFilter" className="form-label small mb-1">
        Booking status
      </Label>
      <Input
        id="bookingStatusFilter"
        type="select"
        bsSize="sm"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {BOOKING_STATUS_FILTERS.map((s) => (
          <option key={s.value || "all"} value={s.value}>
            {s.label}
          </option>
        ))}
      </Input>
    </Col>
  </Row>
);

BookingFilters.propTypes = {
  query: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};

export default ClassFilters;

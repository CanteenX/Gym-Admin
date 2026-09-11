import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  Col,
  Label,
  Input,
  Row,
} from "reactstrap";

const FormsHeader = ({
  formName,
  filter,
  handleFilter,
  tog_list,
  setQuery,
  showAddButton = true,
}) => {
  return (
    <Row className="g-4 mb-1">
        <Col className="col-sm" sm={6} lg={4} md={6}>
          <h2 className="card-title mb-0 fs-4 mt-2">{formName}</h2>
        </Col>

        <Col sm={6} lg={4} md={6}>
          <div className="text-end mt-2">
            <Input
              type="checkbox"
              className="form-check-input"
              name="filter"
              value={filter}
              defaultChecked={true}
              onChange={handleFilter}
            />
            <Label className="form-check-label ms-2">Active</Label>
          </div>
        </Col>
        <Col className="col-sm-auto" sm={12} lg={4} md={12}>
          <div className="d-flex justify-content-sm-end">
            {showAddButton && (
              <div className="ms-2">
                <Button
                  color="success"
                  className="add-btn me-1"
                  onClick={() => tog_list()}
                  id="create-btn"
                >
                  <i className="ri-add-line align-bottom me-1"></i>{" "}Add
                </Button>
              </div>
            )}
            <div className="search-box ms-2">
              <input
                type="text"
                className="form-control search"
                placeholder="Search..."
                onChange={(e) => setQuery(e.target.value)}
              />
              <i className="ri-search-line search-icon"></i>
            </div>
          </div>
        </Col>
      </Row>
  );
};

FormsHeader.propTypes = {
  formName: PropTypes.string.isRequired,
  filter: PropTypes.bool,
  handleFilter: PropTypes.func,
  tog_list: PropTypes.func.isRequired,
  setQuery: PropTypes.func.isRequired,
  showAddButton: PropTypes.bool,
};

export default FormsHeader;

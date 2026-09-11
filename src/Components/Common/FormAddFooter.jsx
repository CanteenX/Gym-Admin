import React from "react";
import PropTypes from "prop-types";


const FormsFooter = ({ handleSubmit, handleSubmitCancel, isLoading = false }) => {
  return (
    <div className="hstack gap-2 justify-content-end">
      <button
        type="submit"
        className="btn btn-success"
        id="add-btn"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <output className="spinner-border spinner-border-sm me-1" aria-hidden="true"></output>{" "}
            Submitting...
          </>
        ) : "Submit"}
      </button>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={handleSubmitCancel}
        disabled={isLoading}
      >
        Cancel
      </button>
    </div>
  );
};

FormsFooter.propTypes = {
  handleSubmit: PropTypes.func.isRequired,
  handleSubmitCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default FormsFooter;

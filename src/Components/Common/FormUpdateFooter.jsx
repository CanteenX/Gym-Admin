import React from "react";
import PropTypes from "prop-types";

const FormUpdateFooter = ({ handleUpdate, handleUpdateCancel, isLoading = false }) => {
  return (
    <div className="hstack gap-2 justify-content-end">
      <button
        type="submit"
        className="btn btn-success"
        id="add-btn"
        onClick={handleUpdate}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <output className="spinner-border spinner-border-sm me-1" aria-hidden="true"></output>{" "}
            Updating...
          </>
        ) : "Update"}
      </button>

      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={handleUpdateCancel}
        disabled={isLoading}
      >
        Cancel
      </button>
    </div>
  );
};

FormUpdateFooter.propTypes = {
  handleUpdate: PropTypes.func.isRequired,
  handleUpdateCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default FormUpdateFooter;

import PropTypes from "prop-types";
import React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

/**
 * Every one of the ~17 call sites passes the dismiss handler as `toggle`, but
 * this component only destructured `handleDeleteClose` - a prop nobody passes.
 * So it was always undefined and <Modal toggle={undefined}> meant Escape and
 * backdrop-click dismissed no delete dialog anywhere in the app.
 *
 * `toggle` is now the contract; `handleDeleteClose` stays accepted so any call
 * site using the old name keeps working.
 */
const DeleteModal = ({
  show,
  handleDelete,
  toggle,
  handleDeleteClose,
  setmodal_delete,
  disabled,
}) => {
  const dismiss = toggle || handleDeleteClose;

  return (
    <Modal fade={true} isOpen={show} toggle={disabled ? undefined : dismiss} centered={true}>
       <ModalHeader
          className="bg-light p-3"
          toggle={() => {
            if (!disabled) setmodal_delete(false);
          }}
        >
          Remove
        </ModalHeader>
      <ModalBody className="py-3 px-5">
        <div className="mt-2 text-center">
          <lord-icon
            src="https://cdn.lordicon.com/gsqxdxog.json"
            trigger="loop"
            colors="primary:#f7b84b,secondary:#f06548"
            style={{ width: "100px", height: "100px" }}
          ></lord-icon>
          <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
            <h4>Are you sure ?</h4>
            <p className="text-muted mx-4 mb-0">
              Are you sure you want to remove this record ?
            </p>
          </div>
        </div>
        {/* <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
          <button
            type="button"
            className="btn w-sm btn-light"
            data-bs-dismiss="modal"
            onClick={onCloseClick}
          >
            Close
          </button>
          <button
            type="button"
            className="btn w-sm btn-danger "
            id="delete-record"
            onClick={onDeleteClick}
          >
            Yes, Delete It!
          </button>
        </div> */}
      </ModalBody>
      <ModalFooter>
            <div className="hstack gap-2 justify-content-end">
              <button
                type="submit"
                className="btn btn-danger"
                id="add-btn"
                onClick={handleDelete}
                disabled={disabled}
              >
                {disabled ? (
                  <>
                    <output className="spinner-border spinner-border-sm me-1" aria-hidden="true"></output>{" "}
                    Removing...
                  </>
                ) : "Remove"}
              </button>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setmodal_delete(false)}
                disabled={disabled}
              >
                Cancel
              </button>
            </div>
          </ModalFooter>
    </Modal>
  );
};

DeleteModal.propTypes = {
  show: PropTypes.bool,
  handleDelete: PropTypes.func,
  toggle: PropTypes.func,
  handleDeleteClose: PropTypes.func,
  setmodal_delete: PropTypes.func,
  disabled: PropTypes.bool,
};

export default DeleteModal;
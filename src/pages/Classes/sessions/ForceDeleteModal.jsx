import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";

/**
 * ============================================================================
 * THE 409 THE SERVER RETURNS IS A QUESTION, AND THIS IS WHERE IT IS ASKED.
 * ============================================================================
 * DELETE /classes/:id refuses while anybody holds a BOOKED place, answering
 * `{ code: "HAS_BOOKINGS", bookings: <number> }`. `?force=true` overrides it —
 * which means retrying with force on a 409, the way a naive client "handles"
 * the error, quietly deletes other people's plans on the first click and tells
 * nobody at all.
 *
 * So the count comes back to a human, named. Three ways out are offered and the
 * safe one is the default action:
 *
 *   Switch the class off   isActive: false. Hidden from the website, every
 *                          booking kept. Almost always what was meant, which is
 *                          why the server's own error message says so.
 *   Keep it                No change.
 *   Delete anyway          force=true. Deletes the class AND its bookings.
 *
 * The server's message is rendered verbatim alongside, so the wording a future
 * change makes there reaches the screen without this file being edited.
 */
const ForceDeleteModal = ({
  session,
  bookings,
  serverMessage,
  busy,
  canEdit,
  onSwitchOff,
  onForceDelete,
  onClose,
}) => (
  <Modal isOpen={Boolean(session)} toggle={busy ? undefined : onClose} centered>
    <ModalHeader className="bg-light p-3" toggle={busy ? undefined : onClose}>
      This class has bookings
    </ModalHeader>
    <ModalBody>
      <div className="d-flex align-items-start gap-2 mb-3">
        <i
          className="ri-alarm-warning-line fs-4 text-danger"
          aria-hidden="true"
        ></i>
        <div>
          <p className="mb-2">
            <strong>
              {bookings} {bookings === 1 ? "person holds" : "people hold"} a
              place
            </strong>{" "}
            in <strong>{session?.title || "this class"}</strong>. Deleting it
            removes the class and{" "}
            {bookings === 1 ? "that booking" : "all of those bookings"}. Nobody
            is notified.
          </p>
          {serverMessage ? (
            <p className="text-muted small mb-0">{serverMessage}</p>
          ) : null}
        </div>
      </div>
      {canEdit ? (
        <div className="alert alert-light border small mb-0">
          Switching the class off instead hides it from the website and keeps
          every booking, so the people affected can be called first.
        </div>
      ) : null}
    </ModalBody>
    <ModalFooter className="flex-wrap gap-2">
      <Button color="light" onClick={onClose} disabled={busy}>
        Keep the class
      </Button>
      {canEdit ? (
        <Button color="success" onClick={onSwitchOff} disabled={busy}>
          {busy ? "Working..." : "Switch it off instead"}
        </Button>
      ) : null}
      <Button color="danger" onClick={onForceDelete} disabled={busy}>
        {busy
          ? "Working..."
          : `Delete it and ${bookings} booking${bookings === 1 ? "" : "s"}`}
      </Button>
    </ModalFooter>
  </Modal>
);

ForceDeleteModal.propTypes = {
  session: PropTypes.object,
  bookings: PropTypes.number.isRequired,
  serverMessage: PropTypes.string,
  busy: PropTypes.bool,
  canEdit: PropTypes.bool,
  onSwitchOff: PropTypes.func.isRequired,
  onForceDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ForceDeleteModal;

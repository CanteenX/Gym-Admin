import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";
import { bookingSubject } from "../classesFormat";

/**
 * Confirms cancelling somebody's place, and collects why.
 *
 * The reason is optional but it is asked for, because "cancelled, ill" and
 * "cancelled, class moved" are different facts to whoever reads the roster
 * next — the server stores whatever comes back on the row, and defaults to
 * "Cancelled by staff" when it is left empty.
 *
 * Cancelling is the one roster action that gives a seat back, so it is the one
 * that gets a confirmation: the other three do not change how many places are
 * available.
 */
const CancelBookingModal = ({
  booking,
  reason,
  busy,
  onReasonChange,
  onConfirm,
  onClose,
}) => {
  const who = booking ? bookingSubject(booking) : null;

  return (
    <Modal isOpen={Boolean(booking)} toggle={busy ? undefined : onClose} centered>
      <ModalHeader className="bg-light p-3" toggle={busy ? undefined : onClose}>
        Cancel this booking
      </ModalHeader>
      <ModalBody>
        <p className="mb-3">
          This frees the place held by{" "}
          <strong>{who?.name || "this person"}</strong>
          {who?.phone ? ` (${who.phone})` : ""} and puts the seat back on sale.
          They are not told automatically.
        </p>
        <FormGroup className="mb-0">
          <Label htmlFor="cancelBookingReason" className="form-label fw-bold">
            Reason (optional)
          </Label>
          <Input
            id="cancelBookingReason"
            name="reason"
            type="text"
            maxLength={200}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
          <small className="text-muted">
            Stored on the booking, e.g. &quot;ill&quot; or &quot;class
            moved&quot;. Left empty it reads &quot;Cancelled by staff&quot;.
          </small>
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={busy}>
          Keep the booking
        </Button>
        <Button color="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Cancelling..." : "Cancel the booking"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

CancelBookingModal.propTypes = {
  booking: PropTypes.object,
  reason: PropTypes.string.isRequired,
  busy: PropTypes.bool,
  onReasonChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CancelBookingModal;

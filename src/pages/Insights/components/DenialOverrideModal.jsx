import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  FormText,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "reactstrap";
import { DENIAL_NOTE_MAX } from "../../../api/attendanceStaff.api";
import { denialReasonWords, formatDate, formatTime } from "../insightsFormat";

/**
 * "Mark as allowed" — the one write on the staff side of attendance.
 *
 * ============================================================================
 * WORDING. THIS IS NOT A DOOR BEING OPENED.
 * ============================================================================
 * Check-in is unattended: the branch QR is a printed sticker and the portal's
 * button needs no QR at all, so there is nobody at the entrance and a refusal
 * stopped nobody. What happened is that the member tapped, was told on their
 * own phone that their membership needed attention, and walked to reception.
 * This screen closes off a flag that has stopped being true.
 *
 * So: "cleared", "sorted out", "the flag goes away". Never "refused entry",
 * "turned away", "granted access". The member was informed, not blocked, and a
 * screen that says otherwise teaches the desk to describe it that way to the
 * member standing in front of them.
 *
 * ============================================================================
 * THE OUTCOME SENTENCES ARE THE SERVER'S, RENDERED VERBATIM.
 * ============================================================================
 * The two results are genuinely different and the difference matters at the
 * desk: a refusal from TODAY becomes a live session (the member is here now),
 * an OLDER one is only cleared and nobody is on the floor. The server decides
 * which — it owns the date comparison against the row's normalised `date` — and
 * hands back `sessionOpened` plus plain-English `message` and `effect` strings.
 *
 * This component renders those strings and does not paraphrase them. Composing
 * the sentence here would mean re-deriving `sessionOpened` from a timestamp,
 * and the first time the two disagreed the desk would be told a member is in
 * the gym when they are not.
 *
 * The one thing this file does add is the framing for `alreadyOverridden`,
 * which the server (correctly) treats as an ordinary success with nothing new
 * to describe: two people at the desk pressing the same button is expected, so
 * it is shown as "already done", in `info`, never as a failure.
 */

/** The note is a memo for whoever reads this row next, not a case file. */
const NOTE_PLACEHOLDER = "e.g. paid at the desk, receipt 1042";

const DenialOverrideModal = ({ denial, isOpen, busy, onConfirm, onClose }) => {
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState(null);

  /**
   * Reset per denial, not only per open. Leaving the previous row's note in the
   * box is how "receipt 1042" ends up attached to the wrong member — and
   * leaving the previous outcome would show a success banner over a fresh
   * refusal that has not been touched.
   */
  useEffect(() => {
    setNote("");
    setOutcome(null);
  }, [denial?._id, isOpen]);

  if (!denial) return null;

  const isTrainer = denial.subjectType === "TRAINER" || Boolean(denial.trainer);
  const person = isTrainer ? denial.trainer : denial.member;
  const who =
    person?.fullName || (isTrainer ? "Unknown trainer" : "Unknown member");
  const reason = denialReasonWords(denial.deniedReason);

  const submit = async (event) => {
    event.preventDefault();
    const result = await onConfirm(denial, note);
    // A null result means the handler never ran. Anything else is shown as-is,
    // including a failure, so the desk is never left guessing whether the
    // button did something.
    if (result) setOutcome(result);
  };

  const done = Boolean(outcome);
  const calm = Boolean(outcome?.ok && outcome?.alreadyOverridden);

  const alertColor = () => {
    if (!outcome?.ok) return "danger";
    return calm ? "info" : "success";
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered>
      <ModalHeader toggle={onClose}>Mark this check-in as allowed</ModalHeader>
      <Form onSubmit={submit}>
        <ModalBody>
          <p className="mb-1">
            <span className="fw-semibold">{who}</span>
            {person?.mobileNumber ? (
              <span className="text-muted"> · {person.mobileNumber}</span>
            ) : null}
          </p>
          <p className="text-muted small mb-3">
            {denial.branch} · {reason.label} · refused at{" "}
            {formatTime(denial.deniedAt)} on {formatDate(denial.deniedAt)}
          </p>

          {done ? (
            <Alert color={alertColor()} className="mb-0" role="status">
              {calm ? (
                <p className="mb-1 fw-semibold">
                  Already done — someone at the desk got there first.
                </p>
              ) : null}
              {/* The server's own sentences. See the header: they are not
                  paraphrased, because only the server knows whether a session
                  was opened. */}
              {outcome.message ? (
                <p className="mb-0">{outcome.message}</p>
              ) : null}
              {outcome.effect ? (
                <p className="mb-0 mt-1">{outcome.effect}</p>
              ) : null}
              {calm ? (
                <p className="mb-0 mt-1">
                  Nothing was recorded twice.{" "}
                  {outcome.sessionOpened
                    ? "A session was opened when it was first cleared."
                    : "No session was opened, because the refusal was not from today."}
                </p>
              ) : null}
            </Alert>
          ) : (
            <>
              <p className="mb-3">
                Nobody was stopped — there is no barrier on the way in. {who}{" "}
                was told their membership needed attention, and the desk was
                flagged. Clearing it removes the flag and records your name
                against it.
              </p>
              <p className="text-muted small">
                A refusal from today becomes an open session, because the member
                is at the desk right now. An older one is only cleared and stays
                recorded on its own day. You will be told which happened.
              </p>

              <Label for="denial-override-note" className="form-label">
                Note for the record (optional)
              </Label>
              <Input
                id="denial-override-note"
                type="textarea"
                rows={3}
                value={note}
                maxLength={DENIAL_NOTE_MAX}
                placeholder={NOTE_PLACEHOLDER}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
              <FormText>
                What the next person needs to know — {note.length} of{" "}
                {DENIAL_NOTE_MAX} characters used.
              </FormText>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {done ? (
            <Button color="light" type="button" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button
                color="light"
                type="button"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button color="primary" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    Marking as allowed
                  </>
                ) : (
                  "Mark as allowed"
                )}
              </Button>
            </>
          )}
        </ModalFooter>
      </Form>
    </Modal>
  );
};

DenialOverrideModal.propTypes = {
  /** One row from `denials[]` on GET /attendance/live, or null. */
  denial: PropTypes.object,
  isOpen: PropTypes.bool,
  busy: PropTypes.bool,
  /**
   * (denial, note) => Promise<{ ok, alreadyOverridden?, sessionOpened?,
   * message, effect? } | null>. `message` and `effect` come from the server and
   * are rendered verbatim.
   */
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DenialOverrideModal;

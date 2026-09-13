import PropTypes from "prop-types";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Table,
} from "reactstrap";
import DenialOverrideModal from "./DenialOverrideModal";
import { denialReasonWords, formatDate, formatTime } from "../insightsFormat";

/**
 * Refused check-ins — the only rows on this screen that somebody has to act on.
 *
 * ============================================================================
 * WHY THIS SITS ABOVE THE IN-GYM LIST AND NOT BESIDE IT.
 * ============================================================================
 * Everything else on Attendance Overview is a person happily training or a
 * number to glance at. This is the one thing that is going wrong right now:
 * check-in is unattended (docs/plan.md D2), so a member whose record says
 * expired tapped the sticker, was told on their own phone that their membership
 * had lapsed, and there was nobody standing there to say "that's wrong, come
 * in". Until this list existed the refusal was visible only by downloading a
 * CSV, so in practice nobody knew it had happened at all.
 *
 * ============================================================================
 * WORDING. NOBODY WAS REFUSED ENTRY, BECAUSE THERE IS NOTHING TO REFUSE.
 * ============================================================================
 * The gym has no barrier. The branch QR is a printed sticker and the portal's
 * check-in button needs no QR at all, so a refusal cannot stop anyone — it
 * informs the member and flags the front desk, and that is the whole of its
 * power. The people in this list may well be training right now.
 *
 * Nothing here says "refused entry", "turned away" or "denied access", and
 * nothing here calls a row proof of anything: the same caveat that governs the
 * rest of the screen applies, and the server's own `denialsBasis` string is
 * rendered verbatim underneath rather than summarised into something firmer.
 *
 * ============================================================================
 * TWO NUMBERS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS.
 * ============================================================================
 * `deniedToday` is the day's total and is the honest figure to put beside the
 * list — a panel showing only what changed would read zero on every quiet poll
 * and make a whole morning of refusals look like it never happened.
 *
 * The freshness marks (`freshIds`) answer the other question: what has appeared
 * since you last looked, so a desk with this screen open in a corner notices
 * without re-reading the list. They are worked out by the page from its own
 * previous poll rather than from the server's `deniedNew` — see
 * AttendanceOverview.jsx for why that field cannot be used here — and they
 * cover a REPEAT attempt as well as a new row, because a member who is refused
 * again at 07:31 updates the existing row instead of creating a second one.
 *
 * Before the second poll there is no baseline and therefore nothing can
 * honestly be called new; `hasBaseline` is false and the freshness line is
 * simply absent rather than claiming zero.
 */

const DenialsPanel = ({
  data,
  loading,
  freshIds,
  hasBaseline,
  canOverride,
  busyId,
  onMarkAllowed,
}) => {
  const rows = data?.denials || [];
  const total = Number(data?.deniedToday || 0);
  const truncated = Boolean(data?.denialsTruncated);

  /**
   * The row the modal is working on, held as a SNAPSHOT rather than looked up
   * by id out of `rows` on every render.
   *
   * That is not a style choice. Clearing a refusal succeeds, the page pulls the
   * feed forward immediately, and the row correctly stops being a refusal and
   * leaves `rows` — so a modal whose `isOpen` was derived from a lookup would
   * close itself a few hundred milliseconds after the press, taking the
   * server's account of what just happened with it. The person who pressed the
   * button would never learn whether a session was opened.
   */
  const [active, setActive] = useState(null);
  /**
   * What each override did, keyed by row id, so the row itself reports the
   * result rather than only a toast that is gone in four seconds. The entry
   * survives until the next poll drops the row, which is exactly as long as it
   * is useful — a second person walking past sees that it has been handled.
   */
  const [outcomes, setOutcomes] = useState({});

  const fresh = useMemo(
    () => new Set((freshIds || []).map(String)),
    [freshIds],
  );

  const freshCount = useMemo(
    () => rows.filter((d) => fresh.has(String(d._id))).length,
    [rows, fresh],
  );

  const handleConfirm = async (denial, note) => {
    const result = await onMarkAllowed(denial, note);
    if (result?.ok) {
      // A new object rather than a mutated one, so React sees the change and
      // the previous map is never edited underneath a render in flight.
      setOutcomes((previous) => ({
        ...previous,
        [String(denial._id)]: result,
      }));
    }
    return result;
  };

  /**
   * The count line, as one sentence rather than two bare badges. A number on
   * its own beside a list is ambiguous about which of the two questions above
   * it is answering, and a screen reader gets nothing from "3" in a pill.
   *
   * `aria-live="polite"` and mounted unconditionally: a live region that is
   * inserted at the same moment its text changes is not reliably announced, so
   * this element exists even when the list is empty and the gym has had a
   * perfectly quiet morning.
   */
  const summary = () => {
    // Nothing, not "loading": the spinner below already carries a
    // visually-hidden label, and two live announcements of the same thing is
    // worse than one.
    if (loading && !data) return "";
    if (total === 0) return "No refused check-ins today.";
    const day = `${total} refused check-in${total === 1 ? "" : "s"} today.`;
    if (!hasBaseline) return day;
    if (freshCount === 0) return `${day} Nothing new since the last refresh.`;
    return `${day} ${freshCount} new attempt${
      freshCount === 1 ? "" : "s"
    } since the last refresh.`;
  };

  return (
    <Card>
      <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h5 className="card-title mb-1">
            Refused check-ins — the front desk needs to pick these up
          </h5>
          <small className="text-muted">
            Nobody was stopped on the way in. These members were told their
            membership needs attention and may be training right now.
          </small>
        </div>
        <Badge color={total > 0 ? "danger" : "success"} pill className="fs-6">
          {total}
          <span className="visually-hidden">
            {" "}
            refused check-ins today
          </span>
        </Badge>
      </CardHeader>
      <CardBody>
        <p
          className={`mb-3 ${total > 0 ? "fw-semibold" : "text-muted"}`}
          aria-live="polite"
        >
          {summary()}
        </p>

        {loading && !data ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
            <span className="visually-hidden">
              Loading refused check-ins
            </span>
          </div>
        ) : (
          <>
            {truncated ? (
              <Alert color="warning">
                <i className="ri-alert-line align-bottom me-1" aria-hidden="true" />
                This list is capped and is not showing all {total} of today’s
                refused check-ins. Work through these, or filter by branch to
                narrow it down.
              </Alert>
            ) : null}

            {rows.length === 0 ? (
              <p className="text-muted mb-0">
                Nothing to pick up — every check-in logged today went through.
              </p>
            ) : (
              <div className="table-responsive">
                <Table className="align-middle mb-0" size="sm">
                  <caption className="visually-hidden">
                    Refused check-ins today, most recent attempt first, with what
                    needs sorting out for each one
                  </caption>
                  <thead className="table-light">
                    <tr>
                      {/* "Who", not "Member": a trainer's refused shift can
                          land here too, and a trainer under a heading that
                          says Member is the mislabelling the separate API key
                          exists to prevent. */}
                      <th scope="col">Who</th>
                      <th scope="col">Branch</th>
                      <th scope="col">What needs sorting</th>
                      <th scope="col">Refused</th>
                      {canOverride ? (
                        <th scope="col" className="text-end">
                          Action
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => {
                      const id = String(d._id);
                      const isTrainer =
                        d.subjectType === "TRAINER" || Boolean(d.trainer);
                      const person = isTrainer ? d.trainer : d.member;
                      const reason = denialReasonWords(d.deniedReason);
                      const outcome = outcomes[id];
                      const repeated =
                        d.lastAttemptAt &&
                        d.deniedAt &&
                        new Date(d.lastAttemptAt).getTime() -
                          new Date(d.deniedAt).getTime() >
                          60000;

                      return (
                        <tr key={id}>
                          <th scope="row" className="fw-medium">
                            {person?.fullName ||
                              (isTrainer ? "Unknown trainer" : "Unknown member")}
                            <Badge
                              color={isTrainer ? "info" : "light"}
                              className={`ms-2 align-middle${
                                isTrainer ? "" : " text-body"
                              }`}
                              pill
                            >
                              {isTrainer ? "Trainer" : "Member"}
                            </Badge>
                            {fresh.has(id) ? (
                              <Badge color="warning" className="ms-1 align-middle" pill>
                                New
                                <span className="visually-hidden">
                                  {" "}
                                  since the last refresh
                                </span>
                              </Badge>
                            ) : null}
                            {person?.mobileNumber ? (
                              <div className="fw-normal small">
                                <a href={`tel:${person.mobileNumber}`}>
                                  {person.mobileNumber}
                                </a>
                              </div>
                            ) : null}
                          </th>
                          <td className="text-nowrap">{d.branch}</td>
                          <td>
                            {reason.label}
                            {reason.action ? (
                              <div className="text-muted small">
                                {reason.action}
                              </div>
                            ) : null}
                            {/* The membership end date is the single most
                                useful thing for whoever picks up the phone:
                                it names what has to change before the next
                                check-in goes through. */}
                            {person?.endDate ? (
                              <div className="text-muted small">
                                {/* Tense matters: a PAYMENT_DUE refusal sits on
                                    a membership that is still running, and
                                    telling the desk it "ended" next month is
                                    the sort of detail that gets repeated to the
                                    member out loud. */}
                                {new Date(person.endDate) < new Date()
                                  ? `Membership ended ${formatDate(person.endDate)}`
                                  : `Membership runs to ${formatDate(person.endDate)}`}
                              </div>
                            ) : null}
                          </td>
                          <td className="text-nowrap">
                            {formatTime(d.deniedAt)}
                            {/* `deniedAt` is the first refusal of the day and
                                `lastAttemptAt` the most recent, because a
                                repeat refusal updates today's row in place
                                instead of writing a second one. Shown only
                                when they actually differ, so a single attempt
                                does not read as two. */}
                            {repeated ? (
                              <div className="text-muted small">
                                tried again at {formatTime(d.lastAttemptAt)}
                              </div>
                            ) : null}
                          </td>
                          {canOverride ? (
                            <td className="text-end">
                              {outcome ? (
                                <div className="small">
                                  <span className="text-success fw-medium text-nowrap">
                                    <i
                                      className="ri-checkbox-circle-line align-bottom me-1"
                                      aria-hidden="true"
                                    />
                                    Marked as allowed
                                  </span>
                                  {/* The server's own sentence, not a
                                      paraphrase: only it knows whether a
                                      session was opened. `effect` is absent on
                                      the already-overridden path — there was no
                                      new effect to describe — so the envelope's
                                      message stands in rather than leaving the
                                      row saying nothing. */}
                                  {outcome.effect || outcome.message ? (
                                    <div className="text-muted">
                                      {outcome.effect || outcome.message}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <Button
                                  color="soft-success"
                                  size="sm"
                                  className="text-nowrap"
                                  disabled={Boolean(busyId)}
                                  onClick={() => setActive(d)}
                                >
                                  {busyId === id ? (
                                    <Spinner size="sm" className="me-1" />
                                  ) : null}
                                  Mark as allowed
                                </Button>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Least privilege means `edit` on this menu row is granted to
                nobody by default, so for now only a super admin sees the
                button. Saying so beats leaving a colleague hunting for a
                control that was never rendered. */}
            {rows.length > 0 && !canOverride ? (
              <p className="text-muted small mt-3 mb-0">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                Clearing a refusal needs edit access on this screen. Ask an
                administrator, or send the member to reception.
              </p>
            ) : null}

            {data?.denialsBasis ? (
              <p className="text-muted small mt-3 mb-0">
                <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                {data.denialsBasis}
              </p>
            ) : null}
          </>
        )}
      </CardBody>

      <DenialOverrideModal
        denial={active}
        isOpen={Boolean(active)}
        busy={Boolean(active) && busyId === String(active._id)}
        onConfirm={handleConfirm}
        onClose={() => setActive(null)}
      />
    </Card>
  );
};

DenialsPanel.propTypes = {
  /** `data` from GET /attendance/live — the same payload InGymNowPanel reads. */
  data: PropTypes.object,
  loading: PropTypes.bool,
  /** Row ids that are new or re-attempted since the previous poll. */
  freshIds: PropTypes.arrayOf(PropTypes.string),
  /** False until a second poll has happened: nothing can be called new yet. */
  hasBaseline: PropTypes.bool,
  /** `edit` on /attendance-overview. The rest of the screen needs only `read`. */
  canOverride: PropTypes.bool,
  /** Id of the row currently being written, or "". */
  busyId: PropTypes.string,
  /** (denial, note) => Promise<outcome|null>. See DenialOverrideModal. */
  onMarkAllowed: PropTypes.func.isRequired,
};

export default DenialsPanel;

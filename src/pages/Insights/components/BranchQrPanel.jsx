import PropTypes from "prop-types";
import React, { useCallback, useState } from "react";
import { Button, Card, CardBody, CardHeader, Col, Row, Spinner } from "reactstrap";
import QrCodeSvg from "../../../Components/Common/QrCodeSvg";
import { getBranchQr } from "../../../api/attendanceStaff.api";

/**
 * The printable branch QR.
 *
 * ============================================================================
 * WHAT THIS STICKER IS, IN THE WORDS THAT HAVE TO STAY
 * ============================================================================
 * It is an UNATTENDED, STATIC, PRINTED code. Nobody is at the door. It can be
 * photographed off the wall and opened from a sofa, and the portal's own
 * check-in button works with no code at all — so scanning it is not evidence
 * that anybody was in the building, and no copy on this screen or on the sheet
 * may suggest it is. It exists for exactly one reason: it carries `?branch=`,
 * so a session gets attributed to Vasna or Gotri without the member picking
 * from a list. That is what makes per-branch footfall mean anything.
 *
 * The same goes for a refusal. An expired member who scans gets told why and
 * gets a row a staff member can follow up; the sticker cannot stop them walking
 * in, because there is nothing and nobody at the door to stop them.
 *
 * The server says both of those things in `notice`, and it is rendered verbatim
 * rather than paraphrased, for the same reason the panels render `basis`: a
 * caveat that is re-worded locally drifts away from the thing it qualifies.
 *
 * ============================================================================
 * `configured` — WHY A BRANCH CAN COME BACK UNPRINTABLE
 * ============================================================================
 * The link is absolute only when PUBLIC_SITE_ORIGIN is set on the server.
 * Without it the payload is a RELATIVE path, and a QR encoding "/attendance?…"
 * opens nothing on a phone. That must be said out loud — a printed sticker that
 * silently goes nowhere is discovered by a member standing in front of it,
 * weeks later. So an unconfigured branch renders an explanation and NO code.
 *
 * ============================================================================
 * PRINT LAYOUT
 * ============================================================================
 * The sheets are a second, print-only rendering (`d-none d-print-block`), not
 * the on-screen previews scaled up. They are different documents: the preview
 * is a thumbnail grid for staff choosing what to print, the sheet is a wall
 * poster for members. One <section class="qr-sheet"> per branch, each breaking
 * to a new page — see assets/scss/components/_print.scss.
 */

// Defaults in the signature, not in defaultProps: React 18.3 console.errors on
// defaultProps for a function component and the browser gate fails on that.
const BranchQrPanel = ({ branches = [], orgName = "" }) => {
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /**
     * One request per branch, all in flight together, and a failure is kept
     * PER BRANCH rather than failing the panel.
     *
     * A branch admin is refused every branch but their own (403, with the
     * server's own sentence). That is the normal case for them, not an error
     * state for the screen — showing it beside the branch name is more useful
     * than an empty panel, and far more useful than silently omitting a branch
     * they might then assume has no code.
     */
    const load = useCallback(async () => {
        if (!branches.length) return;
        setLoading(true);
        const results = await Promise.all(
            branches.map(async (b) => {
                try {
                    const res = await getBranchQr(b.name);
                    if (res.data?.isOk) return { ...res.data.data, error: "" };
                    return {
                        branch: b.name,
                        displayName: b.displayName || b.name,
                        error: res.data?.message || "The QR payload could not be loaded.",
                    };
                } catch (err) {
                    return {
                        branch: b.name,
                        displayName: b.displayName || b.name,
                        error:
                            err.response?.data?.message ||
                            "The QR payload could not be loaded.",
                    };
                }
            }),
        );
        setSheets(results);
        setLoaded(true);
        setLoading(false);
    }, [branches]);

    const printable = sheets.filter((s) => !s.error && s.configured && s.url);
    const serverNotice = sheets.find((s) => s.notice)?.notice || "";

    return (
        <>
            <Card className="mb-3 d-print-none">
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                        <h5 className="card-title mb-1">Branch check-in QR</h5>
                        <small className="text-muted">
                            A printed code that opens the member portal with this branch
                            already filled in
                        </small>
                    </div>
                    {/* Deliberately NOT gated on the `print` permission.
                        `print` in this codebase means "may take DATA out of the
                        building" — it is what the CSV exports check. A branch
                        sticker is not member data, and the QR endpoint itself is
                        gated on `read` for this page, so requiring print here
                        would hide a button the server would happily serve. That
                        is the WebsiteAdverts bug, one screen along. Printing is
                        a browser action; there is nothing further to authorise.
                     */}
                    {loaded && printable.length > 0 ? (
                        <Button
                            color="primary"
                            size="sm"
                            onClick={() => window.print()}
                            title={`Print ${printable.length} QR sheet${
                                printable.length === 1 ? "" : "s"
                            }, one branch per page`}
                        >
                            <i className="ri-printer-line align-bottom me-1" aria-hidden="true" />
                            Print {printable.length} sheet
                            {printable.length === 1 ? "" : "s"}
                        </Button>
                    ) : null}
                </CardHeader>
                <CardBody>
                    <p className="text-muted small">
                        Print one per branch and fix it where members come in. Scanning it
                        opens the portal check-in screen with that branch pre-selected,
                        which is the only reason it exists — members can already check in
                        from the portal without any code.
                    </p>
                    <p className="text-muted small">
                        <i className="ri-information-line align-bottom me-1" aria-hidden="true" />
                        A printed code can be photographed and opened from anywhere, so a
                        scan records a self-reported check-in and is not evidence of a
                        visit. If a membership has lapsed the member is told why and the
                        attempt is flagged here — nothing at the door can turn anyone away.
                    </p>

                    {branches.length === 0 ? (
                        <p className="text-muted small mb-0">
                            No branches are available to print for. If the branch master
                            failed to load, reload the page.
                        </p>
                    ) : !loaded ? (
                        <Button
                            color="light"
                            size="sm"
                            onClick={load}
                            disabled={loading || branches.length === 0}
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" className="me-1" />
                                    Loading QR codes
                                </>
                            ) : (
                                <>
                                    <i className="ri-qr-code-line align-bottom me-1" aria-hidden="true" />
                                    Show branch QR codes
                                </>
                            )}
                        </Button>
                    ) : (
                        <Row className="g-3">
                            {sheets.map((s) => (
                                <Col xs={12} sm={6} lg={4} key={s.branch}>
                                    <div className="border rounded p-3 h-100">
                                        <h6 className="mb-2">{s.displayName}</h6>

                                        {s.error ? (
                                            <p className="text-muted small mb-0">
                                                <i
                                                    className="ri-lock-line align-bottom me-1"
                                                    aria-hidden="true"
                                                />
                                                {s.error}
                                            </p>
                                        ) : !s.configured ? (
                                            /* Relative URL — a QR of it resolves to nothing
                                               on a phone, so no code is drawn at all. */
                                            <>
                                                <p className="text-danger small mb-1">
                                                    <i
                                                        className="ri-error-warning-line align-bottom me-1"
                                                        aria-hidden="true"
                                                    />
                                                    Not printable yet.
                                                </p>
                                                <p className="text-muted small mb-0">
                                                    The server has no public site address
                                                    configured, so this link is relative (
                                                    <code>{s.path || s.url}</code>) and a QR made
                                                    from it would open nothing on a phone. Set{" "}
                                                    <code>PUBLIC_SITE_ORIGIN</code> on the API and
                                                    reload.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <QrCodeSvg
                                                    value={s.url}
                                                    size="150"
                                                    label={`Check-in link for ${s.displayName}: ${s.url}`}
                                                />
                                                <p
                                                    className="text-muted mb-0 mt-2 text-break"
                                                    style={{ fontSize: "11px" }}
                                                >
                                                    {s.url}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    )}

                    {/* The server's own caveat, rendered verbatim rather than
                        paraphrased — the same discipline the panels apply to
                        `basis`. A caveat re-worded locally drifts away from the
                        thing it qualifies. */}
                    {serverNotice ? (
                        <p className="text-muted small mt-3 mb-0">
                            <i className="ri-shield-line align-bottom me-1" aria-hidden="true" />
                            {serverNotice}
                        </p>
                    ) : null}

                </CardBody>
            </Card>

            {/* ------------------------------------------------------------------
                The wall poster. Hidden on screen, one branch per printed page.
                Member-facing copy only: the staff caveats above are on screen
                and stay there — a member reading a sticker needs to know what to
                do, not how the data is qualified in a report.
               ------------------------------------------------------------------ */}
            <div className="d-none d-print-block" aria-hidden="true">
                {printable.map((s) => (
                    <section className="qr-sheet" key={s.branch}>
                        {/* The gym's own name, from the company master - not a
                            string baked into the panel, or a rebrand leaves the
                            old name on every wall. */}
                        {orgName ? (
                            <p className="qr-sheet-eyebrow">{orgName}</p>
                        ) : null}
                        <h1 className="qr-sheet-branch">{s.displayName}</h1>
                        <p className="qr-sheet-lead">Scan to check in</p>

                        <div className="qr-sheet-code">
                            <QrCodeSvg
                                value={s.url}
                                size="100%"
                                label={`Check-in link for ${s.displayName}`}
                            />
                        </div>

                        <ol className="qr-sheet-steps">
                            <li>Point your phone camera at the code.</li>
                            <li>Tap the link that appears to open the member portal.</li>
                            <li>Sign in if you are asked to, then tap Check in.</li>
                        </ol>

                        <p className="qr-sheet-alt">
                            Already signed in on your phone? You can check in from the
                            portal without this code.
                        </p>
                        <p className="qr-sheet-url">{s.url}</p>
                        <p className="qr-sheet-help">
                            Trouble checking in? Please ask at reception.
                        </p>
                    </section>
                ))}
            </div>
        </>
    );
};

BranchQrPanel.propTypes = {
    /** Physical branches from the branch master: `{ _id, name, displayName }`. */
    branches: PropTypes.array,
    /** Company name for the printed sheet's eyebrow line. Omitted if blank. */
    orgName: PropTypes.string,
};

export default BranchQrPanel;

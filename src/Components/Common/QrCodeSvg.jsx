import PropTypes from "prop-types";
import React, { useMemo } from "react";
import {
    QR_ERROR_LEVEL,
    QR_QUIET_ZONE,
    buildQrMatrix,
    qrPathData,
    qrViewBoxSize,
} from "@/utils/qrCode";

/**
 * A QR symbol as inline SVG.
 *
 * ============================================================================
 * BLACK ON WHITE IS A FUNCTIONAL REQUIREMENT, NOT A STYLE CHOICE.
 * ============================================================================
 * Everywhere else in this panel colours come from `--vz-*` tokens, and they
 * should. Not here. A scanner thresholds the camera image: the symbol needs
 * maximum luminance contrast, the quiet zone has to read as paper, and the
 * whole thing is going through a laser printer onto white A4. A themed QR —
 * primary-on-card, or anything that follows a dark mode — is a code that scans
 * on the screen it was designed on and fails on the wall.
 *
 * So the two literals below are deliberate and must not be tokenised. The
 * <rect> is drawn rather than left transparent for the same reason: on a dark
 * theme an unpainted background would let the page's ground show through the
 * quiet zone and invert half the symbol.
 *
 * ACCESSIBILITY: a QR is an image of a link, so it gets role="img" and a name
 * that says where the link goes. `label` is required — a nameless QR is an
 * unlabelled image, and it is also the only clue a screen-reader user has that
 * the URL printed beneath it is the same destination.
 */
// Defaults live in the signature, not in QrCodeSvg.defaultProps: React 18.3
// console.errors on defaultProps for a function component, and the browser gate
// treats a console error as a failure.
const QrCodeSvg = ({
    value,
    label,
    level = QR_ERROR_LEVEL,
    size = "100%",
    className = "",
}) => {
    const matrix = useMemo(() => buildQrMatrix(value, level), [value, level]);
    const path = useMemo(
        () => (matrix ? qrPathData(matrix.rows, QR_QUIET_ZONE) : ""),
        [matrix],
    );

    if (!matrix) {
        // Nothing to encode, or a string too long for any version. Never a
        // blank square that looks like a printer problem.
        return (
            <p className="text-danger small mb-0">
                This link could not be turned into a QR code.
            </p>
        );
    }

    const side = qrViewBoxSize(matrix.count, QR_QUIET_ZONE);

    return (
        <svg
            className={className}
            role="img"
            aria-label={label}
            viewBox={`0 0 ${side} ${side}`}
            width={size}
            height={size}
            // Without this the renderer antialiases every module edge, which
            // at small print sizes blurs the 1-module timing pattern into grey.
            shapeRendering="crispEdges"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width={side} height={side} fill="#ffffff" />
            <path d={path} fill="#000000" />
        </svg>
    );
};

QrCodeSvg.propTypes = {
    /** The exact string to encode. Encoded verbatim — no trailing slash fixes. */
    value: PropTypes.string.isRequired,
    /** Accessible name. Say where the link goes, not "QR code". */
    label: PropTypes.string.isRequired,
    level: PropTypes.oneOf(["L", "M", "Q", "H"]),
    /** Any CSS length. Defaults to filling the container's width. */
    size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    className: PropTypes.string,
};

export default QrCodeSvg;

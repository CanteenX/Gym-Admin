/**
 * QR encoding for the printed branch stickers.
 *
 * ============================================================================
 * WHY THIS EXISTS AT ALL: THE SERVER RETURNS A URL, NOT AN IMAGE.
 * ============================================================================
 * `GET /attendance/qr/:branch` answers with `{ branch, displayName, url, path,
 * configured, instructions, notice }`. It deliberately has no QR encoder: the
 * payload is one short ASCII URL, the server's dependency tree is already
 * carrying a critical advisory, and the admin has to lay the sticker out around
 * the code anyway. So the encoding happens here.
 *
 * ============================================================================
 * WHY A LIBRARY AND NOT A HAND-ROLLED ENCODER
 * ============================================================================
 * A QR symbol is not a bitmap of the text. It is Reed-Solomon error-correction
 * blocks, interleaved, laid into a fixed module map around finder/alignment/
 * timing patterns, then XOR-ed with whichever of eight mask patterns scores
 * best under four penalty rules. Getting any one of those subtly wrong produces
 * a code that still LOOKS like a QR code and still renders — it just does not
 * scan, or scans on one phone and not another. On a sticker that goes on a wall
 * and is not read back by anything we control, that failure is invisible until
 * a member is standing in front of it.
 *
 * `qrcode-generator` (Kazuhiko Arase, MIT, 2.0.4) is the reference JS port,
 * ~14 years old, and — the point that decided it — has ZERO runtime
 * dependencies. It adds exactly one package to a tree that already carries 21
 * known advisories, and `npm audit` is unchanged after installing it.
 *
 * It is used for the matrix ONLY. Its own toDataURL/createSvgTag helpers are
 * not used: this file turns the matrix into a single SVG path so the sheet
 * controls its own sizing, quiet zone and print rendering, with no <canvas>,
 * no raster step and nothing to go blurry at 300dpi.
 */
import qrcode from "qrcode-generator";

/**
 * Error correction level M — ~15% recoverable.
 *
 * L is tempting because it makes the symbol smaller, but this code is printed,
 * stuck to a wall by a door, and then lives there: it gets scuffed, smudged and
 * partly peeled. H would survive more of that but grows the symbol by roughly a
 * version and a half for a URL this long, which means larger modules are needed
 * for the same scan distance. M is the usual choice for print for exactly this
 * trade.
 */
export const QR_ERROR_LEVEL = "M";

/**
 * The white margin around the symbol, in modules. Four is the spec minimum and
 * is not decoration — scanners use it to find the symbol edge, and a QR printed
 * flush to a coloured card border is a well known "why won't it scan".
 */
export const QR_QUIET_ZONE = 4;

/**
 * Encode `text` into a module matrix.
 *
 * @param {string} text
 * @param {string} [level] one of "L" | "M" | "Q" | "H"
 * @returns {{ count: number, rows: boolean[][] } | null}
 *   `null` when there is nothing to encode or the string will not fit in any
 *   version — never a throw, because the caller is a render path and a thrown
 *   error there takes the whole attendance screen down with it.
 */
export const buildQrMatrix = (text, level = QR_ERROR_LEVEL) => {
    const value = String(text || "").trim();
    if (!value) return null;

    try {
        // Type number 0 = pick the smallest version the data fits in.
        const qr = qrcode(0, level);
        qr.addData(value);
        qr.make();

        const count = qr.getModuleCount();
        const rows = [];
        for (let r = 0; r < count; r += 1) {
            const row = [];
            // isDark is (row, column) — transposing it produces a mirrored
            // symbol that is still a plausible-looking grid and never scans.
            for (let c = 0; c < count; c += 1) row.push(qr.isDark(r, c));
            rows.push(row);
        }
        return { count, rows };
    } catch {
        return null;
    }
};

/** Side of the rendered square, in modules, including both quiet zones. */
export const qrViewBoxSize = (count, quietZone = QR_QUIET_ZONE) =>
    count + quietZone * 2;

/**
 * The dark modules as one SVG path.
 *
 * ONE PATH, NOT ONE <rect> PER MODULE. A 37x37 symbol is ~700 dark modules;
 * as separate rects that is 700 nodes, and browsers antialias each rect edge
 * independently, which prints as hairline white seams between adjacent modules.
 * A single path with one closed subpath per module is drawn as one shape, so
 * adjacent modules merge exactly.
 *
 * @param {boolean[][]} rows
 * @param {number} [quietZone]
 * @returns {string} the `d` attribute, or "" when there is nothing to draw
 */
export const qrPathData = (rows, quietZone = QR_QUIET_ZONE) => {
    if (!Array.isArray(rows) || rows.length === 0) return "";
    const parts = [];
    rows.forEach((row, r) => {
        row.forEach((dark, c) => {
            if (!dark) return;
            parts.push(`M${c + quietZone} ${r + quietZone}h1v1h-1z`);
        });
    });
    return parts.join("");
};

export default { QR_ERROR_LEVEL, QR_QUIET_ZONE, buildQrMatrix, qrViewBoxSize, qrPathData };

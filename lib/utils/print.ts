import { Alert } from "react-native";
import * as PrintAPI from "expo-print";
import QRCode from "qrcode";

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when `error` looks like a user-initiated dismissal of the
 * native print dialog (iOS/Android close/cancel) rather than a real failure.
 */
export function isPrintCancellation(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  // Covers iOS ("did not complete"), Android ("aborted", "cancelled"),
  // and common user-dismissed / no-printer signals.
  return /cancel|cancelled|canceled|dismiss|closed|abort|did not complete|no print|not complete|operation.*aborted/i.test(
    message,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Core print executor
// ─────────────────────────────────────────────────────────────────────────────

export type PrintResult = "printed" | "cancelled" | "error";

export type PrintOptions = {
  /** Called on non-cancellation errors. Defaults to a system Alert. */
  onError?: (error: Error) => void;
};

/** Opens the native print dialog with the supplied HTML. */
export async function printHtml(
  html: string,
  options?: PrintOptions,
): Promise<PrintResult> {
  try {
    await PrintAPI.printAsync({ html });
    return "printed";
  } catch (error) {
    if (isPrintCancellation(error)) return "cancelled";
    const err = error instanceof Error ? error : new Error(String(error));
    if (options?.onError) options.onError(err);
    else Alert.alert("Print failed", "Could not open the print dialog.");
    return "error";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QR → inline SVG
//
// SVG renders reliably in every print engine (iOS UIPrinter, Android
// PrintManager, browser print preview). Built from the pure-JS `qrcode`
// core — no canvas, no fs, fully synchronous.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a self-contained inline `<svg>` QR code for `data`.
 * Uses `viewBox`, so it scales to whatever CSS size the parent provides
 * (e.g. `width: 40mm; height: 40mm`).
 */
export function buildQrSvg(data: string): string {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const modules = Array.prototype.slice.call(qr.modules.data, 0) as number[];
  const size = Math.round(Math.sqrt(modules.length));

  let rects = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y * size + x]) {
        rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" ` +
    `width="100%" height="100%">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<g fill="#000">${rects}</g>` +
    `</svg>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Label / sticker sheet builder
//
// Designed for small thermal label printers (e.g. 50×50 mm, 40×30 mm).
// One sticker = one page, so each label prints on its own physical sticker.
// ─────────────────────────────────────────────────────────────────────────────

export type StickerEntry = {
  /** Code encoded in the QR and printed as text */
  code: string;
  /** Key type label shown on the sticker (e.g. "Door", "Mailbox") */
  label: string;
  /** Number of identical sticker copies to output */
  count: number;
};

export type StickerPageOptions = {
  /** Physical label width  (default "50mm") */
  width?: string;
  /** Physical label height (default "50mm") */
  height?: string;
  /** Optional set/sheet label printed above the key label */
  setLabel?: string;
};

/**
 * Build a print-ready HTML document with one centred sticker per page.
 *
 *   ┌──────────────┐
 *   │   [ QR  ]    │
 *   │   CODE       │
 *   │   set name   │
 *   │   key label  │
 *   └──────────────┘
 */
export function buildStickerPage(
  entries: StickerEntry[],
  setLabelOrOptions: string | StickerPageOptions = "",
): string {
  const opts: StickerPageOptions =
    typeof setLabelOrOptions === "string"
      ? { setLabel: setLabelOrOptions }
      : setLabelOrOptions;

  const width = opts.width ?? "50mm";
  const height = opts.height ?? "50mm";
  const setLabel = opts.setLabel ?? "";

  const stickers = entries.flatMap(({ code, label, count }) =>
    Array.from({ length: Math.max(1, count) }, () => ({ code, label })),
  );
  if (stickers.length === 0) stickers.push({ code: "", label: "" });

  const pages = stickers
    .map(({ code, label }, i) => {
      const last = i === stickers.length - 1;
      const breakStyle = last ? "" : "page-break-after:always;";
      return `
        <section class="label" style="${breakStyle}">
          ${code ? `<div class="qr">${buildQrSvg(code)}</div>` : ""}
          ${code ? `<div class="code">${escapeHtml(code)}</div>` : ""}
          ${setLabel ? `<div class="set">${escapeHtml(setLabel)}</div>` : ""}
          ${label ? `<div class="key">${escapeHtml(label)}</div>` : ""}
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: ${width} ${height}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: ${width}; background: #fff; color: #000; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .label {
        width: ${width};
        height: ${height};
        padding: 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        overflow: hidden;
      }
      .qr {
        flex: 1 1 auto;
        width: 100%;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qr svg { width: 100%; height: 100%; max-width: 100%; max-height: 100%; }
      .code {
        font-family: 'Courier New', monospace;
        font-size: 9pt;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-top: 1mm;
        word-break: break-all;
        line-height: 1.1;
      }
      .set {
        font-size: 6pt;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-top: 0.5mm;
      }
      .key {
        font-size: 8pt;
        font-weight: 600;
        margin-top: 0.5mm;
      }
    </style>
  </head>
  <body>${pages}</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-code convenience wrapper (back-compat with buildQrPrintPage)
// ─────────────────────────────────────────────────────────────────────────────

export type QrPrintPageOptions = {
  /** Code displayed under the QR and encoded inside it */
  code: string;
  /** Title shown above the QR (e.g. property/set name) */
  title?: string;
  /** Optional secondary label shown below the code */
  subtitle?: string;
};

/**
 * Build a compact QR label — optimised for label / sticker printers.
 * Uses `size: auto` so the printer picks its own paper size.
 */
export function buildQrPrintPage({
  code,
  title,
  subtitle,
}: QrPrintPageOptions): string {
  const qrSvg = buildQrSvg(code);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: auto; margin: 4mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #fff; color: #000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3mm;
        padding: 2mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .qr { width: 60mm; height: 60mm; }
      .qr svg { width: 100%; height: 100%; display: block; }
      .title { font-size: 10pt; font-weight: 700; text-align: center; }
      .code  { font-family: 'Courier New', monospace; font-size: 8pt; font-weight: 700; letter-spacing: 0.5px; text-align: center; }
      .sub   { font-size: 7pt; color: #555; text-align: center; }
    </style>
  </head>
  <body>
    <div class="qr">${qrSvg}</div>
    ${title ? `<p class="title">${escapeHtml(title)}</p>` : ""}
    <p class="code">${escapeHtml(code)}</p>
    ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ""}
  </body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

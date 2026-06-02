import { Alert } from "react-native";
import * as PrintAPI from "expo-print";
import QRCode from "qrcode";

// ── Cancellation detection ────────────────────────────────────────────────────

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

// ── Core print executor ───────────────────────────────────────────────────────

export type PrintResult = "printed" | "cancelled" | "error";

export type PrintOptions = {
  /**
   * Called when a real (non-cancellation) print error occurs.
   * If omitted, the default Alert is shown.
   */
  onError?: (error: Error) => void;
};

/**
 * Opens the native print dialog with the supplied HTML.
 *
 * - Returns `"printed"`   when the job is dispatched.
 * - Returns `"cancelled"` when the user intentionally dismisses the dialog.
 * - Returns `"error"`     (and shows an alert) when a real error occurs.
 */
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
    if (options?.onError) {
      options.onError(err);
    } else {
      Alert.alert("Print failed", "Could not open the print dialog.");
    }
    return "error";
  }
}

// ── HTML page template builder ────────────────────────────────────────────────

export type PrintPageOptions = {
  /** Bold heading rendered at the top of the page */
  title?: string;
  /** HTML string for the body content */
  content: string;
  /** Small footer line — defaults to "Happy Landlord" */
  footer?: string;
  /** Extra CSS injected into <style> (optional overrides / additions) */
  extraCss?: string;
};

/**
 * Wraps a content HTML fragment in a fully-styled, print-ready page.
 *
 * Usage:
 * ```ts
 * const html = buildPrintPage({
 *   title: "Property Code",
 *   content: `<img src="${qrUrl}" />`,
 * });
 * await printHtml(html);
 * ```
 */
export function buildPrintPage({
  title,
  content,
  footer = "Happy Landlord",
  extraCss = "",
}: PrintPageOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #fff;
        color: #262626;
        padding: 48px;
      }
      .page-title {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.4px;
        margin-bottom: 28px;
      }
      .page-content { width: 100%; }
      .page-footer {
        margin-top: 36px;
        font-size: 11px;
        color: #746B5D;
        text-align: center;
        border-top: 1px solid #E5DDCE;
        padding-top: 12px;
      }
      ${extraCss}
    </style>
  </head>
  <body>
    ${title ? `<p class="page-title">${title}</p>` : ""}
    <div class="page-content">${content}</div>
    <div class="page-footer">${footer}</div>
  </body>
</html>`;
}
// ── QR code helpers ───────────────────────────────────────────────────────────
//
// QR codes are rendered as HTML <table> elements — one <td> per module,
// coloured black or white. This approach is universally compatible with any
// HTML renderer including iOS/Android WebViews and the print preview.
//
// We use QRCode.create() from the `qrcode` package (pure-JS core, no canvas,
// no fs). This is the same function react-native-qrcode-svg uses internally.

/**
 * Builds an HTML `<table>` representing the QR code for `data`.
 * Each table cell is one QR module — black or white inline background.
 * No SVG, no canvas, no external resources.
 *
 * @param data    String to encode.
 * @param cellPx  Pixel size of each module cell (default 5).
 */
function buildQrTable(data: string, cellPx = 5): string {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const raw = Array.prototype.slice.call(qr.modules.data, 0) as number[];
  const side = Math.round(Math.sqrt(raw.length));

  const cellStyle = `width:${cellPx}px;height:${cellPx}px;padding:0;`;
  let table =
    `<table style="border-collapse:collapse;border-spacing:0;` +
    `font-size:0;line-height:0;display:inline-table;">`;

  for (let row = 0; row < side; row++) {
    table += `<tr>`;
    for (let col = 0; col < side; col++) {
      const dark = raw[row * side + col];
      table += `<td style="${cellStyle}background:${dark ? "#000" : "#fff"};"></td>`;
    }
    table += `</tr>`;
  }
  table += `</table>`;
  return table;
}

export type QrPrintPageOptions = {
  /** The primary code/text displayed above the QR image */
  code: string;
  /** Optional page title rendered at the very top */
  title?: string;
  /** Optional secondary line shown below the QR image */
  subtitle?: string;
  /** Footer line — defaults to "Happy Landlord" */
  footer?: string;
  /** QR cell size in pixels (default 6) */
  cellPx?: number;
};

/**
 * Builds a print-ready HTML page with a centred QR code (table-based) and code label.
 */
export function buildQrPrintPage({
  code,
  title,
  subtitle,
  footer,
  cellPx = 6,
}: QrPrintPageOptions): string {
  const qrTable = buildQrTable(code, cellPx);
  const subtitleHtml = subtitle
    ? `<p style="font-size:14px;color:#746B5D;margin-top:10px;">${subtitle}</p>`
    : "";
  const content = `
    <div style="text-align:center;padding:16px 0;">
      <p style="font-family:'Courier New',monospace;font-size:20px;font-weight:bold;
                letter-spacing:2px;margin-bottom:20px;">${code}</p>
      ${qrTable}
      ${subtitleHtml}
    </div>`;
  return buildPrintPage({ title, content, footer });
}

// ── Sticker sheet builder ─────────────────────────────────────────────────────

export type StickerEntry = {
  /** Code encoded in the QR and printed as text */
  code: string;
  /** Key type label shown on the sticker (e.g. "Door", "Mailbox") */
  label: string;
  /** Number of identical sticker copies to output */
  count: number;
};

/**
 * Builds a print-ready A4 sticker sheet.
 * Each sticker shows a QR code (table-based), the set code, and the key label.
 * Stickers are laid out in a grid — `count` copies per entry.
 */
export function buildStickerPage(entries: StickerEntry[], setLabel = ""): string {
  const stickers = entries.flatMap(({ code, label, count }) =>
    Array.from({ length: count }, () => ({ code, label })),
  );

  const cells = stickers
    .map(({ code, label }) => {
      const qrTable = buildQrTable(code, 4);
      return `
        <div class="sticker">
          <div class="sticker-qr">${qrTable}</div>
          <p class="sticker-code">${code}</p>
          <p class="sticker-label">${label}</p>
        </div>`;
    })
    .join("");

  const titleLine = setLabel
    ? `<p class="sheet-title">${setLabel} — Key Stickers</p>`
    : "";

  return buildPrintPage({
    content: `${titleLine}<div class="sticker-grid">${cells}</div>`,
    footer: "Happy Landlord — Key Record",
    extraCss: `
      body { padding: 24px; }
      .sheet-title {
        font-size: 12px;
        font-weight: 600;
        color: #746B5D;
        letter-spacing: 0.4px;
        margin-bottom: 14px;
        text-transform: uppercase;
      }
      .sticker-grid {
        display: block;
      }
      .sticker {
        display: inline-block;
        vertical-align: top;
        width: 120px;
        border: 1px dashed #C4BAA8;
        border-radius: 4px;
        padding: 8px 6px 6px;
        text-align: center;
        margin: 5px;
        page-break-inside: avoid;
      }
      .sticker-qr { display: block; margin: 0 auto 5px; }
      .sticker-code {
        font-family: 'Courier New', monospace;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #262626;
        word-break: break-all;
        margin-bottom: 2px;
      }
      .sticker-label {
        font-size: 10px;
        color: #746B5D;
      }
    `,
  });
}


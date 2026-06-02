import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { theme } from "@/constants";
import { buildStickerPage, type StickerEntry } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CodeStickerCardProps = {
  /** Used as the sticker sheet label and accessible name — not shown on card */
  title: string;
  /** The code string to display and encode in the QR. Null shows loading state. */
  code: string | null;
  /** Shows a loading spinner instead of the code/QR while true */
  loading?: boolean;
  /** Accent colour used for the code text — defaults to primary */
  color?: string;
  /**
   * Sticker entries to print. Each entry produces `count` identical stickers.
   * Defaults to a single sticker: `[{ code, label: title, count: 1 }]`.
   */
  stickerEntries?: StickerEntry[];
  /** Sheet title printed at the top of the sticker page */
  stickerSheetLabel?: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CodeStickerCard({
  title,
  code,
  loading = false,
  color = theme.colors.primary,
  stickerEntries,
  stickerSheetLabel,
}: CodeStickerCardProps) {
  if (!code && !loading) return null;

  const entries: StickerEntry[] =
    stickerEntries ?? (code ? [{ code, label: title, count: 1 }] : []);
  const sheetLabel = stickerSheetLabel ?? title;

  return (
    <View style={styles.card}>
      {loading ? (
        /* ── Loading state ─────────────────────────────────────────────── */
        <View style={styles.loadingBody}>
          <ActivityIndicator size="small" color={color} />
          <Text style={styles.loadingText}>Generating code…</Text>
        </View>
      ) : (
        /* ── Content ───────────────────────────────────────────────────── */
        <View style={styles.body}>
          {/* Code — top */}
          <Text style={[styles.code, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {code}
          </Text>

          {/* QR — centre */}
          <View style={[styles.qrWrap, { borderColor: color + "33" }]}>
            <QRCode
              value={code!}
              size={160}
              backgroundColor={theme.colors.surface}
              color={theme.colors.text}
            />
          </View>

          {/* Sticker summary (keyset only) */}
          {stickerEntries && stickerEntries.length > 0 && (
            <Text style={styles.stickerSummary}>
              {stickerEntries.reduce((s, e) => s + e.count, 0)}{" "}
              {stickerEntries.reduce((s, e) => s + e.count, 0) === 1 ? "sticker" : "stickers"} ·{" "}
              {stickerEntries.map((e) => `${e.label} ×${e.count}`).join(", ")}
            </Text>
          )}

          {/* Print button — bottom */}
          <PrintButton
            variant="pill"
            label="Print"
            disabled={!code || loading}
            buildHtml={code ? () => buildStickerPage(entries, sheetLabel) : undefined}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },

  // ── Loading ────────────────────────────────────────────────────────────────
  loadingBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textLight,
  },

  // ── Body ───────────────────────────────────────────────────────────────────
  body: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  code: {
    fontFamily: "monospace",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  qrWrap: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
  },
  stickerSummary: {
    fontSize: 11,
    color: theme.colors.textLight,
    textAlign: "center",
    lineHeight: 15,
  },
});

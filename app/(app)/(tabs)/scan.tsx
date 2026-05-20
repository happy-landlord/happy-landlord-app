import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult } from "expo-camera";
import { ScanLine, X, RefreshCw } from "lucide-react-native";

import { fetchPropertyByCode } from "@/services/properties.service";
import { theme } from "@/constants/theme";

// ---------------------------------------------------------------------------
// QR payload parser
// QR codes encode the property_code (e.g. "HL-00123") either:
//   1. As a raw string                → treated as a property_code directly
//   2. JSON { type: "property", code: "HL-00123" }
//   3. TODO: other entity types (keys, tenants, etc.)
// ---------------------------------------------------------------------------
function parseQrPayload(raw: string): { type: "property"; code: string } | null {
  const trimmed = raw.trim();

  // Try JSON first
  try {
    const parsed = JSON.parse(trimmed) as { type?: string; code?: string };
    if (parsed.type === "property" && typeof parsed.code === "string") {
      return { type: "property", code: parsed.code };
    }
    // TODO: handle other entity types (e.g. keys, tenants)
    return null;
  } catch {
    // Fall through — treat raw string as a property_code
  }

  // Accept any non-empty string as a property code
  if (trimmed.length > 0) {
    return { type: "property", code: trimmed };
  }

  return null;
}

type ScanState =
  | { status: "scanning" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notFound" };

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>({ status: "scanning" });
  const processingRef = useRef(false);

  const reset = useCallback(() => {
    processingRef.current = false;
    setScanState({ status: "scanning" });
  }, []);

  const handleBarCodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      // Prevent double-firing
      if (processingRef.current) return;
      processingRef.current = true;

      const payload = parseQrPayload(data);

      if (!payload) {
        setScanState({
          status: "error",
          message: "This QR code isn't recognised. Please scan a Happy Landlord QR code.",
        });
        return;
      }

      setScanState({ status: "loading" });

      try {
        if (payload.type === "property") {
          const property = await fetchPropertyByCode(payload.code);
          if (!property) {
            setScanState({ status: "notFound" });
            return;
          }
          // Navigate to property detail and reset scanner for next use
          router.push(`/(app)/properties/${property.id}` as never);
          setTimeout(reset, 800);
          return;
        }

        // TODO: handle other entity types
        setScanState({
          status: "error",
          message: `QR type "${payload.type}" is not yet supported.`,
        });
      } catch {
        setScanState({
          status: "error",
          message: "Something went wrong while looking up this QR code.",
        });
      }
    },
    [router, reset]
  );

  // ── Permission not yet determined ─────────────────────────────────────────
  if (!permission) {
    return <View style={styles.fill} />;
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, { paddingBottom: insets.bottom }]}>
        <ScanLine size={48} color={theme.colors.primary} strokeWidth={1.5} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          Allow camera access so you can scan Happy Landlord QR codes.
        </Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnLabel}>Grant access</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main scanner ──────────────────────────────────────────────────────────
  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          scanState.status === "scanning" ? handleBarCodeScanned : undefined
        }
      />

      {/* Dark overlay with cutout */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top mask */}
        <View style={styles.maskTop} />
        <View style={styles.maskRow}>
          {/* Left mask */}
          <View style={styles.maskSide} />
          {/* Viewfinder */}
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {scanState.status === "loading" && (
              <ActivityIndicator
                size="large"
                color="#fff"
                style={styles.spinnerInner}
              />
            )}
          </View>
          {/* Right mask */}
          <View style={styles.maskSide} />
        </View>
        {/* Bottom mask */}
        <View style={styles.maskBottom} />
      </View>

      {/* Instruction / status text */}
      <View
        style={[styles.statusBox, { paddingBottom: insets.bottom + theme.spacing.xl }]}
        pointerEvents="none"
      >
        {scanState.status === "scanning" && (
          <Text style={styles.hint}>Point at a QR code to scan</Text>
        )}
        {scanState.status === "loading" && (
          <Text style={styles.hint}>Looking up property…</Text>
        )}
        {scanState.status === "notFound" && (
          <Text style={[styles.hint, styles.hintError]}>
            No property found for this QR code.
          </Text>
        )}
        {scanState.status === "error" && (
          <Text style={[styles.hint, styles.hintError]}>
            {scanState.message}
          </Text>
        )}
      </View>

      {/* Retry button — shown after errors */}
      {(scanState.status === "error" || scanState.status === "notFound") && (
        <View
          style={[styles.retryRow, { bottom: insets.bottom + theme.spacing.md }]}
        >
          <Pressable style={styles.retryBtn} onPress={reset}>
            <RefreshCw size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.retryLabel}>Scan again</Text>
          </Pressable>
        </View>
      )}

      {/* Close button */}
      <Pressable
        style={[styles.closeBtn, { top: insets.top + theme.spacing.sm }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <X size={20} color="#fff" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const FINDER_SIZE = 240;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const MASK_COLOR = "rgba(0,0,0,0.55)";

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.xl },

  // ── Permission prompt ────────────────────────────────────────────────────
  permTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  permBody: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  btnLabel: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // ── Overlay masks ────────────────────────────────────────────────────────
  maskTop: { flex: 1, backgroundColor: MASK_COLOR },
  maskRow: { flexDirection: "row", height: FINDER_SIZE },
  maskSide: { flex: 1, backgroundColor: MASK_COLOR },
  maskBottom: { flex: 1.5, backgroundColor: MASK_COLOR },

  // ── Viewfinder ───────────────────────────────────────────────────────────
  viewfinder: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#fff",
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  spinnerInner: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },

  // ── Status / hint text ────────────────────────────────────────────────────
  statusBox: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  hint: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    fontWeight: "500",
  },
  hintError: {
    color: "#FF7B7B",
  },

  // ── Retry ─────────────────────────────────────────────────────────────────
  retryRow: {
    position: "absolute",
    left: 0, right: 0,
    alignItems: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
  },
  retryLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // ── Close ─────────────────────────────────────────────────────────────────
  closeBtn: {
    position: "absolute",
    right: theme.spacing.screen,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});

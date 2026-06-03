import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Sharing from "expo-sharing";
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { Share2 } from "lucide-react-native";

import { theme } from "@/constants";
import { keySetQrUrl } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShareQrButtonProps = Omit<PressableProps, "onPress"> & {
  /** The value encoded in the QR (e.g. keyset code) */
  code: string;
  /** Used as the share dialog title */
  title?: string;
  /** @default "icon" */
  variant?: "pill" | "icon";
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Generates a QR code PNG and opens the native iOS/Android share sheet.
 * The sheet includes Save to Photos, Print (AirPrint), AirDrop, Files, etc.
 */
export function ShareQrButton({
  code,
  title,
  variant = "icon",
  style,
  ...pressableProps
}: ShareQrButtonProps) {
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<{
    toDataURL: (cb: (data: string) => void) => void;
  } | null>(null);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "Not supported",
          "Sharing is not available on this device.",
        );
        setBusy(false);
        return;
      }

      svgRef.current?.toDataURL(async (base64: string) => {
        try {
          const uri = `${cacheDirectory}qr_${Date.now()}.png`;
          await writeAsStringAsync(uri, base64, {
            encoding: EncodingType.Base64,
          });
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            UTI: "public.png",
            dialogTitle: title ? `Share QR — ${title}` : "Share QR Code",
          });
        } catch {
          Alert.alert("Error", "Could not open share sheet.");
        } finally {
          setBusy(false);
        }
      });
    } catch {
      Alert.alert("Error", "Could not generate QR image.");
      setBusy(false);
    }
  }

  const label = "Share QR";

  return (
    <>
      {/* Hidden QR rendered off-screen for PNG capture — encodes deep-link URL */}
      <View style={styles.hidden} pointerEvents="none">
        <QRCode
          value={keySetQrUrl(code || " ")}
          size={512}
          getRef={(ref) => {
            svgRef.current = ref as typeof svgRef.current;
          }}
        />
      </View>

      {variant === "pill" ? (
        <Pressable
          style={({ pressed }) => [
            styles.pillBtn,
            pressed && styles.pressed,
            busy && styles.disabled,
            style as object,
          ]}
          onPress={handleShare}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={label}
          {...pressableProps}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Share2 size={14} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.pillText}>{label}</Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.pressed,
            busy && styles.disabled,
            style as object,
          ]}
          onPress={handleShare}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={label}
          {...pressableProps}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Share2 size={18} color={theme.colors.primary} strokeWidth={2} />
          )}
        </Pressable>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    left: -2000,
    top: -2000,
    opacity: 0,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },

  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    minWidth: 72,
    justifyContent: "center",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});

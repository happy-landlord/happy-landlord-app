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
import { PillButton } from "./PillButton";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShareQrButtonProps = Omit<PressableProps, "onPress"> & {
  /** The value encoded in the QR (e.g. keyset code) */
  code: string;
  /** Used as the share dialog title */
  title?: string;
  /** @default "icon" */
  variant?: "pill" | "icon" | "overlay";
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
        <PillButton
          label={label}
          variant="accent"
          icon={
            busy ? null : (
              <Share2 size={14} color={theme.colors.accent} strokeWidth={2} />
            )
          }
          loading={busy}
          disabled={busy}
          onPress={handleShare}
          accessibilityLabel={label}
          style={style as object}
          {...pressableProps}
        />
      ) : variant === "overlay" ? (
        <Pressable
          style={({ pressed }) => [
            styles.overlayBtn,
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
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Share2 size={13} color={theme.colors.textInverse} strokeWidth={2} />
              <Text style={styles.overlayBtnText}>Share</Text>
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

  overlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentDark + "85",
  },
  overlayBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textInverse,
  },
});

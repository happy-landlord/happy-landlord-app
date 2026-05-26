import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { Printer } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { printHtml } from "@/lib/print";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Visual style of the button. */
export type PrintButtonVariant = "pill" | "icon" | "full";

export type PrintButtonProps = Omit<PressableProps, "onPress"> & {
  /**
   * Pre-built HTML string to print directly.
   * Mutually exclusive with `buildHtml`.
   */
  html?: string;
  /**
   * Called just before printing to produce the HTML.
   * Use this when the HTML depends on state computed at press time.
   * May be async.
   */
  buildHtml?: () => string | Promise<string>;
  /** Button label — defaults to "Print" (ignored for `icon` variant) */
  label?: string;
  /** @default "pill" */
  variant?: PrintButtonVariant;
  disabled?: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A drop-in print trigger button.
 *
 * ```tsx
 * // Pill (default) — ideal for card headers
 * <PrintButton buildHtml={buildMyHtml} />
 *
 * // Icon only — compact, for toolbars
 * <PrintButton html={html} variant="icon" />
 *
 * // Full-width — standalone CTA
 * <PrintButton buildHtml={buildMyHtml} variant="full" label="Print Receipt" />
 * ```
 */
export function PrintButton({
  html,
  buildHtml,
  label = "Print",
  variant = "pill",
  disabled = false,
  style,
  ...pressableProps
}: PrintButtonProps) {
  const [printing, setPrinting] = useState(false);

  async function handlePress() {
    if (printing) return;
    setPrinting(true);
    try {
      const resolvedHtml = buildHtml ? await buildHtml() : (html ?? "");
      if (!resolvedHtml.trim()) {
        Alert.alert("Print Error", "No content to print.");
        return;
      }
      await printHtml(resolvedHtml);
    } catch (err) {
      // Surface the real error so issues can be diagnosed
      Alert.alert("Print Error", err instanceof Error ? err.message : String(err));
    } finally {
      setPrinting(false);
    }
  }

  const isDisabled = disabled || printing || (!html && !buildHtml);

  if (variant === "icon") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && styles.iconBtnPressed,
          isDisabled && styles.disabled,
          style as object,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: printing }}
        {...pressableProps}
      >
        {printing ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Printer size={18} color={theme.colors.primary} strokeWidth={2} />
        )}
      </Pressable>
    );
  }

  if (variant === "full") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.fullBtn,
          pressed && styles.fullBtnPressed,
          isDisabled && styles.disabled,
          style as object,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: printing }}
        {...pressableProps}
      >
        {printing ? (
          <ActivityIndicator size="small" color={theme.colors.textInverse} />
        ) : (
          <View style={styles.row}>
            <Printer size={16} color={theme.colors.textInverse} strokeWidth={2} />
            <Text style={styles.fullBtnText}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // ── Default: pill ─────────────────────────────────────────────────────────
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pillBtn,
        pressed && styles.pillBtnPressed,
        isDisabled && styles.disabled,
        style as object,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: printing }}
      {...pressableProps}
    >
      {printing ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <>
          <Printer size={14} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.pillBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },

  // ── Pill ────────────────────────────────────────────────────────────────────
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
  pillBtnPressed: { opacity: 0.65 },
  pillBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },

  // ── Icon ────────────────────────────────────────────────────────────────────
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
  iconBtnPressed: { opacity: 0.65 },

  // ── Full ────────────────────────────────────────────────────────────────────
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    minHeight: 48,
  },
  fullBtnPressed: { opacity: 0.75 },
  fullBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textInverse,
  },
});


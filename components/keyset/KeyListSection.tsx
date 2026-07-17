import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { KEY_TYPE_ICON, theme } from "@/constants";
import { getKeyName } from "@/lib/utils";
import type { KeyInSet } from "@/lib/services";

// ── Single key row ──────────────────────────────────────────────────────────

function KeyRow({
  item,
  assigned,
  disabled,
  onPress,
}: {
  item: KeyInSet;
  assigned: boolean;
  disabled?: boolean;
  onPress: (k: KeyInSet) => void;
}) {
  const Icon = KEY_TYPE_ICON[item.key_type] ?? KeyRound;
  return (
    <Pressable
      onPress={() => onPress(item)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.keyRow,
        assigned && styles.assignedKeyRow,
        pressed && { opacity: 0.65 },
      ]}
    >
      <View style={[styles.keyIconCircle, assigned && styles.assignedKeyIconCircle]}>
        <Icon
          size={14}
          color={assigned ? theme.colors.surface : theme.colors.accent}
          strokeWidth={1.8}
        />
      </View>
      <View style={styles.keyInfo}>
        <Text style={styles.keyLabel} numberOfLines={1}>
          {getKeyName(item)}
        </Text>
        {item.code ? (
          <View style={styles.codeChip}>
            <Text style={styles.codeChipText}>{item.code}</Text>
          </View>
        ) : null}
      </View>
      {(item.quantity ?? 1) > 1 && (
        <View style={styles.qtyChip}>
          <Text style={styles.qtyChipText}>×{item.quantity}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Labeled group of key rows ───────────────────────────────────────────────

export interface KeyListSectionProps {
  label: string;
  keys: KeyInSet[];
  /** `true` for the assigned bucket (accent styling), `false` for available. */
  assigned: boolean;
  onPressKey: (k: KeyInSet) => void;
  disabled?: boolean;
  /** Rendered under the label when `keys` is empty. Omit to hide when empty. */
  emptyText?: string;
}

/**
 * Renders a labeled list of selectable key rows, shared by the add- and
 * edit-keyset screens. Tapping a row calls `onPressKey` (assign/unassign).
 */
export function KeyListSection({
  label,
  keys,
  assigned,
  onPressKey,
  disabled,
  emptyText,
}: KeyListSectionProps) {
  if (keys.length === 0 && !emptyText) return null;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {keys.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.keyList}>
          {keys.map((k) => (
            <KeyRow
              key={k.id}
              item={k}
              assigned={assigned}
              disabled={disabled}
              onPress={onPressKey}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  keyList: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assignedKeyRow: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentLight,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  assignedKeyIconCircle: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  keyInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    flexShrink: 1,
  },
  codeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  codeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  qtyChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
});






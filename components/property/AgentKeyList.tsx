import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/constants/theme";
import type { KeyType } from "@/types/database";
import type { KeyInSet } from "@/services/keySets.service";

type AgentKeyGroup = {
  key_type: KeyType;
  /** DB label for "other" keys; enum label for all others. */
  typeLabel: string;
  /** All physical key IDs of this type — only the first is ever selected. */
  keyIds: string[];
};

type Props = {
  keys: KeyInSet[];
  selectedIds: Set<string>;
  isBusy: boolean;
  onToggle: (id: string) => void;
};

export function AgentKeyList({ keys, selectedIds, isBusy, onToggle }: Props) {
  const groups: AgentKeyGroup[] = [];

  for (const k of keys) {
    if ((k.quantity ?? 0) <= 0) continue;
    // "other" keys have unique labels — never group them together.
    if (k.key_type === "other") {
      groups.push({ key_type: k.key_type, typeLabel: k.label, keyIds: [k.id] });
      continue;
    }
    const existing = groups.find((g) => g.key_type === k.key_type);
    if (existing) {
      existing.keyIds.push(k.id);
    } else {
      groups.push({
        key_type: k.key_type,
        typeLabel: KEY_TYPE_LABEL[k.key_type] ?? k.key_type,
        keyIds: [k.id],
      });
    }
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No keys available"
        message="All keys for this property are currently checked out."
      />
    );
  }

  const rows: AgentKeyGroup[][] = [];
  for (let i = 0; i < groups.length; i += 2) {
    rows.push(groups.slice(i, i + 2));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View
          key={row.map((g) => g.keyIds[0]).join("-")}
          style={styles.gridRow}
        >
          {row.map((g) => {
            const repId = g.keyIds[0];
            const isSelected = selectedIds.has(repId);
            const Icon = KEY_TYPE_ICON[g.key_type] ?? KeyRound;
            return (
              <View key={repId} style={styles.gridCell}>
                <Pressable
                  onPress={() => onToggle(repId)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={g.typeLabel}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      isSelected && styles.iconCircleSelected,
                    ]}
                  >
                    <Icon
                      size={13}
                      color={
                        isSelected ? theme.colors.success : theme.colors.primary
                      }
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text style={styles.keyLabel} numberOfLines={1}>
                    {g.typeLabel}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {row.length === 1 && <View style={styles.gridCell} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  gridRow: { flexDirection: "row", gap: 10 },
  gridCell: { flex: 1, minWidth: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  chipSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successSoft,
  },
  chipPressed: { opacity: 0.75 },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSelected: {
    backgroundColor: theme.colors.success + "24",
  },
  keyLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
});

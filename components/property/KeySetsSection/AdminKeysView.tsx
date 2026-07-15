import { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { ChevronDown, ChevronRight, KeyRound, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

import { KEY_TYPE_ICON, theme } from "@/constants";
import { EmptyState } from "@/components/ui";
import { KeySetCard } from "@/components/keyset";
import { AddKeySetSheet } from "@/components/keyset/AddKeySetSheet";
import { getKeyName } from "@/lib/utils";
import type { KeySetWithDetails, UnassignedKey } from "@/lib/services";

// Enable LayoutAnimation on Android once (no-op on iOS).
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AdminKeysViewProps = {
  propertyId: string;
  keySets: KeySetWithDetails[];
  unassignedKeys: UnassignedKey[];
};

export function AdminKeysView({ propertyId, keySets, unassignedKeys }: AdminKeysViewProps) {
  const router = useRouter();
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // ensure animation flag is set before first toggle (defensive)
  useEffect(() => {}, []);

  function toggleUnassigned() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnassignedOpen((v) => !v);
  }

  const unassignedQty = unassignedKeys.reduce((sum, k) => sum + (k.quantity ?? 1), 0);

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {keySets.length} {keySets.length === 1 ? "Keyset" : "Keysets"}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() => setAddSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Add keyset"
          >
            <Plus size={14} color={theme.colors.textInverse} strokeWidth={2.5} />
            <Text style={styles.addButtonLabel}>Add</Text>
          </Pressable>
        </View>
        {keySets.length === 0 ? (
          <EmptyState
            title="No key sets"
            message="No key sets added for this property yet."
          />
        ) : (
          <View style={styles.list}>
            {keySets.map((ks) => (
              <KeySetCard
                key={ks.id}
                keySet={ks}
                variant="admin"
                onPress={() => router.push(`/(app)/properties/keyset/${ks.id}` as never)}
              />
            ))}
          </View>
        )}
      </View>
      {unassignedKeys.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.accordionHeader}
            onPress={toggleUnassigned}
            accessibilityRole="button"
            accessibilityLabel="Toggle unassigned keys"
          >
            <Text style={styles.sectionTitle}>
              {unassignedQty} Unassigned{" "}
              {unassignedQty === 1 ? "Key" : "Keys"}
            </Text>
            {unassignedOpen ? (
              <ChevronDown size={16} color={theme.colors.textLight} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2.5} />
            )}
          </Pressable>
          {unassignedOpen && (
            <View style={styles.list}>
              {unassignedKeys.map((k) => (
                <UnassignedKeyChip key={k.id} keyItem={k} />
              ))}
            </View>
          )}
        </View>
      )}
      <AddKeySetSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        propertyId={propertyId}
      />
    </View>
  );
}

// ── UnassignedKeyChip ────────────────────────────────────────────────────────

function UnassignedKeyChip({ keyItem }: { keyItem: UnassignedKey }) {
  const Icon = KEY_TYPE_ICON[keyItem.key_type] ?? KeyRound;
  const label = getKeyName(keyItem);
  return (
    <View style={styles.unassignedChip}>
      <View style={styles.unassignedIconCircle}>
        <Icon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />
      </View>
      <Text style={styles.unassignedLabel} numberOfLines={1}>
        {label}
      </Text>
      {keyItem.code ? (
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText} numberOfLines={1}>
            {keyItem.code}
          </Text>
        </View>
      ) : null}
      {keyItem.quantity > 1 && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>×{keyItem.quantity}</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accent,
  },
  addButtonPressed: { opacity: 0.75 },
  addButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  list: { gap: 8 },


  // ── Unassigned keys ──
  unassignedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  unassignedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unassignedLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  codeBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  qtyBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.neutralSoft,
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
});

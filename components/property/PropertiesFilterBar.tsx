import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, X } from "lucide-react-native";

import { RoleGate } from "@/components/RoleGate";
import {
  AddressSearch,
  type AddressSearchRef,
  type PlaceResult,
} from "@/components/ui";
import { theme } from "@/constants";

export type AdminPropertyTab = "active" | "leased" | "inactive";

const ADMIN_TABS: { id: AdminPropertyTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "leased", label: "Leased" },
  { id: "inactive", label: "Inactive" },
];

type Props = {
  selectedPlace: PlaceResult | null;
  onPlaceChange: (place: PlaceResult | null) => void;
  adminTab: AdminPropertyTab;
  onAdminTabChange: (tab: AdminPropertyTab) => void;
};

/**
 * Filter bar for the Properties screen: address search, clear button,
 * an "add property" shortcut, and the admin-only key-status tab strip.
 *
 * Purely presentational — state is owned by the parent screen so filtering
 * stays in sync with the underlying query.
 */
export function PropertiesFilterBar({
  selectedPlace,
  onPlaceChange,
  adminTab,
  onAdminTabChange,
}: Props) {
  const router = useRouter();
  const searchRef = useRef<AddressSearchRef>(null);

  const handleClear = () => {
    onPlaceChange(null);
    searchRef.current?.clear();
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.searchWrap}>
          <AddressSearch
            ref={searchRef}
            placeholder="Search by address or suburb…"
            onSelect={onPlaceChange}
          />
        </View>

        {selectedPlace ? (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
          >
            <X size={16} color={theme.colors.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}

        <RoleGate allow="admin">
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() => router.push("/(app)/properties/add")}
            accessibilityRole="button"
            accessibilityLabel="Add property"
          >
            <Plus
              size={20}
              color={theme.colors.primaryText}
              strokeWidth={2.4}
            />
          </Pressable>
        </RoleGate>
      </View>

      <RoleGate allow="admin">
        <View style={styles.tabStrip}>
          {ADMIN_TABS.map((tab) => {
            const active = adminTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => onAdminTabChange(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </RoleGate>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchWrap: {
    flex: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    flexShrink: 0,
  },
  addButtonPressed: {
    opacity: 0.75,
  },

  // ── Admin tabs ──────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.accent,
  },
});

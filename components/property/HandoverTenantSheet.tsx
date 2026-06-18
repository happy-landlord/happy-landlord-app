import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { Check } from "lucide-react-native";

import { BottomSheet, Button, OutlinedField } from "@/components/ui";
import { theme } from "@/constants";
import { useHandoverToTenant, useKeySets } from "@/lib/hooks";
import { normalizeAustralianPhone, getTotalKeyQuantity } from "@/lib/utils";

type Props = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
};

export function HandoverTenantSheet({ visible, onClose, propertyId }: Props) {
  const { data: keySets = [] } = useKeySets(propertyId);
  const handoverMut = useHandoverToTenant(propertyId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Reset selection whenever the sheet opens
  const eligibleSets = keySets.filter(
    (ks) => ks.status !== "inactive" && ks.status !== "missing_damaged",
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleComplete() {
    const ids = [...selected];
    if (ids.length === 0 || !tenantName.trim() || !tenantPhone.trim()) return;
    handoverMut.mutate(
      {
        keySetIds: ids,
        tenantName,
        tenantPhone: normalizeAustralianPhone(tenantPhone),
      },
      {
        onSuccess: () => {
          setSelected(new Set());
          setTenantName("");
          setTenantPhone("");
          onClose();
        },
      },
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Handover to Tenant</Text>

      <View style={styles.tenantFields}>
        <OutlinedField label="Tenant Name" required focused={nameFocused} labelBackground={theme.colors.surface}>
          <TextInput
            style={styles.fieldInput}
            value={tenantName}
            onChangeText={setTenantName}
            placeholder="Full name"
            placeholderTextColor={theme.colors.textLight}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            returnKeyType="next"
          />
        </OutlinedField>
        <OutlinedField label="Phone Number" required focused={phoneFocused} labelBackground={theme.colors.surface}>
          <TextInput
            style={styles.fieldInput}
            value={tenantPhone}
            onChangeText={setTenantPhone}
            placeholder="e.g. 04xx xxx xxx"
            placeholderTextColor={theme.colors.textLight}
            keyboardType="phone-pad"
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
            returnKeyType="done"
          />
        </OutlinedField>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subtitle}>Select keysets to hand over:</Text>

      {eligibleSets.length === 0 ? (
        <Text style={styles.emptyText}>No keysets available to hand over.</Text>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
        >
          {eligibleSets.map((ks) => {
            const isSelected = selected.has(ks.id);
            const keyCount = getTotalKeyQuantity(ks);
            return (
              <Pressable
                key={ks.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => toggle(ks.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && (
                    <Check
                      size={13}
                      color={theme.colors.accent}
                      strokeWidth={3}
                    />
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowEyebrowRow}>
                    <Text style={styles.rowEyebrow} numberOfLines={1}>
                      {ks.code}
                    </Text>
                    <View style={[styles.keyCountBadge, isSelected && styles.keyCountBadgeSelected]}>
                      <Text style={[styles.keyCountText, isSelected && styles.keyCountTextSelected]}>
                        {keyCount} {keyCount === 1 ? "key" : "keys"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {ks.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onClose}
          disabled={handoverMut.isPending}
          style={styles.footerBtn}
        />
        <Button
          title={`Complete (${selected.size})`}
          variant="primary"
          onPress={handleComplete}
          disabled={selected.size === 0 || !tenantName.trim() || !tenantPhone.trim() || handoverMut.isPending}
          loading={handoverMut.isPending}
          style={styles.footerBtn}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  tenantFields: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  fieldInput: {
    fontSize: 15,
    color: theme.colors.text,
    height: 46,
    paddingHorizontal: 0,
  },
  scroll: { maxHeight: 280 },
  scrollContent: { gap: 6 },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowEyebrowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  rowKeyCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  keyCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keyCountBadgeSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  keyCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  keyCountTextSelected: {
    color: theme.colors.warning,
  },
  rowName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  footerBtn: { flex: 1 },
});

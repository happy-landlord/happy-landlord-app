import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, KeyRound } from "lucide-react-native";

import { BottomSheet, OutlinedField } from "@/components/ui";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { useHandoverToTenant, useKeySets } from "@/lib/hooks";
import { alertError } from "@/lib/utils";
import type { KeyType } from "@/types";

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
    if (ids.length === 0 || !tenantName.trim()) return;
    handoverMut.mutate({ keySetIds: ids, tenantName, tenantPhone }, {
      onSuccess: () => {
        setSelected(new Set());
        setTenantName("");
        setTenantPhone("");
        onClose();
      },
      onError: (err) => alertError("Error", err, "Failed to complete handover."),
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Handover to Tenant</Text>

      <View style={styles.tenantFields}>
        <OutlinedField label="Tenant Name" required focused={nameFocused}>
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
        <OutlinedField label="Phone Number" focused={phoneFocused}>
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
            const keyCount = ks.keys?.length ?? 0;
            return (
              <Pressable
                key={ks.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => toggle(ks.id)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
                </View>
                <View style={styles.rowIconCircle}>
                  <KeyRound size={14} color={theme.colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{ks.name}</Text>
                  <Text style={styles.rowMeta}>
                    {keyCount} {keyCount === 1 ? "key" : "keys"} · {ks.code}
                  </Text>
                </View>
                {ks.keys?.slice(0, 3).map((k) => {
                  const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
                  return (
                    <View key={k.id} style={styles.keyIcon}>
                      <Icon size={12} color={theme.colors.textMuted} strokeWidth={1.8} />
                    </View>
                  );
                })}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          onPress={onClose}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            (selected.size === 0 || !tenantName.trim()) && styles.confirmBtnDisabled,
            pressed && selected.size > 0 && tenantName.trim() && { opacity: 0.82 },
          ]}
          onPress={handleComplete}
          disabled={selected.size === 0 || !tenantName.trim() || handoverMut.isPending}
        >
          {handoverMut.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>
              Complete ({selected.size})
            </Text>
          )}
        </Pressable>
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
    paddingVertical: 10,
    paddingHorizontal: 10,
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
  rowIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  rowMeta: { fontSize: 11, color: theme.colors.textMuted },
  keyIcon: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});



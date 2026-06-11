import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Minus,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, ErrorState, LoadingState, PickerModal } from "@/components/ui";
import {
  KEY_TYPE_ICON,
  KEY_TYPE_LABEL,
  PROPERTY_TYPES,
  theme,
} from "@/constants";
import { getKeyName, getKeySignature } from "@/lib/utils";
import {
  useAllPropertyKeys,
  useCreateKeys,
  useDeleteKey,
  useProperty,
  usePropertyTenant,
  useUpdateKey,
  useUpdatePropertyDetails,
} from "@/lib/hooks";
import { updateKeyHolder } from "@/lib/services";
import type { EnrichedKey } from "@/lib/hooks";
import type { DbKeyInsert, KeyType, PropertyType } from "@/types";

// ── Key type options ──────────────────────────────────────────────────────────

const ALL_KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyType[]).map(
  (type) => {
    const Icon = KEY_TYPE_ICON[type] ?? KeyRound;
    return {
      value: type,
      label: KEY_TYPE_LABEL[type],
      icon: <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} />,
    };
  },
);

type ComparableKey = Pick<EnrichedKey, "key_type" | "label" | "code">;

// ── PropertyKeysSection ───────────────────────────────────────────────────────

type PropertyKeysSectionProps = {
  propertyId: string;
  allKeys: EnrichedKey[];
};

function PropertyKeysSection({ propertyId, allKeys }: PropertyKeysSectionProps) {
  const [pendingType, setPendingType] = useState<KeyType>("main_door");
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingCode, setPendingCode] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const createMut = useCreateKeys(propertyId);
  const deleteMut = useDeleteKey(propertyId);
  const updateMut = useUpdateKey(propertyId);

  function resetPendingKey() {
    setPendingQty(1);
    setPendingCode("");
  }

  function handleAdd() {
    if (pendingQty < 1 || adding) return;
    setTypePickerOpen(false);
    const pendingLabel = KEY_TYPE_LABEL[pendingType] ?? pendingType;
    const pendingKey = {
      key_type: pendingType,
      label: pendingLabel,
      code: pendingCode.trim() || null,
    } satisfies ComparableKey;
    const matchingKey = allKeys.find(
      (key) =>
        !key.keySetName && getKeySignature(key) === getKeySignature(pendingKey),
    );

    setAdding(true);
    if (matchingKey) {
      updateMut.mutate(
        {
          keyId: matchingKey.id,
          patch: { quantity: (matchingKey.quantity ?? 1) + pendingQty },
        },
        { onSuccess: resetPendingKey, onSettled: () => setAdding(false) },
      );
      return;
    }

    const insert: DbKeyInsert = {
      property_id: propertyId,
      key_type: pendingType,
      label: pendingLabel,
      quantity: pendingQty,
      code: pendingCode.trim() || null,
      key_set_id: null,
    };
    createMut.mutate([insert], {
      onSuccess: resetPendingKey,
      onSettled: () => setAdding(false),
    });
  }

  function handleQtyChange(key: EnrichedKey, delta: number) {
    const next = Math.max(1, (key.quantity ?? 1) + delta);
    if (next === (key.quantity ?? 1)) return;
    updateMut.mutate({ keyId: key.id, patch: { quantity: next } }, {});
  }

  function handleDelete(key: EnrichedKey) {
    deleteMut.mutate(key.id);
  }

  return (
    <View style={styles.keysCard}>
      {allKeys.length === 0 && (
        <Text style={styles.emptyText}>No keys yet. Add one below.</Text>
      )}
      {allKeys.map((k) => {
        const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
        const label = getKeyName(k);
        const qty = k.quantity ?? 1;
        return (
          <View key={k.id} style={styles.keyRow}>
            <View style={styles.keyIconCircle}>
              <Icon size={13} color={theme.colors.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.keyInfo}>
              <Text style={styles.keyLabel} numberOfLines={1}>{label}</Text>
              {k.code ? <Text style={styles.keyCode}>{k.code}</Text> : null}
            </View>
            {k.keySetName && (
              <View style={styles.keySetNameBadge}>
                <Text style={styles.keySetNameBadgeText} numberOfLines={1}>
                  {k.keySetName}
                </Text>
              </View>
            )}
            <View style={styles.stepper}>
              <Pressable
                onPress={() => handleQtyChange(k, -1)}
                disabled={updateMut.isPending || qty <= 1}
                hitSlop={6}
                style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
              >
                <Minus
                  size={11}
                  color={qty <= 1 ? theme.colors.textLight : theme.colors.text}
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text style={styles.stepVal}>{qty}</Text>
              <Pressable
                onPress={() => handleQtyChange(k, +1)}
                disabled={updateMut.isPending}
                hitSlop={6}
                style={styles.stepBtn}
              >
                <Plus size={11} color={theme.colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => handleDelete(k)}
              disabled={deleteMut.isPending}
              hitSlop={8}
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.65 }]}
            >
              {deleteMut.isPending ? (
                <ActivityIndicator size={13} color={theme.colors.danger} />
              ) : (
                <Trash2 size={14} color={theme.colors.danger} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        );
      })}
      <View style={styles.cardDivider} />
      {/* Add key row */}
      <View style={styles.addKeyRow}>
        <View style={styles.typePickerWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.typePicker,
              typePickerOpen && styles.typePickerOpen,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => setTypePickerOpen((v) => !v)}
            disabled={adding}
          >
            {(() => {
              const Icon = KEY_TYPE_ICON[pendingType] ?? KeyRound;
              return <Icon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />;
            })()}
            <Text style={styles.typePickerText} numberOfLines={1}>
              {KEY_TYPE_LABEL[pendingType]}
            </Text>
            {typePickerOpen ? (
              <ChevronUp size={13} color={theme.colors.textMuted} strokeWidth={2} />
            ) : (
              <ChevronDown size={13} color={theme.colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
          {typePickerOpen && (
            <ScrollView
              style={styles.inlinePicker}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
            >
              {ALL_KEY_TYPE_OPTIONS.map((opt) => {
                const selected = opt.value === pendingType;
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.inlinePickerOption,
                      selected && styles.inlinePickerOptionSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setPendingType(opt.value as KeyType);
                      setTypePickerOpen(false);
                    }}
                  >
                    <View style={styles.inlinePickerIcon}>{opt.icon}</View>
                    <Text
                      style={[
                        styles.inlinePickerLabel,
                        selected && styles.inlinePickerLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected && (
                      <Check size={13} color={theme.colors.accent} strokeWidth={2.5} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setPendingQty((v) => Math.max(1, v - 1))}
            disabled={adding || pendingQty <= 1}
            hitSlop={6}
            style={[styles.stepBtn, pendingQty <= 1 && styles.stepBtnDisabled]}
          >
            <Minus
              size={11}
              color={pendingQty <= 1 ? theme.colors.textLight : theme.colors.text}
              strokeWidth={2.5}
            />
          </Pressable>
          <Text style={styles.stepVal}>{pendingQty}</Text>
          <Pressable
            onPress={() => setPendingQty((v) => v + 1)}
            disabled={adding}
            hitSlop={6}
            style={styles.stepBtn}
          >
            <Plus size={11} color={theme.colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addKeyBtn,
            pressed && { opacity: 0.78 },
            adding && { opacity: 0.6 },
          ]}
          onPress={handleAdd}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={styles.addKeyBtnText}>Add</Text>
          )}
        </Pressable>
      </View>
      <TextInput
        style={styles.codeInput}
        value={pendingCode}
        onChangeText={setPendingCode}
        placeholder="Code / tag # (optional)"
        placeholderTextColor={theme.colors.textLight}
        returnKeyType="done"
        maxLength={30}
      />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: property, isPending: propertyLoading, isError, refetch } = useProperty(id);

  const isLeased = property?.status === "leased";
  const { allKeys } = useAllPropertyKeys(id);
  const updateDetailsMut = useUpdatePropertyDetails(id);

  const [propertyType, setPropertyType] = useState<PropertyType>(
    property?.property_type ?? "apartment",
  );
  const [landlordName, setLandlordName] = useState(property?.landlord?.full_name ?? "");
  const [landlordContact, setLandlordContact] = useState(property?.landlord?.phone ?? "");
  const [showTypePicker, setShowTypePicker] = useState(false);

  // ── Tenant state ─────────────────────────────────────────────────────────
  const { data: tenant } = usePropertyTenant(id, isLeased);
  const [tenantName, setTenantName] = useState(tenant?.full_name ?? "");
  const [tenantPhone, setTenantPhone] = useState(tenant?.phone ?? "");

  const tenantUpdateMut = useMutation({
    mutationFn: ({ name, phone }: { name: string; phone: string }) => {
      if (!tenant?.id) return Promise.resolve();
      return updateKeyHolder(tenant.id, {
        full_name: name || null,
        phone: phone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propertyTenant", id] });
    },
  });

  // Sync form once property/tenant data arrives
  const propertySyncedRef = useRef(false);
  useEffect(() => {
    if (property && !propertySyncedRef.current) {
      setPropertyType(property.property_type);
      setLandlordName(property.landlord?.full_name ?? "");
      setLandlordContact(property.landlord?.phone ?? "");
      propertySyncedRef.current = true;
    }
  }, [property]);

  const tenantSyncedRef = useRef(false);
  useEffect(() => {
    if (tenant && !tenantSyncedRef.current) {
      setTenantName(tenant.full_name ?? "");
      setTenantPhone(tenant.phone ?? "");
      tenantSyncedRef.current = true;
    }
  }, [tenant]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const isPending = updateDetailsMut.isPending || tenantUpdateMut.isPending;

  async function handleSave() {
    if (isPending || !property) return;
    try {
      await updateDetailsMut.mutateAsync({
        patch: { property_type: propertyType },
        landlord: {
          holderId: property.landlord?.id ?? null,
          name: landlordName,
          phone: landlordContact,
        },
      });
      if (isLeased && tenant?.id) {
        await tenantUpdateMut.mutateAsync({ name: tenantName, phone: tenantPhone });
      }
      router.back();
    } catch {
      // errors captured by mutation state — stay on screen
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (propertyLoading) return <LoadingState message="Loading property…" />;
  if (isError || !property) {
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={refetch}
      />
    );
  }

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === propertyType)?.label ?? "Select…";

  return (
    <>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: theme.spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bottomOffset={Platform.OS === "ios" ? 32 : 16}
          showsVerticalScrollIndicator={false}
        >
          {/* Property type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Property Type</Text>
            <Pressable
              onPress={() => setShowTypePicker(true)}
              style={({ pressed }) => [styles.selectField, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.selectText}>{selectedTypeLabel}</Text>
              <ChevronDown size={16} color={theme.colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Landlord */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Landlord</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={landlordName}
                onChangeText={setLandlordName}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                value={landlordContact}
                onChangeText={setLandlordContact}
                placeholder="Phone number"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </View>
          </View>

          {/* Tenant — only shown for leased properties */}
          {isLeased && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tenant</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  value={tenantName}
                  onChangeText={setTenantName}
                  placeholder="Full name"
                  placeholderTextColor={theme.colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.input}
                  value={tenantPhone}
                  onChangeText={setTenantPhone}
                  placeholder="Phone number"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
              </View>
            </View>
          )}

          {/* Keys */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Keys</Text>
            <PropertyKeysSection propertyId={id} allKeys={allKeys} />
          </View>
        </KeyboardAwareScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            disabled={isPending}
            style={styles.cancelBtn}
          />
          <Button
            title="Save"
            variant="primary"
            loading={isPending}
            disabled={isPending}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </View>
      </View>

      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={propertyType}
        onSelect={(v) => setPropertyType(v)}
        onClose={() => setShowTypePicker(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: { gap: theme.spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  selectText: { fontSize: 15, color: theme.colors.text, fontWeight: "500" },
  inputGroup: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md,
  },
  keysCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.accentSoft,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.xs,
  },
  cardDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  keyInfo: { flex: 1, gap: 2, minWidth: 0 },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  keyCode: { fontSize: 11, color: theme.colors.textMuted },
  keySetNameBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent + "44",
    maxWidth: 80,
    flexShrink: 1,
  },
  keySetNameBadgeText: { fontSize: 10, fontWeight: "700", color: theme.colors.accent },
  stepper: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepVal: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addKeyRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  typePickerWrapper: { flex: 1, position: "relative", zIndex: 10 },
  typePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  typePickerOpen: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  typePickerText: { flex: 1, fontSize: 13, color: theme.colors.text },
  inlinePicker: {
    position: "absolute",
    bottom: 46,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 20,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  inlinePickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inlinePickerOptionSelected: { backgroundColor: theme.colors.accentSoft },
  inlinePickerIcon: { width: 22, alignItems: "center" },
  inlinePickerLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  inlinePickerLabelSelected: { color: theme.colors.accent, fontWeight: "600" },
  addKeyBtn: {
    height: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    minWidth: 60,
  },
  addKeyBtnText: { fontSize: 14, fontWeight: "700", color: theme.colors.accent },
  codeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
});

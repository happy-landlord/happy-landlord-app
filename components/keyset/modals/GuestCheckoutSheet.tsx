import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Building2,
  CalendarClock,
  Phone,
  UserRound,
} from "lucide-react-native";

import { ConfirmSheet, Input } from "@/components/ui";
import { theme } from "@/constants";
import {
  useCheckoutKeySetToGuest,
  useCheckoutKeySet,
  useCreateGuestKeyHolder,
  useGuestKeyHolders,
} from "@/lib/hooks";
import type { GuestKeyHolder } from "@/lib/services";
import {
  formatAustralianPhoneForDisplay,
  formatDueAt,
  isoInDays,
} from "@/lib/utils";

type GuestMode = "existing" | "new";
type CheckoutTarget = "self" | "keyholder";
type CheckoutStep = "keyholder" | "checkout";

type Props = {
  visible: boolean;
  keySetId: string;
  propertyId: string;
  keySetName: string;
  durationDays: number;
  allowedDays: readonly number[];
  onDurationChange: (days: number) => void;
  onClose: () => void;
};

export function GuestCheckoutSheet({
  visible,
  keySetId,
  propertyId,
  keySetName,
  durationDays,
  allowedDays,
  onDurationChange,
  onClose,
}: Props) {
  const [step, setStep] = useState<CheckoutStep>("keyholder");
  const [checkoutTarget, setCheckoutTarget] = useState<CheckoutTarget>("self");
  const [mode, setMode] = useState<GuestMode>("existing");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const guestsQuery = useGuestKeyHolders(
    visible && checkoutTarget === "keyholder",
  );
  const checkoutSelf = useCheckoutKeySet(propertyId);
  const createGuest = useCreateGuestKeyHolder();
  const checkoutGuest = useCheckoutKeySetToGuest(propertyId);
  const isPending =
    checkoutSelf.isPending || createGuest.isPending || checkoutGuest.isPending;

  const guests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return guestsQuery.data ?? [];
    return (guestsQuery.data ?? []).filter((guest) =>
      [guest.full_name, guest.company_name, guest.phone].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [guestsQuery.data, search]);

  const dueBackAt = isoInDays(durationDays);
  const selectedGuest = (guestsQuery.data ?? []).find(
    (guest) => guest.id === selectedGuestId,
  );
  const checkoutTo =
    checkoutTarget === "self"
      ? "Myself"
      : mode === "new"
        ? fullName.trim()
        : (selectedGuest?.full_name ?? "Keyholder");

  function resetForm() {
    setStep("keyholder");
    setCheckoutTarget("self");
    setMode("existing");
    setSelectedGuestId(null);
    setSearch("");
    setFullName("");
    setCompanyName("");
    setPhone("");
    setCheckoutNotes("");
    setFormError(null);
  }

  function handleClose() {
    if (isPending) return;
    resetForm();
    onClose();
  }

  async function handleConfirm() {
    setFormError(null);

    if (step === "keyholder") {
      if (checkoutTarget === "keyholder" && mode === "existing") {
        if (!selectedGuestId) {
          setFormError("Select a keyholder or add a new one.");
          return;
        }
      }
      if (checkoutTarget === "keyholder" && mode === "new") {
        if (!fullName.trim()) {
          setFormError("Keyholder name is required.");
          return;
        }
        if (!phone.trim()) {
          setFormError("Keyholder phone number is required.");
          return;
        }
      }
      setStep("checkout");
      return;
    }

    try {
      if (checkoutTarget === "self") {
        await checkoutSelf.mutateAsync({
          keySetId,
          dueBackAt,
          notes: checkoutNotes,
        });
        resetForm();
        onClose();
        return;
      }

      let guestHolderId = selectedGuestId;
      if (mode === "existing") {
        if (!guestHolderId) return;
      } else {
        guestHolderId = await createGuest.mutateAsync({
          fullName,
          companyName,
          phone,
        });
      }

      await checkoutGuest.mutateAsync({
        keySetId,
        guestHolderId,
        dueBackAt,
        notes: checkoutNotes,
      });
      resetForm();
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not checkout keyset.",
      );
    }
  }

  if (step === "checkout") {
    return (
      <ConfirmSheet
        visible={visible}
        title="Checkout"
        subtitle={`Step 2 of 2 · Set the checkout details for ${keySetName}.`}
        confirmLabel={isPending ? "Checking out…" : "Checkout"}
        cancelLabel="Back"
        isPending={isPending}
        scrollMaxHeight={560}
        keyboardShouldPersistTaps="handled"
        onCancel={() => {
          setStep("keyholder");
          setFormError(null);
        }}
        onRequestClose={handleClose}
        onConfirm={handleConfirm}
      >
        <View style={styles.checkoutSummary}>
          <Text style={styles.checkoutSummaryLabel}>Checkout to</Text>
          <Text style={styles.checkoutSummaryValue}>{checkoutTo}</Text>
        </View>

        <FieldLabel>Duration</FieldLabel>
        <View style={styles.durationGrid}>
          {allowedDays.map((days) => {
            const selected = days === durationDays;
            return (
              <Pressable
                key={days}
                onPress={() => onDurationChange(days)}
                disabled={isPending}
                style={({ pressed }) => [
                  styles.durationChip,
                  selected && styles.durationChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    selected && styles.durationTextSelected,
                  ]}
                >
                  {days === 1 ? "1 day" : `${days} days`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.dueRow}>
          <CalendarClock
            size={14}
            color={theme.colors.accent}
            strokeWidth={2}
          />
          <Text style={styles.dueText}>
            Return by{" "}
            <Text style={styles.dueDate}>{formatDueAt(dueBackAt)}</Text>
          </Text>
        </View>

        <FieldLabel>Checkout note</FieldLabel>
        <Input
          value={checkoutNotes}
          onChangeText={setCheckoutNotes}
          placeholder="Reason for checkout (optional)"
          multiline
          maxLength={500}
          containerStyle={styles.checkoutNoteInput}
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
      </ConfirmSheet>
    );
  }

  return (
    <ConfirmSheet
      visible={visible}
      title="Checkout"
      subtitle="Step 1 of 2 · Choose who will hold the keyset."
      confirmLabel="Next"
      isPending={isPending}
      scrollMaxHeight={560}
      keyboardShouldPersistTaps="handled"
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <FieldLabel>Checkout to</FieldLabel>
      <View style={styles.modeRow}>
        <ModeButton
          label="Myself"
          selected={checkoutTarget === "self"}
          onPress={() => {
            setCheckoutTarget("self");
            setFormError(null);
          }}
        />
        <ModeButton
          label="Keyholder"
          selected={checkoutTarget === "keyholder"}
          onPress={() => {
            setCheckoutTarget("keyholder");
            setFormError(null);
          }}
        />
      </View>

      {checkoutTarget === "keyholder" ? (
        <>
          <FieldLabel>Keyholder details</FieldLabel>
          <View style={styles.modeRow}>
            <ModeButton
              label="Existing"
              selected={mode === "existing"}
              onPress={() => {
                setMode("existing");
                setFormError(null);
              }}
            />
            <ModeButton
              label="New"
              selected={mode === "new"}
              onPress={() => {
                setMode("new");
                setFormError(null);
              }}
            />
          </View>

          {mode === "existing" ? (
            <View style={styles.guestSection}>
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, company or phone"
                autoCapitalize="none"
                containerStyle={styles.searchInput}
              />
              {guestsQuery.isLoading ? (
                <Text style={styles.emptyText}>Loading guests…</Text>
              ) : guests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {search.trim()
                      ? "No matching keyholders."
                      : "No saved keyholders yet."}
                  </Text>
                  <Pressable onPress={() => setMode("new")}>
                    <Text style={styles.addGuestLink}>Add a new keyholder</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.guestList}>
                  {guests.map((guest) => (
                    <GuestOption
                      key={guest.id}
                      guest={guest}
                      selected={guest.id === selectedGuestId}
                      onPress={() => {
                        setSelectedGuestId(guest.id);
                        setFormError(null);
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.formFields}>
              <Input
                label="Keyholder name"
                labelBackground={theme.colors.surface}
                required
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                autoCapitalize="words"
              />
              <Input
                label="Company"
                labelBackground={theme.colors.surface}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Optional"
                autoCapitalize="words"
              />
              <Input
                label="Phone"
                labelBackground={theme.colors.surface}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                required
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.selfCard}>
          <UserRound size={16} color={theme.colors.accent} strokeWidth={2} />
          <Text style={styles.selfText}>
            This keyset will be assigned to you.
          </Text>
        </View>
      )}

      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
    </ConfirmSheet>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function ModeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        selected && styles.modeButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function GuestOption({
  guest,
  selected,
  onPress,
}: {
  guest: GuestKeyHolder;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.guestOption,
        selected && styles.guestOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.guestIcon}>
        <UserRound size={17} color={theme.colors.accent} strokeWidth={2} />
      </View>
      <View style={styles.guestBody}>
        <Text style={styles.guestName}>{guest.full_name}</Text>
        {guest.company_name ? (
          <View style={styles.metaRow}>
            <Building2 size={11} color={theme.colors.textMuted} />
            <Text style={styles.guestMeta}>{guest.company_name}</Text>
          </View>
        ) : null}
        {guest.phone ? (
          <View style={styles.metaRow}>
            <Phone size={11} color={theme.colors.textMuted} />
            <Text style={styles.guestMeta}>
              {formatAustralianPhoneForDisplay(guest.phone)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modeRow: { flexDirection: "row", gap: theme.spacing.sm },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.neutralSoft,
  },
  modeButtonSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  modeText: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  modeTextSelected: { color: theme.colors.accent, fontWeight: "700" },
  guestSection: { gap: theme.spacing.sm },
  guestList: { gap: theme.spacing.sm },
  guestOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceWarm,
  },
  guestOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  guestIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  guestBody: { flex: 1, gap: 3 },
  guestName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  guestMeta: { flex: 1, fontSize: 12, color: theme.colors.textMuted },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: theme.colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  emptyCard: {
    alignItems: "center",
    gap: 5,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceWarm,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  addGuestLink: { fontSize: 13, fontWeight: "700", color: theme.colors.accent },
  formFields: { gap: 2 },
  searchInput: { marginTop: 0 },
  selfCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selfText: { flex: 1, fontSize: 13, color: theme.colors.text },
  checkoutSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
  },
  checkoutSummaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  checkoutSummaryValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "right",
  },
  checkoutNoteInput: { marginTop: 0 },
  durationGrid: { flexDirection: "row", gap: 8, justifyContent: "center" },
  durationChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationChipSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  durationTextSelected: { color: theme.colors.accent, fontWeight: "700" },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dueText: { fontSize: 13, color: theme.colors.textMuted },
  dueDate: { fontWeight: "700", color: theme.colors.text },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: "center",
    lineHeight: 17,
  },
  pressed: { opacity: 0.72 },
});

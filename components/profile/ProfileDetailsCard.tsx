import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check, Pencil, Phone, User, X } from "lucide-react-native";

import { theme } from "@/constants";
import { useProfile, useUpdateProfile } from "@/lib/hooks";
import { normalizeAustralianPhone, formatAustralianPhoneForDisplay } from "@/lib/utils";
import type { ProfileEdits } from "@/lib/services";
import { Button, Input } from "@/components/ui";

// ── ProfileDetailsCard ───────────────────────────────────────────────────────
// View / edit name + phone for the current user.
// Reads + writes via TanStack hooks — no props.

export function ProfileDetailsCard() {
  const { data: profile } = useProfile();
  const updateMutation = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");

  if (!profile) return null;

  const hasName = Boolean(profile.full_name?.trim());
  const hasPhone = Boolean(profile.phone?.trim());

  const startEdit = () => {
    setDraftName(profile.full_name ?? "");
    setDraftPhone(profile.phone ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    const edits: ProfileEdits = {
      full_name: draftName.trim() || null,
      phone: draftPhone.trim() ? normalizeAustralianPhone(draftPhone) : null,
    };
    updateMutation.mutate(edits, {
      onSuccess: () => setEditing(false),
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Account details</Text>

      {editing ? (
        /* ── Edit form ── */
        <View style={styles.form}>
          <Input
            label="Full name"
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            autoFocus
            labelBackground={theme.colors.surface}
          />
          <Input
            label="Phone"
            value={draftPhone}
            onChangeText={setDraftPhone}
            placeholder="Add phone number"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            returnKeyType="done"
            labelBackground={theme.colors.surface}
          />
        </View>
      ) : (
        /* ── View card ── */
        <View style={styles.card}>
          <DetailRow
            icon={
              <User size={16} color={theme.colors.accent} strokeWidth={1.9} />
            }
            label="Name"
          >
            <Text style={[styles.value, !hasName && styles.empty]}>
              {profile.full_name?.trim() || "Not set"}
            </Text>
          </DetailRow>

          <DetailRow
            icon={
              <Phone size={16} color={theme.colors.accent} strokeWidth={1.9} />
            }
            label="Phone"
          >
            <Text style={[styles.value, !hasPhone && styles.empty]}>
              {profile.phone?.trim()
                ? formatAustralianPhoneForDisplay(profile.phone.trim())
                : "Not set"}
            </Text>
          </DetailRow>
        </View>
      )}

      {editing ? (
        <View style={styles.btnRow}>
          <Button
            title="Cancel"
            variant="outline"
            icon={<X size={16} color={theme.colors.text} strokeWidth={2} />}
            onPress={cancelEdit}
            disabled={updateMutation.isPending}
            style={styles.btnFlex}
          />
          <Button
            title={updateMutation.isPending ? "Saving…" : "Save changes"}
            variant="primary"
            icon={
              <Check size={16} color={theme.colors.accent} strokeWidth={2} />
            }
            loading={updateMutation.isPending}
            onPress={saveEdit}
            disabled={updateMutation.isPending}
            style={styles.btnFlex}
          />
        </View>
      ) : (
        <Button
          title="Edit profile"
          variant="outline"
          icon={
            <Pencil size={16} color={theme.colors.text} strokeWidth={1.9} />
          }
          onPress={startEdit}
          style={styles.btnFull}
        />
      )}
    </View>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
};

function DetailRow({ icon, label, children }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm },
  sectionLabel: {
    paddingHorizontal: theme.spacing.xs,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  readOnlyField: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 4,
    gap: 2,
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: theme.colors.textLight,
  },
  readOnlyValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "600",
  },
  readOnlyHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginTop: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md - 2,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0, gap: 3 },
  rowLabel: {
    fontSize: 11,
    color: theme.colors.textLight,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  value: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "600",
    lineHeight: 21,
  },
  empty: { color: theme.colors.textMuted, fontWeight: "500" },
  btnRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  btnFlex: { flex: 1 },
  btnFull: { alignSelf: "stretch" },
});

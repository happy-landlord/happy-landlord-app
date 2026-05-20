import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Phone, Pencil, Check, X } from "lucide-react-native";

import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import type { ProfileEdits } from "@/services/profile.service";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ROLE_LABEL, ROLE_BG, ROLE_COLOR } from "@/constants/roles";
import { theme } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const updateMutation = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");

  const startEdit = () => {
    setDraftName(profile?.full_name ?? "");
    setDraftPhone(profile?.phone ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    const edits: ProfileEdits = {
      full_name: draftName.trim() || null,
      phone: draftPhone.trim() || null,
    };
    updateMutation.mutate(edits, {
        onSuccess: () => setEditing(false),
        onError: () =>
          Alert.alert("Error", "Could not save changes. Please try again."),
      }
    );
  };

  if (isLoading) return <LoadingState message="Loading profile…" />;
  if (isError || !profile)
    return <ErrorState onRetry={refetch} message="Could not load your profile." />;

  const initials = (profile.full_name ?? profile.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { role } = profile;
  const roleLabel = ROLE_LABEL[role] ?? profile.role;
  const roleBg = ROLE_BG[role] ?? theme.colors.neutralSoft;
  const roleColor = ROLE_COLOR[role] ?? theme.colors.text;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + theme.spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {editing ? (
          <TextInput
            style={styles.nameInput}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Full name"
            placeholderTextColor={theme.colors.textLight}
            autoFocus
          />
        ) : (
          <Text style={styles.name}>
            {profile.full_name ?? "No name set"}
          </Text>
        )}

        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
          <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        {/* Email — read-only (from auth) */}
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Mail size={16} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>
              {profile.email ?? "—"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Phone — editable */}
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Phone size={16} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Phone</Text>
            {editing ? (
              <TextInput
                style={styles.rowInput}
                value={draftPhone}
                onChangeText={setDraftPhone}
                placeholder="Add phone number"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.rowValue}>
                {profile.phone ?? "—"}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Action buttons */}
      {editing ? (
        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, styles.btnOutline]}
            onPress={cancelEdit}
          >
            <X size={16} color={theme.colors.text} strokeWidth={2} />
            <Text style={styles.btnOutlineLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, updateMutation.isPending && styles.btnDisabled]}
            onPress={saveEdit}
            disabled={updateMutation.isPending}
          >
            <Check size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.btnPrimaryLabel}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.btn, styles.btnOutline, styles.btnFull]}
          onPress={startEdit}
        >
          <Pencil size={16} color={theme.colors.text} strokeWidth={1.8} />
          <Text style={styles.btnOutlineLabel}>Edit profile</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  nameInput: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingVertical: 4,
    minWidth: 200,
  },
  roleBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Info card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "500",
  },
  rowInput: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "500",
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.primary,
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 36 + theme.spacing.md,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    minHeight: 48,
  },
  btnFull: {
    flex: 0,
    width: "100%",
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  btnOutlineLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
});

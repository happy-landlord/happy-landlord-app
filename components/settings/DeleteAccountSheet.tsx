import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AlertTriangle, KeyRound, Trash2 } from "lucide-react-native";

import { theme } from "@/constants";
import { useDeleteAccount } from "@/lib/hooks";
import { BottomSheet, Button } from "@/components/ui";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const CONFIRM_WORD = "DELETE";

export function DeleteAccountSheet({ visible, onClose }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  function handleClose() {
    if (deleteAccount.isPending) return;
    setConfirmText("");
    setCheckoutError(null);
    deleteAccount.reset();
    onClose();
  }

  function handleDelete() {
    if (!isConfirmed) return;
    setCheckoutError(null);
    deleteAccount.mutate(undefined, {
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("active_checkouts|")) {
          setCheckoutError(msg.split("|")[1] ?? msg);
        } else {
          Alert.alert(
            "Could not delete account",
            msg || "Something went wrong. Please try again or contact support.",
            [{ text: "OK" }],
          );
        }
      },
      // onSuccess: auth state change listener in useSession redirects to login.
    });
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Trash2 size={20} color={theme.colors.danger} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.subtitle}>
            This action is permanent and cannot be undone
          </Text>
        </View>
      </View>

      {/* Unreturned-keys blocker — shown only after the RPC rejects */}
      {checkoutError ? (
        <>
          <View style={styles.blockedBanner}>
            <KeyRound
              size={15}
              color={theme.colors.warning}
              strokeWidth={2.2}
            />
            <Text style={styles.blockedText}>{checkoutError}</Text>
          </View>
          <Text style={styles.blockedHint}>
            Contact your admin or return the keys at the office to resolve
            active checkouts, then come back to delete your account.
          </Text>
          <Button
            variant="outline"
            title="Close"
            onPress={handleClose}
            style={styles.closeBtn}
          />
        </>
      ) : (
        <>
          {/* Warning banner */}
          <View style={styles.warningBanner}>
            <AlertTriangle
              size={15}
              color={theme.colors.danger}
              strokeWidth={2.2}
            />
            <Text style={styles.warningText}>
              Deleting your account will permanently remove your profile, key
              history, and all associated data. Active keyset loans or pending
              requests must be resolved before deletion.
            </Text>
          </View>

          {/* What gets deleted */}
          <Text style={styles.listHeading}>What will be deleted:</Text>
          <View style={styles.list}>
            {[
              "Your profile and personal information",
              "Key checkout and return history",
              "Saved notification preferences",
              "Access to all Happy Landlord services",
            ].map((item) => (
              <View key={item} style={styles.listItem}>
                <View style={styles.bullet} />
                <Text style={styles.listItemText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Confirmation input */}
          <Text style={styles.confirmLabel}>
            Type <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> to
            confirm
          </Text>
          <TextInput
            style={[
              styles.confirmInput,
              isConfirmed && styles.confirmInputValid,
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={theme.colors.textLight}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleteAccount.isPending}
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm account deletion`}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="outline"
              title="Cancel"
              onPress={handleClose}
              disabled={deleteAccount.isPending}
              style={styles.cancelBtn}
            />
            <Pressable
              onPress={handleDelete}
              disabled={!isConfirmed || deleteAccount.isPending}
              style={({ pressed }) => [
                styles.deleteBtn,
                (!isConfirmed || deleteAccount.isPending) &&
                  styles.deleteBtnDisabled,
                pressed &&
                  isConfirmed &&
                  !deleteAccount.isPending &&
                  styles.deleteBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete account"
            >
              <Text
                style={[
                  styles.deleteBtnText,
                  (!isConfirmed || deleteAccount.isPending) &&
                    styles.deleteBtnTextDisabled,
                ]}
              >
                {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + "30",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.danger,
    lineHeight: 19,
  },

  blockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + "40",
  },
  blockedText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.warning,
    lineHeight: 19,
    fontWeight: "600",
  },
  blockedHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.lg,
  },
  closeBtn: { width: "100%" },

  listHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  list: { gap: 6, marginBottom: theme.spacing.md },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
    marginTop: 6,
    flexShrink: 0,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },

  confirmLabel: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "500",
    marginBottom: theme.spacing.sm,
  },
  confirmWord: {
    fontWeight: "800",
    color: theme.colors.danger,
  },
  confirmInput: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 2,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  confirmInputValid: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },

  actions: { flexDirection: "row", gap: theme.spacing.sm },
  cancelBtn: { flex: 1 },
  deleteBtn: {
    flex: 2,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnDisabled: { backgroundColor: theme.colors.dangerSoft },
  deleteBtnPressed: { opacity: 0.8 },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  deleteBtnTextDisabled: { color: theme.colors.danger + "80" },
});

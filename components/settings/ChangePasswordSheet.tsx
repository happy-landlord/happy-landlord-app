import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Eye, EyeOff, KeyRound } from "lucide-react-native";

import { theme } from "@/constants";
import { useChangePassword } from "@/lib/hooks";
import { BottomSheet, Button, Input } from "@/components/ui";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordSheet({ visible, onClose }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const changePassword = useChangePassword();

  function validate(): boolean {
    const next: typeof errors = {};
    if (newPassword.length < 8) {
      next.newPassword = "Password must be at least 8 characters";
    }
    if (confirmPassword !== newPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    changePassword.mutate(newPassword, {
      onSuccess: () => {
        Alert.alert("Password updated", "Your password has been changed successfully.");
        handleClose();
      },
      onError: (err) => {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to update password. Please try again.");
      },
    });
  }

  function handleClose() {
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setShowNew(false);
    setShowConfirm(false);
    changePassword.reset();
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <KeyRound size={20} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Change password</Text>
            <Text style={styles.subtitle}>Choose a strong password of at least 8 characters</Text>
          </View>
        </View>

        {/* New password field */}
        <Input
          label="New password"
          required
          value={newPassword}
          onChangeText={(t) => {
            setNewPassword(t);
            if (errors.newPassword) setErrors((e) => ({ ...e, newPassword: undefined }));
          }}
          secureTextEntry={!showNew}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.newPassword}
          containerStyle={styles.input}
          rightIcon={
            <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
              {showNew ? (
                <EyeOff size={18} color={theme.colors.textLight} strokeWidth={2} />
              ) : (
                <Eye size={18} color={theme.colors.textLight} strokeWidth={2} />
              )}
            </Pressable>
          }
        />

        {/* Confirm password field */}
        <Input
          label="Confirm new password"
          required
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined }));
          }}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.confirmPassword}
          containerStyle={styles.input}
          rightIcon={
            <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
              {showConfirm ? (
                <EyeOff size={18} color={theme.colors.textLight} strokeWidth={2} />
              ) : (
                <Eye size={18} color={theme.colors.textLight} strokeWidth={2} />
              )}
            </Pressable>
          }
        />

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            title="Cancel"
            onPress={handleClose}
            disabled={changePassword.isPending}
            style={styles.cancelBtn}
          />
          <Button
            variant="primary"
            title="Update password"
            onPress={handleSubmit}
            loading={changePassword.isPending}
            disabled={changePassword.isPending}
            style={styles.submitBtn}
          />
        </View>
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  input: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  cancelBtn: { flex: 1 },
  submitBtn: { flex: 2 },
});


import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageSquare, XCircle } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextInput, Button, HelperText } from "react-native-paper";

import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { useMyLatestRequest, useResubmitRequest } from "@/hooks/useAgentRequests";
import { useLockStore } from "@/lib/lockStore";

export default function RejectedScreen() {
  const insets = useSafeAreaInsets();
  const { data: lastRequest } = useMyLatestRequest();
  const resubmit = useResubmitRequest();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clean up inside mutationFn so it runs even after the component
      // unmounts due to the SIGNED_OUT auth-state redirect.
      queryClient.clear();
      useLockStore.getState().reset();
    },
  });

  const handleResubmit = () => {
    resubmit.mutate({ message: message.trim() || null });
    // On success the profile status flips to 'pending' and the layout
    // auto-redirects to the pending screen via queryClient invalidation.
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg },
      ]}
    >
      <View style={styles.logoWrap}>
        <Logo size={56} />
      </View>

      <View style={styles.iconWrap}>
        <XCircle size={40} color={theme.colors.danger} strokeWidth={1.5} />
      </View>

      <Text style={styles.title}>Access Not Approved</Text>

      {/* Admin note — shown if present */}
      {lastRequest?.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Admin note</Text>
          <Text style={styles.noteText}>{lastRequest.admin_note}</Text>
        </View>
      ) : (
        <Text style={styles.message}>
          Your registration request was not approved. You can request access again
          or contact your agency administrator for more information.
        </Text>
      )}

      {/* Resubmit section */}
      {!showForm ? (
        <Pressable
          style={({ pressed }) => [styles.resubmitBtn, pressed && styles.btnPressed]}
          onPress={() => setShowForm(true)}
        >
          <MessageSquare size={16} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.resubmitBtnLabel}>Request access again</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formLabel}>
            Add an optional message for the admin:
          </Text>
          <TextInput
            activeOutlineColor={theme.colors.primary}
            label="Message (optional)"
            mode="outlined"
            multiline
            numberOfLines={3}
            onChangeText={setMessage}
            outlineColor={theme.colors.border}
            placeholder="Explain your role or why you need access..."
            placeholderTextColor={theme.colors.textLight}
            style={styles.input}
            textColor={theme.colors.text}
            value={message}
          />

          {resubmit.error && (
            <HelperText padding="none" type="error" visible style={styles.errorText}>
              {resubmit.error.message || "Failed to submit request. Please try again."}
            </HelperText>
          )}

          <View style={styles.formActions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              onPress={() => { setShowForm(false); setMessage(""); resubmit.reset(); }}
            >
              <Text style={styles.cancelBtnLabel}>Cancel</Text>
            </Pressable>

            <Button
              buttonColor={theme.colors.primary}
              contentStyle={styles.submitContent}
              disabled={resubmit.isPending}
              labelStyle={styles.submitLabel}
              loading={resubmit.isPending}
              mode="contained"
              onPress={handleResubmit}
              style={styles.submitBtn}
              textColor={theme.colors.textInverse}
            >
              Submit request
            </Button>
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.signOutBtn, pressed && styles.btnPressed]}
        onPress={() => signOutMutation.mutate()}
        disabled={signOutMutation.isPending}
      >
        <Text style={styles.signOutLabel}>
          {signOutMutation.isPending ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    paddingHorizontal: theme.spacing.screen,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: theme.spacing.xl,
  },
  noteBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.danger,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  noteText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  resubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    marginBottom: theme.spacing.md,
  },
  resubmitBtnLabel: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  form: {
    width: "100%",
    maxWidth: 360,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  formLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.danger,
  },
  formActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  submitBtn: {
    flex: 2,
    borderRadius: theme.radius.pill,
  },
  submitContent: {
    minHeight: 44,
  },
  submitLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.65,
  },
  signOutBtn: {
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  signOutLabel: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

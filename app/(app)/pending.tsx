import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { useLockStore } from "@/lib/lockStore";

export default function PendingApprovalScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

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

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.logoWrap}>
        <Logo size={56} />
      </View>

      <Text style={styles.title}>Awaiting Approval</Text>
      <Text style={styles.message}>
        Your registration request has been submitted. An admin will review your
        account shortly. You will be able to sign in once approved.
      </Text>

      <View style={styles.stepsCard}>
        <Step number={1} label="Account created" done />
        <View style={styles.stepDivider} />
        <Step number={2} label="Admin review in progress" active />
        <View style={styles.stepDivider} />
        <Step number={3} label="Access granted" />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signOutBtn,
          pressed && styles.btnPressed,
        ]}
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

function Step({
  number,
  label,
  done,
  active,
}: {
  number: number;
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  const dotBg = done
    ? theme.colors.success
    : active
      ? theme.colors.warning
      : theme.colors.neutralSoft;
  const dotText =
    done || active ? theme.colors.surface : theme.colors.textLight;
  const labelColor =
    done || active ? theme.colors.text : theme.colors.textLight;

  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, { backgroundColor: dotBg }]}>
        <Text style={[styles.stepNumber, { color: dotText }]}>{number}</Text>
      </View>
      <Text style={[styles.stepLabel, { color: labelColor }]}>{label}</Text>
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
    backgroundColor: theme.colors.warningSoft,
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
  stepsCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  stepDivider: {
    width: 2,
    height: 16,
    backgroundColor: theme.colors.border,
    marginLeft: 15,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  signOutBtn: {
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnPressed: { opacity: 0.65 },
  signOutLabel: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

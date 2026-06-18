import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Clock, PauseCircle } from "lucide-react-native";

import { theme } from "@/constants";
import { PillButton } from "@/components/ui";
import {
  useMyLatestRequest,
  useProfile,
  useRequestReactivation,
  useSignOut,
} from "@/lib/hooks";

export default function HoldingScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const { data: latestRequest } = useMyLatestRequest();
  const reactivate = useRequestReactivation();
  const signOut = useSignOut();

  const status = profile?.status ?? "pending";
  const isRejected = status === "rejected";
  const isInactive = status === "inactive";
  const isDenied = isRejected || isInactive;

  const title = isRejected
    ? "Request Not Approved"
    : isInactive
      ? "Account Deactivated"
      : "Awaiting Approval";

  const message = isRejected
    ? latestRequest?.admin_note ||
      "Your registration request was not approved by an administrator."
    : isInactive
      ? "Your account has been deactivated by an administrator."
      : "Your registration request has been submitted. An admin will review your account shortly.";

  const Icon = isRejected ? AlertCircle : isInactive ? PauseCircle : Clock;
  const iconColor = isDenied ? theme.colors.danger : theme.colors.warning;
  const deniedActionLabel = isInactive
    ? "Submit reactivation request"
    : "Request access again";
  const deniedStepOne = isInactive
    ? "Account previously approved"
    : "Account created";
  const deniedStepTwo = isInactive
    ? "Account deactivated"
    : "Account activation unsuccessful";
  const deniedStepThree = reactivate.isSuccess
    ? "Reactivation request sent"
    : deniedActionLabel;
  const deniedHelpText = isInactive
    ? "Submit a reactivation request and an admin will review your account access."
    : "You can ask an admin to review your access again when you're ready.";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: isDenied
              ? theme.colors.dangerSoft
              : theme.colors.warningSoft,
          },
        ]}
      >
        <Icon size={28} color={iconColor} strokeWidth={1.75} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* Steps card — pending */}
      {!isDenied && (
        <View style={styles.stepsCard}>
          <Step number={1} label="Account created" done />
          <View style={styles.stepDivider} />
          <Step number={2} label="Admin review in progress" active />
          <View style={styles.stepDivider} />
          <Step number={3} label="Access granted" />
        </View>
      )}

      {/* Steps card — rejected / inactive */}
      {isDenied && (
        <View style={[styles.stepsCard, styles.deniedCard]}>
          <Step number={1} label={deniedStepOne} done />
          <View style={[styles.stepDivider, styles.stepDividerDanger]} />
          <Step number={2} label={deniedStepTwo} danger />
          <View style={styles.stepDivider} />
          <Step
            number={3}
            label={deniedStepThree}
            active={!reactivate.isSuccess}
            done={reactivate.isSuccess}
          />

          <View style={styles.deniedInfoBox}>
            <Text style={styles.deniedInfoLabel}>Next step</Text>
            <Text style={styles.deniedInfoText}>{deniedHelpText}</Text>
          </View>

          <View style={styles.actionArea}>
            {reactivate.isSuccess ? (
              <Text style={styles.successNote}>
                ✓ Reactivation request submitted. You will be notified once
                reviewed.
              </Text>
            ) : (
              <PillButton
                label={reactivate.isPending ? "Submitting…" : deniedActionLabel}
                variant="accent"
                loading={reactivate.isPending}
                disabled={reactivate.isPending}
                onPress={() => reactivate.mutate()}
                style={styles.actionButton}
              />
            )}
            {reactivate.isError && (
              <Text style={styles.errorNote}>{reactivate.error?.message}</Text>
            )}
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.signOutBtn,
          pressed && { opacity: 0.65 },
        ]}
        onPress={() => signOut.mutate()}
        disabled={signOut.isPending}
      >
        <Text style={styles.signOutLabel}>
          {signOut.isPending ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Step({
  number,
  label,
  done,
  active,
  danger,
}: {
  number: number;
  label: string;
  done?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  const dotBg = danger
    ? theme.colors.danger
    : done
      ? theme.colors.success
      : active
        ? theme.colors.warning
        : theme.colors.neutralSoft;
  const dotText =
    danger || done || active ? theme.colors.surface : theme.colors.textLight;
  const labelColor =
    danger || done || active ? theme.colors.text : theme.colors.textLight;
  const marker = danger ? "!" : number;

  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, { backgroundColor: dotBg }]}>
        <Text style={[styles.stepNumber, { color: dotText }]}>{marker}</Text>
      </View>
      <Text style={[styles.stepLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.md,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.sm,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  stepsCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  deniedCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.dangerSoft,
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
  stepDividerDanger: {
    backgroundColor: theme.colors.dangerSoft,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumber: { fontSize: 13, fontWeight: "700" },
  stepLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  deniedInfoBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: 3,
  },
  deniedInfoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.danger,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  deniedInfoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  actionArea: {
    alignItems: "stretch",
    width: "100%",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    paddingVertical: theme.spacing.sm + 2,
  },
  successNote: {
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: "600",
    lineHeight: 18,
  },
  errorNote: { fontSize: 12, color: theme.colors.danger },
  signOutBtn: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutLabel: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bug,
  FlaskConical,
  KeyRound,
  Wrench,
} from "lucide-react-native";
import * as Sentry from "@sentry/react-native";

import { AdminPushTestPanel } from "@/components/notification";
import { theme, FEATURES } from "@/constants";
import { useDevOverridesStore } from "@/lib/state";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/services";

// ── Shared sub-components (copied from settings for self-containment) ─────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}
function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}
type RowProps = {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};
function SettingRow({ Icon, iconBg, iconColor, title, subtitle, right, onPress, disabled }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      accessibilityRole={onPress ? "button" : "none"}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? null}
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DeveloperScreen() {
  const adminOverride = useDevOverridesStore((s) => s.adminOverride);
  const toggleAdminOverride = useDevOverridesStore((s) => s.toggleAdminOverride);

  if (!FEATURES.DEVELOPER_SECTION) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Developer Console</Text>
        <Text style={styles.pageSubtitle}>Dev builds only — hidden in production</Text>
      </View>

      {/* ── Overrides ─────────────────────────────────────────────────────── */}
      <SectionHeader title="Overrides" />
      <SectionCard>
        <SettingRow
          Icon={Wrench}
          iconBg={theme.colors.neutralSoft}
          iconColor={theme.colors.textMuted}
          title="Make me admin"
          subtitle="Preview admin features in this dev session"
          right={
            <Switch
              value={adminOverride}
              onValueChange={toggleAdminOverride}
              trackColor={{ false: theme.colors.neutralSoft, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.neutralSoft}
            />
          }
        />
      </SectionCard>

      {/* ── Error tracking ────────────────────────────────────────────────── */}
      <SectionHeader title="Error Tracking" />
      <SectionCard>
        <SettingRow
          Icon={Bug}
          iconBg={theme.colors.dangerSoft}
          iconColor={theme.colors.danger}
          title="Test Sentry"
          subtitle="Capture a test exception to verify Sentry is working"
          onPress={() => Sentry.captureException(new Error("Test Sentry error"))}
        />
      </SectionCard>

      {/* ── Push notifications ────────────────────────────────────────────── */}
      <SectionHeader title="Push Notifications" />
      <AdminPushTestPanel />

      {/* ── OTP / SMS ─────────────────────────────────────────────────────── */}
      <SectionHeader title="OTP / SMS" />
      <OtpTestPanel />
    </ScrollView>
  );
}

// ── OTP test panel ────────────────────────────────────────────────────────────

const DEV_TEST_PHONE = "61410382251";

type OtpStep = "idle" | "sending" | "sent" | "verifying" | "verified" | "error";

function OtpTestPanel() {
  const [expanded, setExpanded] = useState(false);
  const [phone, setPhone] = useState(DEV_TEST_PHONE);
  const [token, setToken] = useState("");
  const [step, setStep] = useState<OtpStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function handleSendOtp() {
    setStep("sending");
    setErrorMsg(null);
    setVerifyResult(null);
    setToken("");
    try {
      await sendPhoneOtp(phone.trim());
      setStep("sent");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Failed to send OTP.");
      setStep("error");
    }
  }

  async function handleVerifyOtp() {
    if (token.length < 6) return;
    setStep("verifying");
    setErrorMsg(null);
    setVerifyResult(null);
    try {
      await verifyPhoneOtp(phone.trim(), token.trim());
      setVerifyResult("✅ OTP verified — Supabase session established.");
      setStep("verified");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Verification failed.");
      setStep("error");
    }
  }

  function handleReset() {
    setStep("idle");
    setToken("");
    setErrorMsg(null);
    setVerifyResult(null);
  }

  const isSending = step === "sending";
  const isVerifying = step === "verifying";
  const smsSent = step === "sent" || step === "verifying" || step === "verified" || step === "error";

  return (
    <View style={otpStyles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [otpStyles.header, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse OTP test panel" : "Expand OTP test panel"}
      >
        <View style={otpStyles.headerLeft}>
          <FlaskConical size={16} color={theme.colors.accent} strokeWidth={2} />
          <Text style={otpStyles.headerTitle}>OTP / SMS Test</Text>
        </View>
        <Text style={otpStyles.toggle}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded ? (
        <View style={otpStyles.body}>
          <Text style={otpStyles.stepLabel}>1. Phone number (E.164 without +)</Text>
          <TextInput
            style={otpStyles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCorrect={false}
            placeholder="61410382251"
            placeholderTextColor={theme.colors.textLight}
            returnKeyType="done"
            editable={!isSending && !isVerifying}
          />

          <Pressable
            onPress={handleSendOtp}
            disabled={isSending || !phone.trim()}
            style={({ pressed }) => [
              otpStyles.btn, otpStyles.btnSend,
              (isSending || !phone.trim()) && otpStyles.btnDisabled,
              pressed && otpStyles.btnPressed,
            ]}
            accessibilityRole="button"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={otpStyles.btnText}>{smsSent ? "Resend OTP" : "Send OTP →"}</Text>
            )}
          </Pressable>

          {step === "sent" ? (
            <View style={otpStyles.infoBanner}>
              <Text style={otpStyles.infoText}>
                📱 SMS sent to +{phone.trim()} — check the device and paste the code below.
              </Text>
            </View>
          ) : null}

          {smsSent ? (
            <>
              <View style={otpStyles.divider} />
              <Text style={otpStyles.stepLabel}>2. Enter the 6-digit code from the SMS</Text>
              <TextInput
                style={otpStyles.input}
                value={token}
                onChangeText={(t) => setToken(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={theme.colors.textLight}
                maxLength={6}
                editable={!isVerifying && step !== "verified"}
              />
              <Pressable
                onPress={handleVerifyOtp}
                disabled={isVerifying || token.length < 6 || step === "verified"}
                style={({ pressed }) => [
                  otpStyles.btn, otpStyles.btnVerify,
                  (isVerifying || token.length < 6 || step === "verified") && otpStyles.btnDisabled,
                  pressed && otpStyles.btnPressed,
                ]}
                accessibilityRole="button"
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverse} />
                ) : (
                  <View style={otpStyles.btnRow}>
                    <KeyRound size={14} color={theme.colors.textInverse} strokeWidth={2.5} />
                    <Text style={otpStyles.btnText}>Verify OTP</Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : null}

          {verifyResult ? (
            <View style={otpStyles.successBanner}>
              <Text style={otpStyles.successText}>{verifyResult}</Text>
            </View>
          ) : null}
          {errorMsg ? (
            <View style={otpStyles.errorBanner}>
              <Text style={otpStyles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {step !== "idle" ? (
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [otpStyles.resetBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={otpStyles.resetText}>Reset</Text>
            </Pressable>
          ) : null}

          <Text style={otpStyles.note}>
            ⚠️ Sends a real SMS via ClickSend to the number above.{"\n"}
            Step 1 → signInWithOtp(phone){"\n"}
            Step 2 → verifyOtp(phone, token, type: &quot;sms&quot;){"\n"}
            OTP is generated &amp; verified by Supabase only.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, paddingBottom: theme.spacing.xl * 2 },
  pageHeader: { paddingBottom: theme.spacing.sm },
  pageTitle: { fontSize: 26, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  sectionHeader: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.8,
    textTransform: "uppercase", color: theme.colors.textLight,
    marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionCard: {
    borderRadius: theme.radius.card, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: "hidden",
  },
  rowDivider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 64 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: theme.spacing.md, paddingVertical: 12, gap: 12, minHeight: 60,
  },
  rowPressed: { backgroundColor: theme.colors.neutralSoft },
  rowIcon: {
    width: 36, height: 36, borderRadius: theme.radius.md - 2,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  rowTitleDisabled: { color: theme.colors.textDisabled },
  rowSubtitle: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
});

const otpStyles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card, borderWidth: 1.5,
    borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.surface, overflow: "hidden",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.accentSoft,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  headerTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.accent, letterSpacing: 0.2 },
  toggle: { fontSize: 11, color: theme.colors.accent, fontWeight: "700" },
  body: { padding: theme.spacing.md, gap: theme.spacing.sm },
  stepLabel: {
    fontSize: 12, fontWeight: "700", color: theme.colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.background,
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  btn: {
    borderRadius: theme.radius.md, paddingVertical: 11, paddingHorizontal: theme.spacing.md,
    alignItems: "center", justifyContent: "center", minHeight: 44,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  btnSend: { backgroundColor: theme.colors.accent },
  btnVerify: { backgroundColor: theme.colors.success },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.8 },
  btnText: { fontSize: 14, fontWeight: "700", color: theme.colors.textInverse },
  successBanner: { backgroundColor: theme.colors.successSoft, borderRadius: theme.radius.md, padding: theme.spacing.sm },
  successText: { fontSize: 13, color: theme.colors.success, fontWeight: "600" },
  errorBanner: { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.md, padding: theme.spacing.sm },
  errorText: { fontSize: 13, color: theme.colors.danger },
  infoBanner: { backgroundColor: theme.colors.neutralSoft, borderRadius: theme.radius.md, padding: theme.spacing.sm },
  infoText: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  resetBtn: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 2 },
  resetText: { fontSize: 13, color: theme.colors.textLight, textDecorationLine: "underline" },
  note: { fontSize: 11, color: theme.colors.textLight, lineHeight: 16, marginTop: theme.spacing.xs },
});




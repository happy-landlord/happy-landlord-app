import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, MailCheck, PauseCircle, XCircle } from "lucide-react-native";

import { Button, Input, Logo, PillButton } from "@/components/ui";
import { theme } from "@/constants";
import { supabase } from "@/lib/supabase";
import { useLogin, useRequestAccess } from "@/lib/hooks";

// ── Validation schema ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({
    // Use onChange so iOS Password Autofill / Face ID populated values
    // are validated immediately (otherwise inputs never get "touched"
    // and isValid stays false, leaving the submit button disabled).
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Session is only established for approved/admin/pending users.
  // Rejected/inactive are signed out inside useLogin; their status is returned
  // as mutation data so the banners below render without a session.
  const loginMutation = useLogin();
  const deniedStatus = loginMutation.data?.status;
  const adminNote = loginMutation.data?.adminNote;
  const isInactive = deniedStatus === "inactive";
  const isRejected = deniedStatus === "rejected";

  // Reactivation / resubmit (denied accounts): signs in, submits a new request
  // → status flips to pending, then navigates to the pending page.
  const requestAccess = useRequestAccess();
  const onRequestAccess = () =>
    requestAccess.mutate(getValues(), {
      onSuccess: () => router.replace("/(app)/(tabs)" as never),
    });

  // Clears the denied banner + transient request/resend state. Called when the
  // user edits a field so a previous attempt never bleeds into the next one.
  const resetAttempt = () => {
    loginMutation.reset();
    requestAccess.reset();
    setResendSent(false);
  };

  const resendMutation = useMutation({
    meta: { silentError: true },
    mutationFn: async () => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: getValues("email").trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => setResendSent(true),
  });

  // Only genuinely unverified sign-ups (never confirmed their email) hit this
  // path — every other account state is handled after sign-in by the gate.
  const isEmailNotConfirmed =
    loginMutation.error instanceof Error &&
    loginMutation.error.message.toLowerCase().includes("email not confirmed");

  const onSubmit = handleSubmit((data) =>
    loginMutation.mutate(data, {
      onSuccess: (result) => {
        // Rejected/inactive stay on this screen — their banner is now visible.
        // Everyone else navigates; the layout gate handles pending vs dashboard.
        if (result?.status !== "rejected" && result?.status !== "inactive") {
          router.replace("/(app)/(tabs)" as never);
        }
      },
    }),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <KeyboardAwareScrollView
        bottomOffset={Platform.OS === "ios" ? 32 : 0}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Logo size={86} />
          </View>
          <Text style={styles.eyebrow}>HAPPY Landlord</Text>
          <Text style={styles.title}>Key Manager</Text>
          <Text style={styles.subtitle}>
            Sign in to manage properties, keysets, and handovers from one secure
            place.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fields}>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={(t) => {
                    onChange(t);
                    resetAttempt();
                  }}
                  onChange={(e) => onChange(e.nativeEvent.text)}
                  onEndEditing={(e) => onChange(e.nativeEvent.text)}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={(t) => {
                    onChange(t);
                    resetAttempt();
                  }}
                  onChange={(e) => onChange(e.nativeEvent.text)}
                  onEndEditing={(e) => onChange(e.nativeEvent.text)}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  rightIcon={
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                          color={theme.colors.textLight}
                          strokeWidth={2}
                        />
                      ) : (
                        <Eye
                          size={18}
                          color={theme.colors.textLight}
                          strokeWidth={2}
                        />
                      )}
                    </Pressable>
                  }
                />
              )}
            />

            {isInactive ? (
              <View style={styles.inactiveBanner}>
                <PauseCircle
                  size={20}
                  color={theme.colors.warning}
                  strokeWidth={2}
                />

                <View style={styles.verifyTextWrap}>
                  <Text style={styles.inactiveBannerTitle}>
                    Account deactivated
                  </Text>

                  <Text style={styles.verifyBody}>
                    Your account has been deactivated by an administrator.
                    Submit a reactivation request and an admin will review it
                    shortly.
                  </Text>

                  {requestAccess.isSuccess ? (
                    <Text style={styles.resubmitSent}>
                      Reactivation request sent ✓
                    </Text>
                  ) : (
                    <PillButton
                      label={
                        requestAccess.isPending
                          ? "Submitting..."
                          : "Submit reactivation request"
                      }
                      variant="accent"
                      loading={requestAccess.isPending}
                      disabled={requestAccess.isPending}
                      onPress={onRequestAccess}
                      style={{ alignSelf: "flex-start", marginTop: 2 }}
                    />
                  )}

                  {requestAccess.error && (
                    <Text style={styles.resubmitError}>
                      {requestAccess.error.message}
                    </Text>
                  )}
                </View>
              </View>
            ) : isRejected ? (
              <View style={styles.rejectedBanner}>
                <XCircle size={20} color={theme.colors.danger} strokeWidth={2} />

                <View style={styles.verifyTextWrap}>
                  <Text style={styles.rejectedBannerTitle}>
                    Request not approved
                  </Text>

                  {adminNote ? (
                    <Text style={styles.verifyBody}>{adminNote}</Text>
                  ) : (
                    <Text style={styles.verifyBody}>
                      Your registration request was not approved. You can request
                      access again below.
                    </Text>
                  )}

                  {requestAccess.isSuccess ? (
                    <Text style={styles.resubmitSent}>Request submitted ✓</Text>
                  ) : (
                    <PillButton
                      label={
                        requestAccess.isPending
                          ? "Submitting..."
                          : "Request access again"
                      }
                      variant="accent"
                      loading={requestAccess.isPending}
                      disabled={requestAccess.isPending}
                      onPress={onRequestAccess}
                      style={{ alignSelf: "flex-start", marginTop: 2 }}
                    />
                  )}

                  {requestAccess.error && (
                    <Text style={styles.resubmitError}>
                      {requestAccess.error.message}
                    </Text>
                  )}
                </View>
              </View>
            ) : isEmailNotConfirmed ? (
              <View style={styles.verifyBanner}>
                <MailCheck
                  size={20}
                  color={theme.colors.info}
                  strokeWidth={2}
                />
                <View style={styles.verifyTextWrap}>
                  <Text style={styles.verifyTitle}>Email not verified</Text>
                  <Text style={styles.verifyBody}>
                    Check your inbox and click the verification link before
                    signing in.
                  </Text>
                  {resendSent ? (
                    <Text style={styles.resendSent}>
                      Verification email sent ✓
                    </Text>
                  ) : (
                    <PillButton
                      label={
                        resendMutation.isPending
                          ? "Sending…"
                          : "Resend verification email"
                      }
                      variant="accent"
                      loading={resendMutation.isPending}
                      disabled={resendMutation.isPending}
                      onPress={() => resendMutation.mutate()}
                      style={{ alignSelf: "flex-start", marginTop: 2 }}
                    />
                  )}
                </View>
              </View>
            ) : loginMutation.error ? (
              <Text style={styles.errorText}>
                {loginMutation.error.message ?? "Sign in failed."}
              </Text>
            ) : null}
          </View>

          <Button
            title="Sign in securely"
            variant="primary"
            disabled={loginMutation.isPending}
            loading={loginMutation.isPending}
            onPress={onSubmit}
          />

          <View style={styles.securityNote}>
            <View style={styles.securityDot} />
            <Text style={styles.securityText}>
              Protected access for your property portfolio
            </Text>
          </View>

          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>New to HAPPY Landlord?</Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text style={styles.signUpLink}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.screen,
    paddingVertical: theme.spacing.xl,
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: theme.colors.accentSoft,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.colors.primarySoft,
  },
  hero: { alignItems: "center", marginBottom: theme.spacing.lg },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginBottom: 6,
  },
  eyebrow: {
    marginBottom: 18,
    color: theme.colors.accentLight,
    fontFamily: "Georgia",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 360,
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceWarm,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  fields: { gap: 6 },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  securityText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  signUpPrompt: { color: theme.colors.textMuted, fontSize: 13 },
  signUpLink: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.border,
  },
  verifyBanner: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.info + "40",
  },
  verifyTextWrap: { flex: 1, gap: theme.spacing.xs },
  verifyTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.info },
  verifyBody: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  resendSent: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: "600",
    marginTop: 2,
  },
  inactiveBanner: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warning + "40",
  },
  inactiveBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.warning,
  },
  rejectedBanner: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger + "40",
  },
  rejectedBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  resubmitSent: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: "600",
    marginTop: 2,
  },
  resubmitError: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 2,
  },
});

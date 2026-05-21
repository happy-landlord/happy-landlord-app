import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/ui/Logo";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type SignUpForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM: SignUpForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<SignUpForm>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (field: keyof SignUpForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const passwordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const signUpMutation = useMutation({
    mutationFn: async (f: SignUpForm) => {
      const { error } = await supabase.auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: {
          data: {
            full_name: f.fullName.trim(),
            phone: f.phone.trim(),
          },
        },
      });
      if (error) throw error;
    },
  });

  const canSubmit = useMemo(
    () =>
      form.fullName.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.password.length >= 8 &&
      form.password === form.confirmPassword &&
      !signUpMutation.isPending,
    [form, signUpMutation.isPending]
  );

  // After successful sign-up show a "check your email" screen.
  // Supabase will NOT auto-sign the user in when email confirmation is enabled,
  // so we stay on the auth flow until they verify then sign in.
  if (signUpMutation.isSuccess) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top }]}>
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />

        <View style={styles.successContent}>
          <View style={styles.logoWrap}>
            <Logo size={72} />
          </View>

          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successMessage}>
            We sent a verification link to
          </Text>
          <Text style={styles.successEmail}>{form.email.trim()}</Text>

          {/* Step list */}
          <View style={styles.steps}>
            <Step number={1} label="Verify your email address" active />
            <View style={styles.stepLine} />
            <Step number={2} label="Admin reviews your request" />
            <View style={styles.stepLine} />
            <Step number={3} label="Sign in and get started" />
          </View>

          <Text style={styles.successHint}>
            Once you verify your email, an admin will review your registration.
            You will be able to sign in after both steps are complete.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.6 }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.backLinkText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + theme.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Logo size={72} />
          </View>
          <Text variant="labelLarge" style={styles.eyebrow}>
            HAPPY LANDLORD
          </Text>
        </View>

        {/* Form card */}
        <Card mode="contained" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.formHeader}>
              <Text variant="titleLarge" style={styles.formTitle}>
                Agent registration
              </Text>
              <Text variant="bodySmall" style={styles.formSubtitle}>
                Your account will be reviewed by an admin before access is granted.
              </Text>
            </View>

            {/* Full name */}
            <TextInput
              activeOutlineColor={theme.colors.primary}
              autoCapitalize="words"
              autoComplete="name"
              label="Full name"
              mode="outlined"
              onChangeText={set("fullName")}
              outlineColor={theme.colors.border}
              placeholder="Jane Smith"
              placeholderTextColor={theme.colors.textLight}
              style={styles.input}
              textColor={theme.colors.text}
              value={form.fullName}
            />

            {/* Email */}
            <TextInput
              activeOutlineColor={theme.colors.primary}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              mode="outlined"
              onChangeText={set("email")}
              outlineColor={theme.colors.border}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textLight}
              style={styles.input}
              textColor={theme.colors.text}
              value={form.email}
            />

            {/* Phone (optional) */}
            <TextInput
              activeOutlineColor={theme.colors.primary}
              autoComplete="tel"
              keyboardType="phone-pad"
              label="Phone (optional)"
              mode="outlined"
              onChangeText={set("phone")}
              outlineColor={theme.colors.border}
              placeholder="+61 4xx xxx xxx"
              placeholderTextColor={theme.colors.textLight}
              style={styles.input}
              textColor={theme.colors.text}
              value={form.phone}
            />

            {/* Password */}
            <TextInput
              activeOutlineColor={theme.colors.primary}
              autoCapitalize="none"
              autoComplete="new-password"
              label="Password"
              mode="outlined"
              onChangeText={set("password")}
              outlineColor={theme.colors.border}
              placeholder="Min. 8 characters"
              placeholderTextColor={theme.colors.textLight}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword((v) => !v)}
                  color={theme.colors.textLight}
                />
              }
              secureTextEntry={!showPassword}
              style={styles.input}
              textColor={theme.colors.text}
              value={form.password}
            />

            {/* Confirm password */}
            <TextInput
              activeOutlineColor={
                passwordMismatch ? theme.colors.danger : theme.colors.primary
              }
              autoCapitalize="none"
              autoComplete="new-password"
              label="Confirm password"
              mode="outlined"
              onChangeText={set("confirmPassword")}
              outlineColor={
                passwordMismatch ? theme.colors.danger : theme.colors.border
              }
              placeholder="Re-enter your password"
              placeholderTextColor={theme.colors.textLight}
              right={
                <TextInput.Icon
                  icon={showConfirm ? "eye-off" : "eye"}
                  onPress={() => setShowConfirm((v) => !v)}
                  color={theme.colors.textLight}
                />
              }
              secureTextEntry={!showConfirm}
              style={styles.input}
              textColor={theme.colors.text}
              value={form.confirmPassword}
            />

            {/* Validation / error messages — only render when visible to avoid gap space */}
            {passwordMismatch && (
              <HelperText padding="none" type="error" visible style={styles.helperText}>
                Passwords do not match.
              </HelperText>
            )}

            {signUpMutation.error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerTitle}>Registration failed</Text>
                <Text style={styles.errorBannerBody}>
                  {signUpMutation.error.message || "An unexpected error occurred. Please try again."}
                </Text>
                {signUpMutation.error.message.toLowerCase().includes("database error") && (
                  <Text style={styles.errorBannerHint}>
                    This is a server configuration issue. Please contact your administrator.
                  </Text>
                )}
              </View>
            )}

            {/* Submit */}
            <Button
              buttonColor={theme.colors.primary}
              contentStyle={styles.buttonContent}
              disabled={!canSubmit}
              labelStyle={styles.buttonLabel}
              loading={signUpMutation.isPending}
              mode="contained"
              onPress={() => signUpMutation.mutate(form)}
              style={styles.button}
              textColor={theme.colors.textInverse}
            >
              Register
            </Button>

            {/* Link to login */}
            <View style={styles.loginRow}>
              <Text variant="bodySmall" style={styles.loginPrompt}>
                Already have an account?
              </Text>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.loginLink}>Sign in</Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Step({ number, label, active }: { number: number; label: string; active?: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, { backgroundColor: active ? theme.colors.info : theme.colors.neutralSoft }]}>
        <Text style={[styles.stepNumber, { color: active ? theme.colors.surface : theme.colors.textLight }]}>
          {number}
        </Text>
      </View>
      <Text style={[styles.stepLabel, { color: active ? theme.colors.text : theme.colors.textLight }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
  },
  eyebrow: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.primary,
    fontWeight: "700",
    letterSpacing: 1.6,
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
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  cardContent: {
    padding: theme.spacing.lg,
  },
  formHeader: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  formSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  helperText: {
    color: theme.colors.danger,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  errorBannerBody: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  errorBannerHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  button: {
    borderRadius: theme.radius.pill,
    marginBottom: theme.spacing.md,
  },
  buttonContent: {
    minHeight: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  loginPrompt: {
    color: theme.colors.textMuted,
  },
  loginLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  // ── Success state ──────────────────────────────────────────
  successScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  successCheck: {
    fontSize: 32,
    color: theme.colors.info,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  successEmail: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  steps: {
    width: "100%",
    maxWidth: 300,
    marginBottom: theme.spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  stepLine: {
    width: 2,
    height: 14,
    backgroundColor: theme.colors.border,
    marginLeft: 13,
  },
  successHint: {
    fontSize: 13,
    color: theme.colors.textLight,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
    marginBottom: theme.spacing.xl,
  },
  backLink: {
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backLinkText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

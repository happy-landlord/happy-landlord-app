import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, MailCheck } from "lucide-react-native";

import { Button, Input, Logo } from "@/components/ui";
import { theme, FEATURES } from "@/constants";
import { supabase } from "@/lib/supabase";
import { useLockStore } from "@/lib/state";

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
  const { setSkipBiometricOnce } = useLockStore();

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

  const loginMutation = useMutation({
    meta: { silentError: true },
    mutationFn: async ({ email, password }: LoginForm) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (FEATURES.BIOMETRIC_LOCK) setSkipBiometricOnce(true);
      setResendSent(false);
      // Navigate explicitly rather than relying on the (auth) layout's
      // <Redirect/> reacting to onAuthStateChange — on iOS Expo Go the
      // auth-state listener can fire *after* this callback, leaving the
      // user stuck on the login screen even though the session is saved.
      router.replace("/(app)/(tabs)" as never);
    },
  });

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

  const isEmailNotConfirmed =
    loginMutation.error instanceof Error &&
    loginMutation.error.message.toLowerCase().includes("email not confirmed");

  const onSubmit = handleSubmit((data) => loginMutation.mutate(data));

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
          <Text style={styles.eyebrow}>HAPPY LANDLORD</Text>
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
                  onChangeText={onChange}
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
                  onChangeText={onChange}
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

            {isEmailNotConfirmed ? (
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
                    <Pressable
                      onPress={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                      style={({ pressed }) =>
                        pressed ? { opacity: 0.6 } : null
                      }
                    >
                      <Text style={styles.resendLink}>
                        {resendMutation.isPending
                          ? "Sending…"
                          : "Resend verification email"}
                      </Text>
                    </Pressable>
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
            <Text style={styles.signUpPrompt}>New to Happy Landlord?</Text>
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
  fields: {
    gap: 6,
  },
  formHeader: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  formTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  formSubtitle: { color: theme.colors.textMuted, fontSize: 13 },
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
    backgroundColor: theme.colors.infoSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.info + "40",
    padding: theme.spacing.md,
  },
  verifyTextWrap: { flex: 1, gap: theme.spacing.xs },
  verifyTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.info },
  verifyBody: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  resendLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  resendSent: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: "600",
    marginTop: 2,
  },
});

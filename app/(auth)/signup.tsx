import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";

// ── Validation schema ─────────────────────────────────────────────────────────

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /^[+\d][\d\s\-()]{5,}$/.test(v),
        "Enter a valid phone number",
      ),
    password: z.string().min(8, "At least 8 characters required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<SignUpForm>({
    mode: "onTouched",
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (f: SignUpForm) => {
      const { error } = await supabase.auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: {
          data: {
            full_name: f.fullName.trim(),
            phone: f.phone?.trim() ?? "",
          },
        },
      });
      if (error) throw error;
    },
  });

  const onSubmit = handleSubmit((data) => signUpMutation.mutate(data));

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
          <Text style={styles.successEmail}>
            {getValues("email").trim()}
          </Text>

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
            style={({ pressed }) => [
              styles.backLink,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.backLinkText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <KeyboardAwareScrollView
        bottomOffset={Platform.OS === "ios" ? 32 : 0}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + theme.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Logo size={72} />
          </View>
          <Text style={styles.eyebrow}>HAPPY LANDLORD</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Agent registration</Text>
            <Text style={styles.formSubtitle}>
              Your account will be reviewed by an admin before access is
              granted.
            </Text>
          </View>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Full name"
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Jane Smith"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Phone (optional)"
                autoComplete="tel"
                keyboardType="phone-pad"
                placeholder="+61 4xx xxx xxx"
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
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
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
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
                      <EyeOff size={18} color={theme.colors.textLight} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={theme.colors.textLight} strokeWidth={2} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Confirm password"
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                secureTextEntry={!showConfirm}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                rightIcon={
                  <Pressable
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff size={18} color={theme.colors.textLight} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={theme.colors.textLight} strokeWidth={2} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          {signUpMutation.error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Registration failed</Text>
              <Text style={styles.errorBannerBody}>
                {signUpMutation.error.message ||
                  "An unexpected error occurred. Please try again."}
              </Text>
              {signUpMutation.error.message
                .toLowerCase()
                .includes("database error") && (
                <Text style={styles.errorBannerHint}>
                  This is a server configuration issue. Please contact your
                  administrator.
                </Text>
              )}
            </View>
          )}

          <Button
            title="Register"
            variant="primary"
            disabled={!isValid || signUpMutation.isPending}
            loading={signUpMutation.isPending}
            onPress={onSubmit}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account?</Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text style={styles.loginLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Step({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: active
              ? theme.colors.info
              : theme.colors.neutralSoft,
          },
        ]}
      >
        <Text
          style={[
            styles.stepNumber,
            { color: active ? theme.colors.surface : theme.colors.textLight },
          ]}
        >
          {number}
        </Text>
      </View>
      <Text
        style={[
          styles.stepLabel,
          { color: active ? theme.colors.text : theme.colors.textLight },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
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
  hero: { alignItems: "center", marginBottom: theme.spacing.lg },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
  },
  eyebrow: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.primary,
    fontSize: 13,
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
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  formHeader: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  formTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  formSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
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
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  loginPrompt: { color: theme.colors.textMuted, fontSize: 13 },
  loginLink: { fontSize: 13, color: theme.colors.primary, fontWeight: "700" },
  // ── Success state ──
  successScreen: { flex: 1, backgroundColor: theme.colors.background },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.screen,
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
  stepNumber: { fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
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

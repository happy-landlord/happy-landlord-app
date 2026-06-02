import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff, Fingerprint, ShieldCheck } from "lucide-react-native";

import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import { useLockStore } from "@/lib/state/lockStore";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  getBiometricLabel,
  type BiometricCapability,
} from "@/lib/services/biometric.service";

type LockMode = "biometric" | "password";

type LockScreenProps = {
  /** First name shown in the greeting. */
  userName: string | null | undefined;
  /** Pre-filled email for password re-authentication. */
  userEmail: string | null | undefined;
};

export function LockScreen({ userName, userEmail }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const { setLocked } = useLockStore();

  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );
  const [mode, setMode] = useState<LockMode>("biometric");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Password mode state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const didAutoPromptRef = useRef(false);

  // Detect the biometric type available on this device
  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  // Auto-trigger the biometric prompt only AFTER capability has loaded and
  // confirmed biometrics are available on this device/build.
  //
  // NOTE: expo-local-authentication / Face ID requires a custom dev build
  // (eas build --profile development) on iOS — it does NOT work in Expo Go
  // because the NSFaceIDUsageDescription permission is not present in the
  // Expo Go host app.  When running in Expo Go the capability check will
  // return isAvailable=false and the screen will gracefully fall back to the
  // password form.
  useEffect(() => {
    if (!capability || didAutoPromptRef.current) return;

    if (!capability.isAvailable) {
      // No biometrics on this device/build — skip straight to password.
      setMode("password");
      return;
    }

    didAutoPromptRef.current = true;

    // A small delay is required on iOS: calling authenticateAsync during a
    // navigation transition will be silently rejected by the OS.
    const timer = setTimeout(() => {
      triggerBiometric();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  const biometricLabel = capability
    ? getBiometricLabel(capability.type)
    : "Biometrics";
  const firstName = userName?.split(" ")[0] ?? null;

  async function triggerBiometric() {
    // Guard: don't attempt auth if we know biometrics aren't available
    // (e.g. running in Expo Go where NSFaceIDUsageDescription is absent).
    if (!capability?.isAvailable) {
      setMode("password");
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateWithBiometrics("Unlock Happy Landlord");

      if (result.success) {
        setLocked(false);
        return;
      }

      // Determine whether to fall back to password mode.
      // Cast to string to safely cover runtime values the TS types may omit
      // (e.g. "user_cancel" on older SDK builds, iOS-specific error strings).
      const err = result.error as string;
      const shouldFallback =
        err === "user_cancel" || // user tapped "Use password instead"
        err === "user_fallback" || // user chose device fallback
        err === "not_enrolled" || // biometric removed from device settings
        err === "passcode_not_set" || // device has no passcode enrolled
        err === "not_available" || // hardware not available / Expo Go
        err === "biometry_not_available" || // iOS: Face ID/Touch ID not available
        err === "biometry_not_enrolled" || // iOS: no biometric enrolled
        err === "biometry_lockout" || // iOS: too many failures, locked out
        err === "biometry_lockout_permanent"; // iOS: permanently locked

      if (shouldFallback) {
        setMode("password");
      }
      // authentication_failed / system_cancel / timeout → stay on biometric screen
    } catch (err) {
      // An exception here usually means the permission is missing entirely
      // (e.g. NSFaceIDUsageDescription absent in Expo Go). Fall back gracefully.
      console.warn("[LockScreen] biometric auth error:", err);
      setMode("password");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handlePasswordUnlock() {
    if (!userEmail || !password.trim() || isVerifying) return;

    setIsVerifying(true);
    setPasswordError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password.trim(),
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setLocked(false);
      }
    } catch {
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function backToBiometric() {
    setMode("biometric");
    setPassword("");
    setPasswordError("");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Decorative glows */}
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      {/* Logo */}
      <View style={styles.logoWrap}>
        <Logo size={52} />
      </View>

      <View style={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>
          {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
        </Text>

        {/* ── Biometric mode ─────────────────────────────────────────── */}
        {mode === "biometric" ? (
          <>
            <Text style={styles.hint}>
              Use {biometricLabel} to unlock the app.
            </Text>

            <Pressable
              onPress={triggerBiometric}
              disabled={isAuthenticating}
              style={({ pressed }) => [
                styles.biometricBtn,
                pressed && styles.biometricBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Unlock with ${biometricLabel}`}
            >
              {isAuthenticating ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <Fingerprint
                  size={52}
                  color={theme.colors.primary}
                  strokeWidth={1.4}
                />
              )}
            </Pressable>

            <Text style={styles.tapHint}>
              {isAuthenticating
                ? "Authenticating…"
                : `Tap to use ${biometricLabel}`}
            </Text>

            <Pressable
              onPress={() => setMode("password")}
              style={({ pressed }) => [
                styles.altLink,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.altLinkText}>Use password instead</Text>
            </Pressable>
          </>
        ) : (
          /* ── Password mode ─────────────────────────────────────────── */
          <View style={styles.passwordForm}>
            <Text style={styles.hint}>Enter your password to unlock.</Text>

            {userEmail ? (
              <Text style={styles.emailLabel}>{userEmail}</Text>
            ) : null}

            <Input
              autoCapitalize="none"
              autoComplete="current-password"
              autoFocus
              label="Password"
              onChangeText={(v) => {
                setPassword(v);
                setPasswordError("");
              }}
              onSubmitEditing={handlePasswordUnlock}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              error={passwordError || undefined}
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

            <Pressable
              onPress={handlePasswordUnlock}
              disabled={!password.trim() || isVerifying}
              style={({ pressed }) => [
                styles.unlockBtn,
                (!password.trim() || isVerifying) && styles.unlockBtnDisabled,
                pressed && !isVerifying && styles.unlockBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Unlock app"
            >
              {isVerifying ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <>
                  <ShieldCheck
                    size={17}
                    color={theme.colors.textInverse}
                    strokeWidth={2}
                  />
                  <Text style={styles.unlockBtnText}>Unlock</Text>
                </>
              )}
            </Pressable>

            {capability?.isAvailable ? (
              <Pressable
                onPress={backToBiometric}
                style={({ pressed }) => [
                  styles.altLink,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.altLinkText}>
                  ← Back to {biometricLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  logoWrap: {
    alignSelf: "center",
    marginTop: theme.spacing.xl * 1.5,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.md,
    marginTop: -theme.spacing.xl,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  hint: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },

  // Biometric
  biometricBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: theme.spacing.sm,
    // subtle shadow
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  biometricBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  tapHint: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontWeight: "500",
  },
  altLink: {
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  altLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.primarySoft,
  },

  // Password
  passwordForm: {
    width: "100%",
    maxWidth: 400,
    gap: theme.spacing.sm,
    alignItems: "stretch",
  },
  emailLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: -theme.spacing.xs,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: theme.spacing.xs,
  },
  unlockBtnDisabled: {
    backgroundColor: theme.colors.neutralSoft,
  },
  unlockBtnPressed: {
    opacity: 0.8,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
});

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
import { Fingerprint, ShieldCheck } from "lucide-react-native";

import { Input, Logo } from "@/components/ui";
import { theme } from "@/constants";
import { useLockStore } from "@/lib/state";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  getBiometricLabel,
  sendPhoneOtp,
  verifyPhoneOtp,
  type BiometricCapability,
} from "@/lib/services";
import { formatAustralianPhoneForDisplay, logger } from "@/lib/utils";

type LockMode = "biometric" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type LockScreenProps = {
  /** First name shown in the greeting. */
  userName: string | null | undefined;
  /** E.164 phone used for the OTP re-verification fallback. */
  userPhone: string | null | undefined;
};

export function LockScreen({ userName, userPhone }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const { setLocked } = useLockStore();

  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );
  const [mode, setMode] = useState<LockMode>("biometric");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // OTP fallback state
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const didAutoPromptRef = useRef(false);

  // Detect the biometric type available on this device
  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setInterval(() => {
      setResendCountdown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);

  // Auto-trigger the biometric prompt only AFTER capability has loaded and
  // confirmed biometrics are available on this device/build.
  //
  // NOTE: expo-local-authentication / Face ID requires a custom dev build
  // (eas build --profile development) on iOS — it does NOT work in Expo Go
  // because the NSFaceIDUsageDescription permission is not present in the
  // Expo Go host app.  When running in Expo Go the capability check will
  // return isAvailable=false and the screen will gracefully fall back to the
  // OTP form.
  useEffect(() => {
    if (!capability || didAutoPromptRef.current) return;

    if (!capability.isAvailable) {
      // No biometrics on this device/build — skip straight to OTP fallback.
      setMode("otp");
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
  const maskedPhone = userPhone
    ? formatAustralianPhoneForDisplay(userPhone)
    : null;

  async function triggerBiometric() {
    // Guard: don't attempt auth if we know biometrics aren't available
    // (e.g. running in Expo Go where NSFaceIDUsageDescription is absent).
    if (!capability?.isAvailable) {
      setMode("otp");
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateWithBiometrics("Unlock Happy Landlord");

      if (result.success) {
        setLocked(false);
        return;
      }

      // Determine whether to fall back to the OTP form.
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
        setMode("otp");
      }
      // authentication_failed / system_cancel / timeout → stay on biometric screen
    } catch (err) {
      // An exception here usually means the permission is missing entirely
      // (e.g. NSFaceIDUsageDescription absent in Expo Go). Fall back gracefully.
      logger.error(
        "[LockScreen] biometric auth error",
        err instanceof Error ? err : new Error(String(err)),
      );
      setMode("otp");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSendCode() {
    if (!userPhone || isSending || resendCountdown > 0) return;

    setIsSending(true);
    setOtpError("");
    try {
      await sendPhoneOtp(userPhone);
      setCodeSent(true);
      setCode("");
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      logger.error(
        "[LockScreen] failed to send OTP",
        err instanceof Error ? err : new Error(String(err)),
      );
      setOtpError("Couldn't send the code. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode() {
    if (!userPhone || code.length < OTP_LENGTH || isVerifying) return;

    setIsVerifying(true);
    setOtpError("");
    try {
      await verifyPhoneOtp(userPhone, code);
      // Re-verification succeeded — the Supabase session is refreshed.
      setLocked(false);
    } catch {
      setOtpError("That code is incorrect or has expired. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function backToBiometric() {
    setMode("biometric");
    setCode("");
    setOtpError("");
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
                <ActivityIndicator size="large" color={theme.colors.accent} />
              ) : (
                <Fingerprint
                  size={52}
                  color={theme.colors.accent}
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
              onPress={() => setMode("otp")}
              style={({ pressed }) => [
                styles.altLink,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.altLinkText}>Use a verification code</Text>
            </Pressable>
          </>
        ) : (
          /* ── OTP fallback mode ─────────────────────────────────────── */
          <View style={styles.passwordForm}>
            {!userPhone ? (
              <Text style={styles.hint}>
                No phone number is linked to this account. Please sign out and
                sign in again to unlock.
              </Text>
            ) : !codeSent ? (
              <>
                <Text style={styles.hint}>
                  We&apos;ll text a verification code to your registered mobile
                  number to unlock the app.
                </Text>

                {maskedPhone ? (
                  <Text style={styles.emailLabel}>{maskedPhone}</Text>
                ) : null}

                {otpError ? (
                  <Text style={styles.otpError}>{otpError}</Text>
                ) : null}

                <Pressable
                  onPress={handleSendCode}
                  disabled={isSending}
                  style={({ pressed }) => [
                    styles.unlockBtn,
                    isSending && styles.unlockBtnDisabled,
                    pressed && !isSending && styles.unlockBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Send verification code"
                >
                  {isSending ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accent}
                    />
                  ) : (
                    <>
                      <ShieldCheck
                        size={17}
                        color={theme.colors.accent}
                        strokeWidth={2}
                      />
                      <Text style={styles.unlockBtnText}>Send code</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.hint}>
                  Enter the 6-digit code we sent
                  {maskedPhone ? ` to ${maskedPhone}` : ""}.
                </Text>

                <Input
                  autoFocus
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  label="Verification code"
                  maxLength={OTP_LENGTH}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, "").slice(0, OTP_LENGTH));
                    setOtpError("");
                  }}
                  onSubmitEditing={handleVerifyCode}
                  placeholder="123456"
                  value={code}
                  error={otpError || undefined}
                />

                <Pressable
                  onPress={handleVerifyCode}
                  disabled={code.length < OTP_LENGTH || isVerifying}
                  style={({ pressed }) => [
                    styles.unlockBtn,
                    (code.length < OTP_LENGTH || isVerifying) &&
                      styles.unlockBtnDisabled,
                    pressed && !isVerifying && styles.unlockBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Unlock app"
                >
                  {isVerifying ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accent}
                    />
                  ) : (
                    <>
                      <ShieldCheck
                        size={17}
                        color={theme.colors.accent}
                        strokeWidth={2}
                      />
                      <Text style={styles.unlockBtnText}>Unlock</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleSendCode}
                  disabled={resendCountdown > 0 || isSending}
                  style={({ pressed }) => [
                    styles.altLink,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.altLinkText}>
                    {resendCountdown > 0
                      ? `Resend code in ${resendCountdown}s`
                      : "Resend code"}
                  </Text>
                </Pressable>
              </>
            )}

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
    backgroundColor: theme.colors.accentSoft,
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
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: theme.spacing.sm,
    // subtle shadow
    shadowColor: theme.colors.accent,
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
    color: theme.colors.accent,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.accentLight,
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
  otpError: {
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: "center",
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
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
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
    color: theme.colors.accent,
  },
});

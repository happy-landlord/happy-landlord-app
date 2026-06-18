import { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
import { AlertCircle } from "lucide-react-native";

import { Button, Logo, OtpInput, PillButton } from "@/components/ui";
import { theme } from "@/constants";
import { humaniseOtpError } from "@/lib/utils";
import type { usePhoneAuth } from "@/lib/hooks";

const ENTER_MS = 160;
const EXIT_MS = 110;
const subtleEnter = () =>
  FadeInDown.duration(ENTER_MS).easing(Easing.out(Easing.cubic));
const subtleExit = () =>
  FadeOutUp.duration(EXIT_MS).easing(Easing.in(Easing.cubic));

type ButtonLabel = { idle: string; busy: string };

type PhoneAuthScreenProps = {
  auth: ReturnType<typeof usePhoneAuth>;
  /** Small uppercase brand line above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Input fields (phone, and optionally name) rendered above the OTP block. */
  fields: ReactNode;
  /** Submits the phone-entry step (wired to the screen's form handler). */
  onSubmitPhone: () => void;
  /** Banner heading shown when the OTP send fails. */
  sendErrorTitle: string;
  /** Maps the raw send error to friendly copy. */
  humaniseSendError: (message: string | null | undefined) => string;
  sendLabel: ButtonLabel;
  verifyLabel: ButtonLabel;
  /** Footer content (terms, sign-in / sign-up links). */
  footer: ReactNode;
};

/**
 * Shared two-step phone → OTP screen scaffold used by both login and signup.
 * Owns the layout, OTP block, error banners, resend row and primary action;
 * the calling screen supplies its form fields, copy and footer.
 */
export function PhoneAuthScreen({
  auth,
  eyebrow,
  title,
  subtitle,
  fields,
  onSubmitPhone,
  sendErrorTitle,
  humaniseSendError,
  sendLabel,
  verifyLabel,
  footer,
}: PhoneAuthScreenProps) {
  const showOtpStep = auth.step === "otp";

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
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Animated.View style={styles.card}>
          <View style={styles.fields}>
            {fields}

            {showOtpStep && (
              <Animated.View
                entering={subtleEnter()}
                exiting={subtleExit()}
                style={styles.otpBlock}
              >
                <OtpInput
                  value={auth.otp}
                  onChange={auth.setOtp}
                  hasError={auth.showOtpError}
                  disabled={auth.isVerifying}
                />
                <View style={styles.resendRow}>
                  {auth.resendCountdown > 0 ? (
                    <Animated.Text
                      key="resend-countdown"
                      entering={subtleEnter()}
                      exiting={subtleExit()}
                      style={styles.resendPrompt}
                    >
                      Resend code in {Math.floor(auth.resendCountdown / 60)}:
                      {String(auth.resendCountdown % 60).padStart(2, "0")}
                    </Animated.Text>
                  ) : (
                    <Animated.View
                      key="resend-ready"
                      entering={subtleEnter()}
                      exiting={subtleExit()}
                      style={styles.resendReady}
                    >
                      <Text style={styles.resendPrompt}>
                        Didn&#39;t receive the code?
                      </Text>
                      <PillButton
                        label={auth.isSending ? "Sending..." : "Resend"}
                        variant="accent"
                        loading={auth.isSending}
                        disabled={!auth.canResend}
                        onPress={auth.resend}
                      />
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            )}

            {auth.showOtpError && (
              <Animated.View
                entering={subtleEnter()}
                exiting={subtleExit()}
                style={styles.errorBanner}
              >
                <AlertCircle size={16} color={theme.colors.danger} strokeWidth={2} />
                <View style={styles.bannerTextWrap}>
                  <Text style={styles.errorBannerTitle}>Verification failed</Text>
                  <Text style={styles.bannerBody}>
                    {humaniseOtpError(auth.verifyError?.message)}
                  </Text>
                </View>
              </Animated.View>
            )}

            {auth.sendError && (
              <Animated.View
                entering={subtleEnter()}
                exiting={subtleExit()}
                style={styles.errorBanner}
              >
                <AlertCircle size={16} color={theme.colors.danger} strokeWidth={2} />
                <View style={styles.bannerTextWrap}>
                  <Text style={styles.errorBannerTitle}>{sendErrorTitle}</Text>
                  <Text style={styles.bannerBody}>
                    {humaniseSendError(auth.sendError.message)}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>

          <Animated.View
            key={showOtpStep ? "verify-action" : "send-action"}
            entering={subtleEnter()}
            exiting={subtleExit()}
          >
            {showOtpStep ? (
              <Button
                title={auth.isVerifying ? verifyLabel.busy : verifyLabel.idle}
                variant="primary"
                disabled={!auth.isComplete || auth.isVerifying}
                loading={auth.isVerifying}
                onPress={auth.verify}
              />
            ) : (
              <Button
                title={auth.isSending ? sendLabel.busy : sendLabel.idle}
                variant="primary"
                disabled={auth.isSending}
                loading={auth.isSending}
                onPress={onSubmitPhone}
              />
            )}
          </Animated.View>

          {footer}
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Shared "Edit" affordance for the phone field while on the OTP step. */
export const phoneEditLinkStyle = StyleSheet.create({
  link: { fontSize: 13, color: theme.colors.accent, fontWeight: "600" },
}).link;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
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
  logoWrap: { borderRadius: theme.radius.lg, overflow: "hidden", marginBottom: 6 },
  eyebrow: {
    marginBottom: 18,
    color: theme.colors.accentLight,
    fontFamily: "Georgia",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
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
  otpBlock: { gap: theme.spacing.md, marginTop: theme.spacing.sm },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  resendReady: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  resendPrompt: { fontSize: 13, color: theme.colors.textMuted },
  errorBanner: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    padding: theme.spacing.md,
  },
  errorBannerTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.danger },
  bannerTextWrap: { flex: 1, gap: theme.spacing.xs },
  bannerBody: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
});


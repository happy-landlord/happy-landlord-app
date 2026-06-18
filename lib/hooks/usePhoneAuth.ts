import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  useSendOtp,
  useVerifyOtp,
  type OtpVerifyMode,
} from "./useSession";
// ─────────────────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
/** Seconds the user must wait before they can request another OTP. */
const RESEND_COOLDOWN_SECONDS = 60;
/** Which screen of the two-step flow is visible. */
export type PhoneAuthStep = "phone" | "otp";
type UsePhoneAuthOptions = {
  /**
   * The verify mode used when the user submits their code.
   *   "login"    — existing user signing in
   *   "register" — new signup confirming their number
   */
  mode: OtpVerifyMode;
};
// ─────────────────────────────────────────────────────────────────────────────
/**
 * usePhoneAuth
 *
 * Encapsulates the phone → OTP login lifecycle.
 * After successful OTP verification the session is primed for all account
 * statuses and the app layout routes the user to the correct screen
 * (main app for approved/admin, holding page for pending/rejected/inactive).
 */
export function usePhoneAuth({ mode }: UsePhoneAuthOptions) {
  const router = useRouter();
  const [step, setStep] = useState<PhoneAuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtpRaw] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  // ── Internals ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setInterval(() => {
      setResendCountdown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);
  function startResendCooldown() {
    setResendCountdown(RESEND_COOLDOWN_SECONDS);
  }
  function resetOtpState() {
    setOtpRaw("");
    verifyOtp.reset();
  }
  // ── Public handlers ──────────────────────────────────────────────────────
  /** Sends the OTP and advances to the code-entry step on success. */
  function sendCode(rawPhone: string, fullName?: string) {
    sendOtp.mutate(
      { phone: rawPhone, fullName },
      {
        onSuccess: () => {
          setPhone(rawPhone);
          resetOtpState();
          startResendCooldown();
          setStep("otp");
        },
      },
    );
  }
  /** Updates the typed code (digits only) and clears any stale verify error. */
  function setOtp(value: string) {
    setOtpRaw(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    if (verifyOtp.isError) verifyOtp.reset();
  }
  /** Verifies the code. Caches are primed for all statuses; layout routes. */
  function verify() {
    if (otp.length < OTP_LENGTH) return;
    verifyOtp.mutate(
      { phone, token: otp, mode },
      {
        onSuccess: () => {
          router.replace("/(app)/(tabs)" as never);
        },
      },
    );
  }
  /** Re-sends a fresh OTP to the same number. */
  function resend() {
    if (resendCountdown > 0 || sendOtp.isPending) return;
    setOtpRaw("");
    if (verifyOtp.isError) verifyOtp.reset();
    sendOtp.mutate(
      { phone },
      {
        onSuccess: () => {
          startResendCooldown();
        },
      },
    );
  }
  /** Returns to the phone-entry step. */
  function back() {
    setStep("phone");
    resetOtpState();
    setResendCountdown(0);
    sendOtp.reset();
  }
  // ── Derived flags ────────────────────────────────────────────────────────
  const isComplete = otp.length === OTP_LENGTH;
  const showOtpError = verifyOtp.isError;
  const canResend = resendCountdown === 0 && !sendOtp.isPending;
  return {
    step,
    phone,
    otp,
    setOtp,
    resendCountdown,
    canResend,
    isComplete,
    isSending: sendOtp.isPending,
    isVerifying: verifyOtp.isPending,
    sendError: sendOtp.error,
    verifyError: verifyOtp.error,
    showOtpError,
    sendCode,
    verify,
    resend,
    back,
    OTP_LENGTH,
  };
}
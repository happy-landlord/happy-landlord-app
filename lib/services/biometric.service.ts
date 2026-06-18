import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// ── Storage helpers ───────────────────────────────────────────────────────────

const storageKey = (userId: string) => `biometric_enabled_${userId}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type BiometricType = "faceid" | "fingerprint" | "iris";

export type BiometricCapability = {
  isAvailable: boolean;
  type: BiometricType;
};

// ── Hardware detection ────────────────────────────────────────────────────────

/**
 * Checks hardware support AND that the user has enrolled at least one
 * biometric credential.  Returns false on web.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === "web") {
    return { isAvailable: false, type: "fingerprint" };
  }

  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  if (!hasHardware || !isEnrolled) {
    return { isAvailable: false, type: "fingerprint" };
  }

  const type: BiometricType = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  )
    ? "faceid"
    : supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
    ? "iris"
    : "fingerprint";

  return { isAvailable: true, type };
}

export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case "faceid":
      // "Face ID" is Apple branding; Android face unlock should not use it.
      return Platform.OS === "ios" ? "Face ID" : "Face Unlock";
    case "iris":
      return "Iris scan";
    default:
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Triggers the OS biometric prompt.
 *
 * `disableDeviceFallback: true` prevents the OS from sliding to device
 * PIN/passcode — we handle the fallback ourselves as "Use password instead."
 *
 * On iOS the cancel button label is set by `cancelLabel`.
 * On Android it becomes the "negative" button text.
 */
export async function authenticateWithBiometrics(
  promptMessage: string
): Promise<LocalAuthentication.LocalAuthenticationResult> {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    cancelLabel: "Use password instead",
  });
}

// ── Preference storage (SecureStore, keyed per user) ─────────────────────────

/** Returns `true` if the user has opted in to biometric unlock. */
export async function isBiometricEnabled(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(storageKey(userId));
  return value === "true";
}

/** Persists the user's biometric-enable decision. */
export async function setBiometricEnabled(
  userId: string,
  enabled: boolean
): Promise<void> {
  await SecureStore.setItemAsync(
    storageKey(userId),
    enabled ? "true" : "false"
  );
}

/**
 * Returns `true` if the user has ever made a decision (yes OR no).
 * Used to decide whether to show the first-login "Enable biometric?" prompt.
 */
export async function hasBiometricDecision(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(storageKey(userId));
  return value !== null;
}


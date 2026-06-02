/**
 * Biometric-lock hooks.
 *
 * `useBiometricSettings()` — query+mutation API used by the Settings screen
 *                            for the per-user enable/disable switch.
 *
 * `useBiometricEnrolmentPrompt()` — owns the one-time "Enable biometrics?"
 *                            modal shown after a fresh sign-in.
 */

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FEATURES } from "@/constants/features";
import { useLockStore } from "@/lib/state/lockStore";
import { useCurrentUserId } from "@/lib/hooks/useSession";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  getBiometricLabel,
  hasBiometricDecision,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricCapability,
} from "@/lib/services/biometric.service";

// ── Query keys ───────────────────────────────────────────────────────────────

const biometricKey = (userId: string | undefined) =>
  ["biometric", "settings", userId ?? "none"] as const;

// ── Settings screen API ──────────────────────────────────────────────────────

type BiometricSettings = {
  capability: BiometricCapability;
  enabled: boolean;
};

/** Loads device capability + the user's enable preference. */
export function useBiometricSettings() {
  const userId = useCurrentUserId();
  return useQuery<BiometricSettings, Error>({
    queryKey: biometricKey(userId),
    queryFn: async () => {
      const [capability, enabled] = await Promise.all([
        getBiometricCapability(),
        userId ? isBiometricEnabled(userId) : Promise.resolve(false),
      ]);
      return { capability, enabled };
    },
    // Defense-in-depth: when the feature flag is off, never hit SecureStore.
    enabled: FEATURES.BIOMETRIC_LOCK && Boolean(userId),
    staleTime: 0,
  });
}

/**
 * Enable/disable mutation that runs the OS biometric prompt before turning
 * it ON, and a confirmation dialog before turning it OFF.
 *
 * No-op when `FEATURES.BIOMETRIC_LOCK` is false.
 */
export function useToggleBiometric() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, boolean>({
    mutationFn: async (enable) => {
      if (!FEATURES.BIOMETRIC_LOCK) return false;
      if (!userId) return false;

      if (enable) {
        const result = await authenticateWithBiometrics(
          "Verify your identity to enable biometric login",
        );
        if (!result.success) return false;
        await setBiometricEnabled(userId, true);
        return true;
      }

      // Disable — wrap the user-confirmation Alert in a promise so the
      // mutation's `isPending` state stays accurate for the spinner.
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Disable biometric login?",
          "You will need to enter your password the next time you open the app.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            {
              text: "Disable",
              style: "destructive",
              onPress: () => resolve(true),
            },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
      if (!confirmed) return false;
      await setBiometricEnabled(userId, false);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKey(userId) });
    },
  });
}

// ── First-login enrolment prompt ─────────────────────────────────────────────

type EnrolmentPrompt = {
  visible: boolean;
  biometricLabel: string;
  onEnable: () => Promise<void>;
  onDismiss: () => Promise<void>;
};

/**
 * Owns the "Enable biometrics?" modal lifecycle:
 *   - Only checks once per user (gated by `hasBiometricDecision`)
 *   - Stays hidden when the lock screen is showing or the feature is off
 *   - Both actions persist the user's choice via `setBiometricEnabled`
 */
export function useBiometricEnrolmentPrompt(): EnrolmentPrompt {
  const userId = useCurrentUserId();
  const initialized = useLockStore((s) => s.initialized);
  const isLocked = useLockStore((s) => s.isLocked);

  const [visible, setVisible] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Fingerprint");

  useEffect(() => {
    if (!FEATURES.BIOMETRIC_LOCK) return;
    if (!userId || !initialized || isLocked) return;

    let cancelled = false;

    async function check() {
      const alreadyDecided = await hasBiometricDecision(userId!);
      if (alreadyDecided || cancelled) return;

      const capability = await getBiometricCapability();
      if (!capability.isAvailable || cancelled) return;

      setBiometricLabel(getBiometricLabel(capability.type));
      setVisible(true);
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [userId, initialized, isLocked]);

  const onEnable = async () => {
    if (userId) await setBiometricEnabled(userId, true);
    setVisible(false);
  };

  const onDismiss = async () => {
    // "Maybe later" — record the decision so we don't ask again.
    if (userId) await setBiometricEnabled(userId, false);
    setVisible(false);
  };

  return { visible, biometricLabel, onEnable, onDismiss };
}

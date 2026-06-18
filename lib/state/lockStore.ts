import { create } from "zustand";

type LockState = {
  /** Whether the app UI is currently gated behind biometric/password. */
  isLocked: boolean;
  /**
   * True once we have finished reading the biometric preference from
   * SecureStore on startup.  We hold a loading spinner until this is true
   * to avoid a flash of unlocked content.
   */
  initialized: boolean;
  /**
   * The user's persisted biometric-lock preference (mirrors SecureStore).
   * Used by the AppState listener to decide whether to re-lock when the app
   * returns from the background.
   */
  biometricEnabled: boolean;
  /**
   * Set to `true` when the user just completed a fresh email/password login.
   * When this is true, the biometric gate is skipped for this app session
   * (they already proved their identity via password).
   */
  skipBiometricOnce: boolean;

  setLocked: (locked: boolean) => void;
  /**
   * Call once on startup with the initial lock state and the user's persisted
   * biometric preference.
   */
  initialize: (locked: boolean, enabled: boolean) => void;
  /** Keep the mirrored preference in sync when the user toggles it at runtime. */
  setBiometricEnabled: (enabled: boolean) => void;
  /** Call on sign-out so the next login starts fresh. */
  reset: () => void;
  /** Call after a fresh email/password login to bypass the lock gate once. */
  setSkipBiometricOnce: (skip: boolean) => void;
};

export const useLockStore = create<LockState>((set) => ({
  isLocked: false,
  initialized: false,
  biometricEnabled: false,
  skipBiometricOnce: false,
  setLocked: (locked) => set({ isLocked: locked }),
  initialize: (locked, enabled) =>
    set({ isLocked: locked, biometricEnabled: enabled, initialized: true }),
  setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
  setSkipBiometricOnce: (skip) => set({ skipBiometricOnce: skip }),
  reset: () =>
    set({
      isLocked: false,
      initialized: false,
      biometricEnabled: false,
      skipBiometricOnce: false,
    }),
}));

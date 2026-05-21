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
   * Set to `true` when the user just completed a fresh email/password login.
   * When this is true, the biometric gate is skipped for this app session
   * (they already proved their identity via password).
   */
  skipBiometricOnce: boolean;

  setLocked: (locked: boolean) => void;
  /** Call once on startup with the result of `isBiometricEnabled`. */
  initialize: (locked: boolean) => void;
  /** Call on sign-out so the next login starts fresh. */
  reset: () => void;
  /** Call after a fresh email/password login to bypass the lock gate once. */
  setSkipBiometricOnce: (skip: boolean) => void;
};

export const useLockStore = create<LockState>((set) => ({
  isLocked: false,
  initialized: false,
  skipBiometricOnce: false,
  setLocked: (locked) => set({ isLocked: locked }),
  initialize: (locked) => set({ isLocked: locked, initialized: true }),
  setSkipBiometricOnce: (skip) => set({ skipBiometricOnce: skip }),
  reset: () => set({ isLocked: false, initialized: false, skipBiometricOnce: false }),
}));

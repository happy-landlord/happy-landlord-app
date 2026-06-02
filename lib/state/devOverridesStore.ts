import { create } from "zustand";

/**
 * Session-scoped developer overrides used for QA / local testing.
 *
 * - Values are **in-memory only** — they reset on every app cold-start so they
 *   can never accidentally leak into a release.
 * - Consumers must additionally gate on `__DEV__` so the override is a complete
 *   no-op in production bundles (Metro strips the branch).
 */
type DevOverridesState = {
  /**
   * Forces `useRole().isAdmin` to `true` regardless of the DB-stored profile
   * role. Lets agents preview the admin UI without changing the database.
   */
  adminOverride: boolean;
  setAdminOverride: (value: boolean) => void;
  toggleAdminOverride: () => void;
  reset: () => void;
};

export const useDevOverridesStore = create<DevOverridesState>((set) => ({
  adminOverride: false,
  setAdminOverride: (value) => set({ adminOverride: value }),
  toggleAdminOverride: () =>
    set((state) => ({ adminOverride: !state.adminOverride })),
  reset: () => set({ adminOverride: false }),
}));


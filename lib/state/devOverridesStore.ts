import { create } from "zustand";

/**
 * Session-scoped role overrides used for previews and local testing.
 *
 * - Values are **in-memory only** — they reset on every app cold-start so they
 *   can never accidentally leak into a release.
 * - Developer-only overrides must additionally be gated on `__DEV__` by their
 *   consumers so they are a complete no-op in production bundles.
 */
type DevOverridesState = {
  /**
   * Forces `useRole().isAdmin` to `true` regardless of the DB-stored profile
   * role. Lets agents preview the admin UI without changing the database.
   */
  adminOverride: boolean;
  setAdminOverride: (value: boolean) => void;
  toggleAdminOverride: () => void;
  /** Lets a real admin temporarily use the app's agent experience. */
  agentOverride: boolean;
  setAgentOverride: (value: boolean) => void;
  toggleAgentOverride: () => void;
  reset: () => void;
};

export const useDevOverridesStore = create<DevOverridesState>((set) => ({
  adminOverride: false,
  setAdminOverride: (value) => set({ adminOverride: value }),
  toggleAdminOverride: () =>
    set((state) => ({ adminOverride: !state.adminOverride })),
  agentOverride: false,
  setAgentOverride: (value) => set({ agentOverride: value }),
  toggleAgentOverride: () =>
    set((state) => ({ agentOverride: !state.agentOverride })),
  reset: () => set({ adminOverride: false, agentOverride: false }),
}));

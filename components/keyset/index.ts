/**
 * Public API for `@/components/keyset`.
 *
 * Folder layout:
 *   keyset/
 *     ├─ <atoms / helpers / cards>  ← top level, frequently imported
 *     ├─ detail/                    ← keyset detail-screen internals
 *     └─ modals/                    ← KeySetModals umbrella + sheets
 *
 * Only the names listed here are consumed from outside this folder.
 * Sub-folder internals (`KeySetKeysList`, `KeySetSummaryRow`,
 * `SelectedKeysSummary`, `useKeySetActions`, the `useKeySetScreen` hook,
 * individual modal components) are imported via relative paths within
 * the folder and intentionally not re-exported.
 */

// ── Shared atoms & helpers ───────────────────────────────────────────────────
export { getKeySetCardStatus } from "./getKeySetCardStatus";
export type { KeySetCardStatus, KeySetLike } from "./getKeySetCardStatus";
export { KeyStatusChip, resolveKeyStatusChipStatus } from "./KeyStatusChip";
export type { KeyStatusChipStatus } from "./KeyStatusChip";
export {
  useKeysetAvailability,
  useKeysetAvailabilityFor,
} from "./useKeysetAvailability";

// ── Cards ────────────────────────────────────────────────────────────────────
export { KeyDashboardSummary, PropertyStatsBanner } from "./KeyDashboardSummary";
export { KeySetCard } from "./KeySetCard";
export type { KeySetCardVariant, KeySetCardProps } from "./KeySetCard";
export { KeySetPropertyCard } from "./KeySetPropertyCard";
export type {
  KeySetPropertyCardItem,
  KeySetPropertyCardProps,
} from "./KeySetPropertyCard";
export { KeySetReservedCard } from "./KeySetReservedCard";
export type { KeySetReservedCardProps } from "./KeySetReservedCard";

// ── Detail screen ────────────────────────────────────────────────────────────
export { KeySetActionsPanel } from "./detail/KeySetActionsPanel";
export { KeySetDetailsCard } from "./detail/KeySetDetailsCard";
export { KeySetLastActivity } from "./detail/KeySetLastActivity";
export { KeySetScreenProvider } from "./detail/KeySetScreenContext";

// ── Modals ───────────────────────────────────────────────────────────────────
export { KeySetModals } from "./modals/KeySetModals";
export { TransferConfirmModal } from "./modals/TransferConfirmModal";

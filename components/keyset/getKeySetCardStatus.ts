/**
 * Shared status derivation for every keyset card (admin list, agent list,
 * detail hero, activity tabs). Computes the five flags + canonical chip
 * status from a keyset and its optional availability descriptor in one
 * place — so the cards don't each re-implement the same `overdue` /
 * `isReserved` / etc. boolean ladder.
 *
 * The input type is intentionally structural (`KeySetLike`) so it
 * accepts every keyset-shaped row in the app: `KeySetWithDetails`,
 * `CheckedOutKeySet`, `KeySetNeedingAttention`, etc.
 */
import type { KeySetStatus } from "@/types";
import { isPastDue, isReservedState, type KeysetAvailability } from "@/lib/utils";

import {
  resolveKeyStatusChipStatus,
  type KeyStatusChipStatus,
} from "./KeyStatusChip";

/** Minimal shape needed to derive a card status. */
export type KeySetLike = {
  status: KeySetStatus;
  due_back_at: string | null;
};

export type KeySetCardStatus = {
  /** Status raw from the DB (handy when cards branch on it directly). */
  rawStatus: KeySetStatus;
  /** `true` when the keyset is past `due_back_at` (or already marked overdue). */
  overdue: boolean;
  /** `true` when an active reservation should override the available state. */
  isReserved: boolean;
  /** Convenience: checked out OR overdue. */
  isCheckedOut: boolean;
  /** Convenience: in handover to a tenant or landlord. */
  isHandover: boolean;
  /** Convenience: lost/damaged. */
  isMissingDamaged: boolean;
  /** Canonical chip status for `<KeyStatusChip />`. */
  chipStatus: KeyStatusChipStatus;
};

export function getKeySetCardStatus(
  keySet: KeySetLike,
  availability?: KeysetAvailability,
): KeySetCardStatus {
  const overdue =
    keySet.status === "overdue" ||
    (keySet.status === "checked_out" && keySet.due_back_at
      ? isPastDue(keySet.due_back_at)
      : false);

  const isReserved =
    keySet.status === "available" && isReservedState(availability?.state);

  const isCheckedOut =
    keySet.status === "checked_out" || keySet.status === "overdue" || overdue;

  const isHandover =
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord";

  const isMissingDamaged = keySet.status === "missing_damaged";

  const chipStatus = resolveKeyStatusChipStatus({
    status: keySet.status,
    overdue,
    reserved: isReserved,
  });

  return {
    rawStatus: keySet.status,
    overdue,
    isReserved,
    isCheckedOut,
    isHandover,
    isMissingDamaged,
    chipStatus,
  };
}


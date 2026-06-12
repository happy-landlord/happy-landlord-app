import type { KeySetStatus } from "@/types";
import { Pill, type PillTone } from "@/components/ui";

// ── Status display config ─────────────────────────────────────────────────────

/**
 * Statuses the chip can render. Extends `KeySetStatus` (the DB enum) with
 * the synthetic `"reserved"` state, which is computed from the active
 * reservations on an otherwise-`"available"` keyset.
 */
export type KeyStatusChipStatus = KeySetStatus | "reserved";

type StatusConfig = { label: string; tone: PillTone };

const STATUS_CONFIG: Record<KeyStatusChipStatus, StatusConfig> = {
  available: { label: "Available", tone: "success" },
  reserved: { label: "Reserved", tone: "warning" },
  checked_out: { label: "Checked Out", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  handover_tenant: { label: "With Tenant", tone: "tenant" },
  handover_landlord: { label: "With Landlord", tone: "primary" },
  missing_damaged: { label: "Lost", tone: "neutral" },
  inactive: { label: "Inactive", tone: "neutral" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the canonical chip status for a keyset, given the raw DB status
 * plus the two derived flags every card needs to compute (`overdue` from
 * `due_back_at`, and `reserved` from the live availability state).
 *
 * Use this from every keyset card so chip labels/colors stay in lock-step
 * with `STATUS_CONFIG` below.
 */
export function resolveKeyStatusChipStatus(opts: {
  status: KeySetStatus;
  overdue?: boolean;
  reserved?: boolean;
}): KeyStatusChipStatus {
  if (opts.overdue) return "overdue";
  if (opts.reserved && opts.status === "available") return "reserved";
  return opts.status;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KeyStatusChip({
  status,
  size = "sm",
}: {
  status: KeyStatusChipStatus;
  size?: "sm" | "md";
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <Pill tone={cfg.tone} size={size}>
      {cfg.label}
    </Pill>
  );
}

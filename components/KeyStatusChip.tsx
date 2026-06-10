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
  handover_tenant: { label: "With Tenant", tone: "info" },
  handover_landlord: { label: "With Landlord", tone: "neutral" },
  missing_damaged: { label: "Lost", tone: "danger" },
  inactive: { label: "Inactive", tone: "neutral" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function KeyStatusChip({ status }: { status: KeyStatusChipStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <Pill tone={cfg.tone} size="sm">
      {cfg.label}
    </Pill>
  );
}

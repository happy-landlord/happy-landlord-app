import type { KeySetStatus } from "@/types";
import { Pill, type PillTone } from "@/components/ui";

// ── Status display config ─────────────────────────────────────────────────────

type StatusConfig = { label: string; tone: PillTone };

const STATUS_CONFIG: Record<KeySetStatus, StatusConfig> = {
  available: { label: "Available", tone: "success" },
  checked_out: { label: "Checked Out", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  handover_tenant: { label: "With Tenant", tone: "info" },
  handover_landlord: { label: "With Landlord", tone: "neutral" },
  missing_damaged: { label: "Lost", tone: "danger" },
  inactive: { label: "Inactive", tone: "neutral" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function KeyStatusChip({ status }: { status: KeySetStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <Pill tone={cfg.tone} size="sm">
      {cfg.label}
    </Pill>
  );
}

import { ChevronRight, KeyRound } from "lucide-react-native";

import { EntityCard, MetaRow, type MetaItem } from "@/components/ui";
import { theme } from "@/constants";
import { formatStreetLine, getTotalKeyQuantity } from "@/lib/utils";

import { getKeySetCardStatus, type KeySetLike } from "./getKeySetCardStatus";
import { KeyStatusChip } from "./KeyStatusChip";

// ── KeySetPropertyCard ───────────────────────────────────────────────────────
// "Keyset row with the property as the headline entity" — used wherever the
// user is browsing keysets ACROSS properties (admin "Checked Out" tab, admin
// "Needs Attention" tab, agent "My Keysets" section). The address is what
// identifies each row; the keyset status drives the badge.
//
// Distinct from `KeySetCard` which is the per-property view where the
// keyset's own name/code is the entity.

type PropertyShape = {
  unit_number: string | null;
  address: string;
  suburb: string;
} | null;

type HolderShape = {
  full_name: string | null;
  holder_type: "agent" | "tenant" | "landlord";
  phone: string | null;
} | null;

export type KeySetPropertyCardItem = KeySetLike & {
  property: PropertyShape;
  /** Optional: when omitted, the key-count pill is hidden. */
  keys?: { label: string; quantity?: number | null }[] | null;
  current_holder?: HolderShape;
};

export type KeySetPropertyCardProps = {
  item: KeySetPropertyCardItem;
  /** When false, the holder meta block is hidden (e.g. agent "My Keysets"). */
  showHolder?: boolean;
  /** When true, the status chip is hidden if the status is "checked_out". Other statuses (overdue, handover, etc.) are still shown. */
  hideCheckedOutBadge?: boolean;
  /** When true, the key-count pill is hidden. */
  hideCount?: boolean;
  onPress: () => void;
};

export function KeySetPropertyCard({
  item,
  showHolder = true,
  hideCheckedOutBadge = false,
  hideCount = false,
  onPress,
}: KeySetPropertyCardProps) {
  const { chipStatus, isCheckedOut, isHandover, isMissingDamaged } =
    getKeySetCardStatus(item);

  const suburb = item.property?.suburb?.trim() ?? "";
  const streetLine = formatStreetLine(item.property);
  const keyCount = getTotalKeyQuantity(item);

  const countLabel =
    !hideCount && keyCount > 0
      ? `${keyCount} ${keyCount === 1 ? "key" : "keys"}`
      : null;
  const eyebrow = [suburb, countLabel].filter(Boolean).join(" · ") || undefined;

  const holder = item.current_holder;
  const holderName = holder?.full_name ?? null;
  const renderHolder =
    showHolder &&
    (isCheckedOut || isHandover || isMissingDamaged) &&
    !!holderName;

  const holderMeta: MetaItem[] | undefined = renderHolder
    ? [
        {
          label: "With",
          value: `${holderName}${holder?.holder_type && holder.holder_type !== "agent" ? ` · ${holder.holder_type}` : ""}`,
        },
        { label: "Contact", value: holder?.phone ?? "No contact" },
      ]
    : undefined;

  return (
    <EntityCard
      icon={KeyRound}
      iconTone="neutral"
      eyebrow={eyebrow}
      title={streetLine}
      pills={
        !(hideCheckedOutBadge && chipStatus === "checked_out") ? (
          <KeyStatusChip status={chipStatus} size="md" />
        ) : undefined
      }
      meta={holderMeta ? <MetaRow items={holderMeta} divider={false} /> : undefined}
      right={
        <ChevronRight
          size={16}
          color={theme.colors.textLight}
          strokeWidth={2.5}
        />
      }
      onPress={onPress}
      pressEffect="lift"
      accessibilityLabel={streetLine}
    />
  );
}

import { CalendarClock, ChevronRight } from "lucide-react-native";

import { EntityCard, Pill } from "@/components/ui";
import { theme } from "@/constants";
import { formatStreetLine } from "@/lib/utils";
import type { MyReservation } from "@/lib/services";

import { KeyStatusChip } from "./KeyStatusChip";

// ── KeySetReservedCard ───────────────────────────────────────────────────────
// Agent-side row for a reservation the agent currently holds but hasn't
// checked out yet. Lives on the activity screen alongside `KeySetPropertyCard`
// (which is used for keysets the agent already has checked out).
//
// Uses the canonical "Reserved" chip from `KeyStatusChip` so its labelling
// stays in lock-step with the rest of the app.

export type KeySetReservedCardProps = {
  reservation: MyReservation;
  onPress: () => void;
};

export function KeySetReservedCard({
  reservation,
  onPress,
}: KeySetReservedCardProps) {
  const { key_set } = reservation;
  const property = key_set?.property ?? null;
  const keyCount = key_set?.keys.length ?? 0;

  const suburb = property?.suburb?.trim() ?? "";
  const streetLine = formatStreetLine(property);

  return (
    <EntityCard
      icon={CalendarClock}
      iconTone="warning"
      eyebrow={suburb}
      title={streetLine}
      pills={
        <>
          <KeyStatusChip status="reserved" />
          {keyCount > 0 ? (
            <Pill tone="neutral" size="sm">
              {keyCount} {keyCount === 1 ? "key" : "keys"}
            </Pill>
          ) : null}
        </>
      }
      right={
        <ChevronRight
          size={16}
          color={theme.colors.textLight}
          strokeWidth={2.5}
        />
      }
      onPress={onPress}
      pressEffect="lift"
      accessibilityLabel={key_set?.name ?? "Reserved keyset"}
    />
  );
}


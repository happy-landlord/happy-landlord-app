import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { KeyRound, ChevronRight } from "lucide-react-native";

import { EntityCard, MetaRow, type MetaItem } from "@/components/ui";
import { KeyStatusChip } from "./KeyStatusChip";
import { getTotalKeyQuantity } from "@/lib/utils";
import type { KeySetWithDetails } from "@/lib/services";
import { theme } from "@/constants";

import { getKeySetCardStatus } from "./getKeySetCardStatus";
import { useKeysetAvailabilityFor } from "./useKeysetAvailability";

// ── KeySetCard ───────────────────────────────────────────────────────────────
// Shared list/row card for a keyset, used by both the admin property
// view (whole-card press → navigate) and the agent property view
// (footer-only "Transfer to Me" action).
//
// `variant` only controls cosmetic + role-specific bits:
//   • admin  — md icon, code-prefix eyebrow, holder meta for missing/damaged
//   • agent  — sm icon, no eyebrow, no missing/damaged (filtered upstream)
//
// Interaction is left entirely to the owner via the `onPress` and `footer`
// slots — the card itself never knows about navigation or mutations.

export type KeySetCardVariant = "admin" | "agent";

export type KeySetCardProps = {
  keySet: KeySetWithDetails;
  variant: KeySetCardVariant;
  /** Whole-card press handler (admin navigates to the keyset detail). */
  onPress?: () => void;
  /** Optional footer slot rendered below the meta block (agent's transfer button). */
  footer?: ReactNode;
};

export function KeySetCard({
  keySet,
  variant,
  onPress,
  footer,
}: KeySetCardProps) {
  const availability = useKeysetAvailabilityFor(keySet);
  const { isCheckedOut, isHandover, isMissingDamaged, chipStatus } =
    getKeySetCardStatus(keySet, availability);

  const holder = keySet.current_holder;
  const holderName = holder?.full_name;
  const totalKeys = getTotalKeyQuantity(keySet);
  const keyCountLabel = `${totalKeys} ${totalKeys === 1 ? "key" : "keys"}`;
  const isAdmin = variant === "admin";
  const isAdminPressable = isAdmin && !!onPress;

  const showHolder =
    (isCheckedOut || isHandover || (isAdmin && isMissingDamaged)) &&
    !!holderName;

  const holderMeta: MetaItem[] | undefined = showHolder
    ? [
        {
          label: "With",
          value: `${holderName}${holder?.holder_type && holder.holder_type !== "agent" ? ` · ${holder.holder_type}` : ""}`,
        },
        { label: "Contact", value: holder?.phone ?? "No contact" },
      ]
    : undefined;

  // Admin: name (big) + "code · X keys" subtitle below
  // Agent: "name · X keys" inline in title (name big, count smaller)
  const agentTitle: ReactNode = !isAdmin ? (
    <Text style={cardStyles.agentTitle} numberOfLines={2}>
      {keySet.name}
      <Text style={cardStyles.agentCount}> · {keyCountLabel}</Text>
    </Text>
  ) : undefined;

  return (
    <EntityCard
      icon={KeyRound}
      iconTone="neutral"
      iconSize={isAdmin ? "md" : "sm"}
      title={agentTitle ?? keySet.name}
      subtitle={isAdmin ? `${keySet.code} · ${keyCountLabel}` : undefined}
      pills={<KeyStatusChip status={chipStatus} size="md" />}
      right={
        isAdmin && onPress ? (
          <ChevronRight
            size={16}
            color={theme.colors.textLight}
            strokeWidth={2.5}
          />
        ) : undefined
      }
      meta={
        holderMeta ? <MetaRow items={holderMeta} divider={false} /> : undefined
      }
      footer={footer}
      onPress={onPress}
      pressEffect={isAdminPressable ? "lift" : undefined}
      accessibilityLabel={keySet.name}
    />
  );
}

const cardStyles = StyleSheet.create({
  agentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  agentCount: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 0,
  },
});


/**
 * AgentKeysetActions.tsx
 * Context-sensitive action panel for company keysets — agent view.
 *
 * Renders a primary CTA, status-specific secondary actions, and a
 * persistent "Quick actions" row. Drop it into any keyset detail screen:
 *
 *   <AgentKeysetActions
 *     status={keyset.status}
 *     currentHolderName={keyset.currentHolderName}
 *     expectedReturnTime={keyset.expectedReturnTime}
 *     onCheckOut={() => {}}
 *     ...
 *   />
 *
 * Applies to company keysets only.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { formatReturnTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// Palette — blended with the app theme
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primaryGreen: "#3C8D7A",
  primaryGreenSoft: "#E4F4F1",
  slateBlue: "#4B5C77",
  slateBlueSoft: "#EBF0F6",
  amberGold: "#FFC857",
  amberGoldSoft: "#FFF6DC",
  softWhite: "#F9FAFB",
  charcoal: "#2D2D2D",
  coolGrey: "#AEB4BE",
  coolGreySoft: "#F2F4F7",
  dangerRed: theme.colors.danger,
  dangerSoft: theme.colors.dangerSoft,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type KeysetStatus =
  | "available"
  | "checked_out_by_me"
  | "checked_out_by_other"
  | "overdue"
  | "missing"
  | "damaged";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Visual variant determines fill/outline colouring of a button. */
type ActionVariant =
  | "primary-green"
  | "primary-blue"
  | "primary-amber"
  | "primary-danger"
  | "secondary"
  | "secondary-danger";

export type ActionItem = {
  label: string;
  icon: IoniconName;
  variant: ActionVariant;
  onPress: () => void;
};

type StatusActions = {
  /** Context banner text shown above the primary button (optional). */
  banner?: string;
  primary: ActionItem;
  secondary: ActionItem[];
};

export type AgentKeysetActionsProps = {
  status: KeysetStatus;
  /** Display name of whoever currently holds the keyset. */
  currentHolderName?: string;
  /** ISO timestamp of the expected return. */
  expectedReturnTime?: string;
  onCheckOut: () => void;
  onReturn: () => void;
  onHandover: () => void;
  onExtendBooking: () => void;
  onReserve: () => void;
  onRequestAccess: () => void;
  onContactCurrentHolder: () => void;
  onContactManager: () => void;
  onReportIssue: () => void;
  onReportDelay: () => void;
  onMarkAsFound: () => void;
  onViewIssueReport: () => void;
  onAddUpdate: () => void;
  onViewInstructions: () => void;
  onViewHistory: () => void;
  onAddNote: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build status-specific actions
// ─────────────────────────────────────────────────────────────────────────────

export function getActionsForStatus(
  status: KeysetStatus,
  props: AgentKeysetActionsProps,
): StatusActions {
  const {
    currentHolderName,
    expectedReturnTime,
    onCheckOut,
    onReturn,
    onHandover,
    onExtendBooking,
    onReserve,
    onRequestAccess,
    onContactCurrentHolder,
    onContactManager,
    onReportIssue,
    onReportDelay,
    onMarkAsFound,
    onViewIssueReport,
    onAddUpdate,
    onViewInstructions,
  } = props;

  switch (status) {
    case "available":
      return {
        primary: {
          label: "Check out keyset",
          icon: "key-outline",
          variant: "primary-green",
          onPress: onCheckOut,
        },
        secondary: [
          {
            label: "Reserve keyset",
            icon: "calendar-outline",
            variant: "secondary",
            onPress: onReserve,
          },
          {
            label: "View instructions",
            icon: "reader-outline",
            variant: "secondary",
            onPress: onViewInstructions,
          },
          {
            label: "Report issue",
            icon: "warning-outline",
            variant: "secondary-danger",
            onPress: onReportIssue,
          },
        ],
      };

    case "checked_out_by_me":
      return {
        primary: {
          label: "Return keyset",
          icon: "return-down-back-outline",
          variant: "primary-green",
          onPress: onReturn,
        },
        secondary: [
          {
            label: "Handover keyset",
            icon: "swap-horizontal-outline",
            variant: "secondary",
            onPress: onHandover,
          },
          {
            label: "Extend booking",
            icon: "time-outline",
            variant: "secondary",
            onPress: onExtendBooking,
          },
          {
            label: "View instructions",
            icon: "reader-outline",
            variant: "secondary",
            onPress: onViewInstructions,
          },
          {
            label: "Report issue",
            icon: "warning-outline",
            variant: "secondary-danger",
            onPress: onReportIssue,
          },
        ],
      };

    case "checked_out_by_other": {
      const holderLabel = currentHolderName
        ? `Currently with ${currentHolderName}`
        : "Currently checked out";
      const returnLabel = expectedReturnTime
        ? `Expected return: ${formatReturnTime(expectedReturnTime)}`
        : undefined;
      return {
        banner: returnLabel ? `${holderLabel} · ${returnLabel}` : holderLabel,
        primary: {
          label: "Request access",
          icon: "lock-open-outline",
          variant: "primary-blue",
          onPress: onRequestAccess,
        },
        secondary: [
          {
            label: "Contact current holder",
            icon: "chatbubble-outline",
            variant: "secondary",
            onPress: onContactCurrentHolder,
          },
          {
            label: "Reserve next available",
            icon: "calendar-outline",
            variant: "secondary",
            onPress: onReserve,
          },
          {
            label: "Report issue",
            icon: "warning-outline",
            variant: "secondary-danger",
            onPress: onReportIssue,
          },
        ],
      };
    }

    case "overdue": {
      const overdueLabel = expectedReturnTime
        ? `Overdue since ${formatReturnTime(expectedReturnTime)}`
        : "This keyset is overdue";
      return {
        banner: overdueLabel,
        primary: {
          label: "Return keyset",
          icon: "return-down-back-outline",
          variant: "primary-danger",
          onPress: onReturn,
        },
        secondary: [
          {
            label: "Report delay",
            icon: "alert-circle-outline",
            variant: "secondary-danger",
            onPress: onReportDelay,
          },
          {
            label: "Contact manager",
            icon: "person-outline",
            variant: "secondary",
            onPress: onContactManager,
          },
          {
            label: "Report issue",
            icon: "warning-outline",
            variant: "secondary-danger",
            onPress: onReportIssue,
          },
        ],
      };
    }

    case "missing":
      return {
        banner: "This keyset has been reported missing",
        primary: {
          label: "View issue report",
          icon: "document-text-outline",
          variant: "primary-blue",
          onPress: onViewIssueReport,
        },
        secondary: [
          {
            label: "Mark as found",
            icon: "checkmark-circle-outline",
            variant: "secondary",
            onPress: onMarkAsFound,
          },
          {
            label: "Contact manager",
            icon: "person-outline",
            variant: "secondary",
            onPress: onContactManager,
          },
          {
            label: "Add update",
            icon: "create-outline",
            variant: "secondary",
            onPress: onAddUpdate,
          },
        ],
      };

    case "damaged":
      return {
        banner: "This keyset has been reported damaged",
        primary: {
          label: "View issue report",
          icon: "document-text-outline",
          variant: "primary-blue",
          onPress: onViewIssueReport,
        },
        secondary: [
          {
            label: "Add update",
            icon: "create-outline",
            variant: "secondary",
            onPress: onAddUpdate,
          },
          {
            label: "Contact manager",
            icon: "person-outline",
            variant: "secondary",
            onPress: onContactManager,
          },
          {
            label: "Report issue",
            icon: "warning-outline",
            variant: "secondary-danger",
            onPress: onReportIssue,
          },
        ],
      };

    default:
      // Exhaustive fallback — should never be reached if status is typed correctly
      return {
        primary: {
          label: "View issue report",
          icon: "document-text-outline",
          variant: "primary-blue",
          onPress: onViewIssueReport,
        },
        secondary: [],
      };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Status banner config
// ─────────────────────────────────────────────────────────────────────────────

type BannerConfig = {
  bg: string;
  color: string;
  icon: IoniconName;
};

const BANNER_CONFIG: Record<KeysetStatus, BannerConfig> = {
  available: {
    bg: C.primaryGreenSoft,
    color: C.primaryGreen,
    icon: "checkmark-circle-outline",
  },
  checked_out_by_me: {
    bg: C.primaryGreenSoft,
    color: C.primaryGreen,
    icon: "key-outline",
  },
  checked_out_by_other: {
    bg: C.slateBlueSoft,
    color: C.slateBlue,
    icon: "person-outline",
  },
  overdue: {
    bg: C.dangerSoft,
    color: C.dangerRed,
    icon: "alert-circle-outline",
  },
  missing: {
    bg: C.amberGoldSoft,
    color: "#9A6B00",
    icon: "search-outline",
  },
  damaged: {
    bg: C.amberGoldSoft,
    color: "#9A6B00",
    icon: "construct-outline",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves the filled background colour for a primary button variant. */
function getPrimaryBg(variant: ActionVariant): string {
  switch (variant) {
    case "primary-green":
      return C.primaryGreen;
    case "primary-blue":
      return C.slateBlue;
    case "primary-amber":
      return C.amberGold;
    case "primary-danger":
      return C.dangerRed;
    default:
      return C.primaryGreen;
  }
}

function PrimaryButton({ item }: { item: ActionItem }) {
  const bg = getPrimaryBg(item.variant);
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg },
        pressed && styles.primaryBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.primaryBtnInner}>
        <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        <Text style={styles.primaryBtnLabel}>{item.label}</Text>
      </View>
    </Pressable>
  );
}

function SecondaryButton({ item }: { item: ActionItem }) {
  const isDanger = item.variant === "secondary-danger";
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        isDanger && styles.secondaryBtnDanger,
        pressed && styles.secondaryBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View
        style={[
          styles.secondaryIconWrap,
          { backgroundColor: isDanger ? C.dangerSoft : C.coolGreySoft },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={17}
          color={isDanger ? C.dangerRed : C.charcoal}
        />
      </View>
      <Text
        style={[
          styles.secondaryBtnLabel,
          isDanger && styles.secondaryBtnLabelDanger,
        ]}
      >
        {item.label}
      </Text>
      <Ionicons name="chevron-forward" size={15} color={C.coolGrey} />
    </Pressable>
  );
}

type QuickActionCardProps = {
  icon: IoniconName;
  label: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
};

function QuickActionCard({
  icon,
  label,
  iconBg,
  iconColor,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        pressed && styles.quickCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AgentKeysetActions(props: AgentKeysetActionsProps) {
  const { status, onViewHistory, onAddNote, onReportIssue } = props;
  const { banner, primary, secondary } = getActionsForStatus(status, props);
  const bannerCfg = BANNER_CONFIG[status];

  // Determine whether "Report issue" already appears in the secondary list so
  // we can omit it from the Quick Actions row to avoid duplication.
  const reportIssueInSecondary = secondary.some(
    (a) => a.label === "Report issue",
  );

  return (
    <View style={styles.container}>
      {/* ── Context banner ────────────────────────────────────────────────── */}
      {banner ? (
        <View style={[styles.banner, { backgroundColor: bannerCfg.bg }]}>
          <Ionicons
            name={bannerCfg.icon}
            size={15}
            color={bannerCfg.color}
          />
          <Text style={[styles.bannerText, { color: bannerCfg.color }]}>
            {banner}
          </Text>
        </View>
      ) : null}

      {/* ── Primary action ────────────────────────────────────────────────── */}
      <View style={styles.primarySection}>
        <PrimaryButton item={primary} />
      </View>

      {/* ── Secondary actions ─────────────────────────────────────────────── */}
      {secondary.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>More actions</Text>
          {secondary.map((item, index) => (
            <View key={item.label}>
              <SecondaryButton item={item} />
              {index < secondary.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Quick actions</Text>
        <View style={styles.quickRow}>
          <QuickActionCard
            icon="time-outline"
            label="View history"
            iconBg={C.slateBlueSoft}
            iconColor={C.slateBlue}
            onPress={onViewHistory}
          />
          <QuickActionCard
            icon="create-outline"
            label="Add note"
            iconBg={C.primaryGreenSoft}
            iconColor={C.primaryGreen}
            onPress={onAddNote}
          />
          {!reportIssueInSecondary ? (
            <QuickActionCard
              icon="warning-outline"
              label="Report issue"
              iconBg={C.dangerSoft}
              iconColor={C.dangerRed}
              onPress={onReportIssue}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },

  // ── Banner ─────────────────────────────────────────────────────────────────
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ── Primary button ─────────────────────────────────────────────────────────
  primarySection: {
    gap: theme.spacing.sm,
  },
  primaryBtn: {
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    paddingHorizontal: theme.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnPressed: {
    opacity: 0.82,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  primaryBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Card wrapper ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    paddingTop: theme.spacing.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: C.coolGrey,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },

  // ── Secondary buttons ──────────────────────────────────────────────────────
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  secondaryBtnDanger: {
    // no extra bg — icon badge handles it
  },
  secondaryBtnPressed: {
    backgroundColor: C.coolGreySoft,
  },
  secondaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secondaryBtnLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: C.charcoal,
  },
  secondaryBtnLabelDanger: {
    color: C.dangerRed,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 62, // aligns with text start
  },

  // ── Quick action cards ─────────────────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  quickCard: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: C.softWhite,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  quickCardPressed: {
    backgroundColor: C.coolGreySoft,
    borderColor: C.coolGrey,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.charcoal,
    textAlign: "center",
    lineHeight: 16,
  },
});


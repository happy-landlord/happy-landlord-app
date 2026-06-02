import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  ChevronRight,
  Clock3,
  KeyRound,
  Pencil,
} from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL , CountdownTimer , KeySetDurationModal , ReturnConfirmModal , TransferConfirmModal } from "@/components/key";
import { KeyStatusChip } from "@/components/KeyStatusChip";
import { KeySetEditSheet , PropertyHeader } from "@/components/property";
import { ErrorState , LoadingState } from "@/components/ui";
import { useKeySet , useProperty , useCurrentUserId , useFirstKeySetImageUrl , useInfiniteActivity } from "@/lib/hooks";
import { useKeySetActions , useRole } from "@/hooks";
import type { ActivityTransaction } from "@/types";
import { theme , MOVEMENT_CONFIG, getMovementLabel } from "@/constants";
import { formatActivityTimestamp, formatDueAt } from "@/lib/utils";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function KeySetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();

  const { data: keySet, isPending, isError, refetch } = useKeySet(id);
  const { data: property } = useProperty(keySet?.property_id ?? "");
  const { data: keySetImageUrl } = useFirstKeySetImageUrl(keySet?.images);

  // Last activity preview — admin only, shown when keyset is available
  const { data: lastActivityData } = useInfiniteActivity({
    keySetId: id,
    enabled: isAdmin && keySet?.status === "available",
  });
  const lastActivity = lastActivityData?.pages[0]?.slice(0, 5) ?? [];

  const actions = useKeySetActions({ keySet, currentUserId, isAdmin });

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDays, setCheckoutDays] = useState(1);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(1);
  const [editKeysOpen, setEditKeysOpen] = useState(false);

  // ── Render states ──────────────────────────────────────────────────────────

  if (isPending) return <LoadingState message="Loading keyset…" />;

  if (isError || !keySet) {
    return (
      <ErrorState
        title="Keyset not found"
        message="Could not load this keyset."
        onRetry={refetch}
      />
    );
  }

  // Agents should not interact with missing/damaged keysets they don't hold
  if (
    !isAdmin &&
    actions.isMissingDamaged &&
    keySet.current_holder?.profile_id !== currentUserId
  ) {
    return (
      <ErrorState
        title="Keyset unavailable"
        message="This keyset has been reported as missing or damaged and is not available."
        onRetry={refetch}
      />
    );
  }

  const totalKeys = (keySet.keys ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;

  const {
    overdue,
    isAvailable,
    isHeldByMe,
    isHeldByOther,
    isMissingDamaged,
    showAdminReturn,
    showAgentCheckout,
    showAgentReturn,
    showAgentExtend,
    showAgentReportLost,
    showAgentTransfer,
    showUndoLost,
    hasActions,
    isBusy,
  } = actions;

  return (
    <>
      <Stack.Screen options={{ title: keySet.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Property header */}
        {property && <PropertyHeader property={property} />}

        {/* Overdue banner */}
        {overdue && (
          <View style={styles.overdueBanner}>
            <AlertTriangle size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.overdueBannerText}>This keyset is overdue</Text>
          </View>
        )}

        {/* Keyset identity card */}
        <View
          style={[styles.identityCard, overdue && styles.identityCardOverdue]}
        >
          {/* ── Image banner ── */}
          {keySetImageUrl ? (
            <View style={styles.keySetBanner}>
              <Image
                source={{ uri: keySetImageUrl }}
                style={styles.keySetBannerImage}
                resizeMode="cover"
              />
              <View style={styles.keySetPhotoBadge}>
                <Camera size={12} color="#fff" strokeWidth={2} />
              </View>
            </View>
          ) : null}

          {/* ── Top info row ── */}
          <View style={styles.identityTop}>
            <View
              style={[
                styles.identityIconWrap,
                overdue
                  ? styles.identityIconOverdue
                  : isAvailable
                    ? styles.identityIconAvailable
                    : styles.identityIconOut,
              ]}
            >
              <KeyRound
                size={22}
                color={
                  overdue
                    ? theme.colors.danger
                    : isAvailable
                      ? theme.colors.success
                      : theme.colors.warning
                }
                strokeWidth={1.8}
              />
            </View>

            <View style={styles.identityInfo}>
              <View style={styles.identityStatusRow}>
                {isAdmin && <KeyStatusChip status={keySet.status} />}
                <View style={styles.identityCountPill}>
                  <Text style={styles.identityCountText}>
                    {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                  </Text>
                </View>
              </View>
              <Text style={styles.identityName}>{keySet.name}</Text>
              {isAdmin ? (
                <Text style={styles.identityCode}>{keySet.code}</Text>
              ) : null}
            </View>

            {isAdmin && (
              <Pressable
                onPress={() => setEditKeysOpen(true)}
                style={({ pressed }) => [
                  styles.editBtn,
                  pressed && styles.editBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit keys"
                hitSlop={8}
              >
                <Pencil
                  size={16}
                  color={theme.colors.primary}
                  strokeWidth={1.9}
                />
              </Pressable>
            )}
          </View>

          {/* ── Holder meta row — only shown when keyset is held by someone else ── */}
          {keySet.current_holder && isHeldByOther && (
            <View style={styles.identityMeta}>
              <View style={styles.identityMetaDivider} />
              <View style={styles.identityMetaContent}>
                <View style={styles.identityMetaItem}>
                  <Text style={styles.identityMetaLabel}>With</Text>
                  <Text
                    style={[
                      styles.identityMetaValue,
                      overdue && styles.identityMetaValueDanger,
                    ]}
                    numberOfLines={1}
                  >
                    {isHeldByMe ? "You" : (holderName ?? "Unknown")}
                    {holderType && holderType !== "agent"
                      ? ` · ${holderType}`
                      : ""}
                  </Text>
                </View>

                {keySet.current_holder?.phone && (
                  <View style={styles.identityMetaItem}>
                    <Text style={styles.identityMetaLabel}>Contact</Text>
                    <Text
                      style={[
                        styles.identityMetaValue,
                        overdue && styles.identityMetaValueDanger,
                      ]}
                      numberOfLines={1}
                    >
                      {keySet.current_holder.phone}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Keys in this set */}
        {totalKeys > 0 && (
          <View style={styles.section}>
            <View style={styles.keysList}>
              {(keySet.keys ?? []).map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                const label =
                  k.key_type === "other"
                    ? k.label
                    : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
                return (
                  <View key={k.id} style={styles.keyRow}>
                    <View style={styles.keyIconCircle}>
                      <Icon
                        size={15}
                        color={theme.colors.primary}
                        strokeWidth={1.8}
                      />
                    </View>
                    <View style={styles.keyRowInfo}>
                      <Text style={styles.keyRowLabel}>{label}</Text>
                      {k.code && (
                        <Text style={styles.keyRowCode}>{k.code}</Text>
                      )}
                    </View>
                    {k.quantity > 1 && (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>×{k.quantity}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Last Activity — admin only, when available */}
        {isAdmin && keySet.status === "available" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Last Activity</Text>
              {lastActivity.length > 0 && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/(tabs)/activity",
                      params: {
                        keySetId: keySet.id,
                        keySetName: keySet.name,
                      },
                    } as never)
                  }
                  style={({ pressed }) => [
                    styles.viewAllBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewAllText}>View all</Text>
                  <ChevronRight
                    size={13}
                    color={theme.colors.primary}
                    strokeWidth={2.5}
                  />
                </Pressable>
              )}
            </View>
            <View style={styles.activityCard}>
              {lastActivity.length === 0 ? (
                <Text style={styles.activityEmptyText}>
                  No transactions recorded yet.
                </Text>
              ) : (
                lastActivity.map((item, index) => (
                  <ActivityPreviewRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                    showDivider={index < lastActivity.length - 1}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        {hasActions && (
          <View style={styles.actionsSection}>
            {/* Due date row — hidden when missing/damaged */}
            {isAdmin &&
              keySet.due_back_at &&
              !isMissingDamaged &&
              (isHeldByMe || isHeldByOther || showAdminReturn) && (
                <View
                  style={[
                    styles.dueSummaryRow,
                    overdue && styles.dueSummaryRowOverdue,
                  ]}
                >
                  <CalendarClock
                    size={14}
                    color={overdue ? theme.colors.danger : theme.colors.warning}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.dueSummaryText,
                      overdue && styles.dueSummaryTextOverdue,
                    ]}
                  >
                    {overdue ? "Was due" : "Due"}{" "}
                    <Text style={styles.dueSummaryDate}>
                      {formatDueAt(keySet.due_back_at)}
                    </Text>
                  </Text>
                </View>
              )}

            {/* Admin: Mark returned */}
            {showAdminReturn && (
              <ActionButton
                label="Mark as Returned"
                variant="danger"
                disabled={isBusy}
                onPress={() => setShowReturnModal(true)}
              />
            )}

            {/* Agent: countdown timer replaces the return button */}
            {showAgentReturn && keySet.due_back_at && (
              <CountdownTimer endAt={keySet.due_back_at} />
            )}

            {/* Agent: Checkout */}
            {showAgentCheckout && (
              <ActionButton
                label="Checkout Keyset"
                variant="success"
                disabled={isBusy}
                onPress={() => {
                  setCheckoutDays(1);
                  setShowCheckoutModal(true);
                }}
              />
            )}

            {/* Agent: Extend */}
            {showAgentExtend && (
              <ActionButton
                label="Extend Duration"
                variant="primary"
                disabled={isBusy}
                onPress={() => {
                  setExtendDays(1);
                  setShowExtendModal(true);
                }}
              />
            )}

            {/* Agent: Report lost */}
            {showAgentReportLost && (
              <ActionButton
                label="Report Lost"
                variant="dangerOutline"
                disabled={isBusy}
                onPress={actions.reportLost}
              />
            )}

            {/* Agent: Transfer */}
            {showAgentTransfer && (
              <ActionButton
                label={isBusy ? "Transferring…" : "Transfer to Me"}
                variant="primary"
                disabled={isBusy}
                onPress={() => setShowTransferModal(true)}
              />
            )}

            {/* Undo report lost */}
            {showUndoLost && (
              <ActionButton
                label={
                  actions.isUndoLostPending ? "Undoing…" : "Undo Lost Report"
                }
                variant="successOutline"
                disabled={isBusy}
                onPress={actions.undoLost}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Checkout modal */}
      <KeySetDurationModal
        visible={showCheckoutModal}
        title="Checkout keyset"
        subtitle="Select how long you need the keyset."
        durationDays={checkoutDays}
        baseIso={undefined}
        isPending={actions.isCheckoutPending}
        onDurationChange={setCheckoutDays}
        onCancel={() => setShowCheckoutModal(false)}
        onConfirm={() =>
          actions.checkout(checkoutDays, () => setShowCheckoutModal(false))
        }
        confirmLabel="Confirm Checkout"
      />

      {/* Extend modal */}
      <KeySetDurationModal
        visible={showExtendModal}
        title="Extend checkout"
        subtitle="Add more days from the current due date."
        durationDays={extendDays}
        baseIso={keySet.due_back_at ?? undefined}
        isPending={actions.isExtendPending}
        onDurationChange={setExtendDays}
        onCancel={() => setShowExtendModal(false)}
        onConfirm={() =>
          actions.extend(extendDays, () => setShowExtendModal(false))
        }
        confirmLabel="Extend"
        confirmColor={theme.colors.primary}
      />

      {/* Admin: edit keys in this keyset */}
      {isAdmin && (
        <KeySetEditSheet
          visible={editKeysOpen}
          onClose={() => setEditKeysOpen(false)}
          propertyId={keySet.property_id}
          keySetId={keySet.id}
          keySetName={keySet.name}
          keys={keySet.keys ?? []}
        />
      )}

      {/* Admin: return confirm modal */}
      <ReturnConfirmModal
        visible={showReturnModal}
        propertyCode={property?.property_code ?? null}
        holderName={keySet.current_holder?.full_name ?? null}
        returningKeys={keySet.keys ?? []}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isReturnPending}
        onCancel={() => setShowReturnModal(false)}
        onConfirm={() => actions.adminReturn(() => setShowReturnModal(false))}
      />

      {/* Agent: transfer confirm modal */}
      <TransferConfirmModal
        visible={showTransferModal}
        currentHolderName={keySet.current_holder?.full_name ?? null}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isTransferPending}
        onCancel={() => setShowTransferModal(false)}
        onConfirm={() => actions.transfer(() => setShowTransferModal(false))}
      />
    </>
  );
}

// ── Local sub-components ─────────────────────────────────────────────────────
// Both are tightly coupled to this screen's layout; keeping them local
// avoids fragmenting the file system for ~30-line presentational pieces.

function ActivityPreviewRow({
  item,
  currentUserId,
  showDivider,
}: {
  item: ActivityTransaction;
  currentUserId: string | undefined;
  showDivider: boolean;
}) {
  const { Icon, color, bg } = MOVEMENT_CONFIG[item.transaction_type];
  const label = getMovementLabel(item, currentUserId);

  return (
    <View
      style={[styles.activityRow, showDivider && styles.activityRowDivider]}
    >
      <View style={[styles.activityIcon, { backgroundColor: bg }]}>
        <Icon size={14} color={color} strokeWidth={2} />
      </View>
      <View style={styles.activityRowContent}>
        <Text style={[styles.activityRowLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.activityRowMeta}>
          <Clock3 size={11} color={theme.colors.textLight} strokeWidth={2} />
          <Text style={styles.activityRowTime} numberOfLines={1}>
            {formatActivityTimestamp(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

type ActionVariant =
  | "success"
  | "successOutline"
  | "danger"
  | "dangerOutline"
  | "primary"
  | "secondary";

const ACTION_BG: Record<ActionVariant, string> = {
  success: theme.colors.success,
  successOutline: theme.colors.surface,
  danger: theme.colors.danger,
  dangerOutline: theme.colors.surface,
  primary: theme.colors.primary,
  secondary: theme.colors.surface,
};

const ACTION_TEXT: Record<ActionVariant, string> = {
  success: "#fff",
  successOutline: theme.colors.success,
  danger: "#fff",
  dangerOutline: theme.colors.danger,
  primary: "#fff",
  secondary: theme.colors.textMuted,
};

function ActionButton({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant: ActionVariant;
  disabled: boolean;
  onPress: () => void;
}) {
  const borderStyle =
    variant === "secondary"
      ? { borderWidth: 1, borderColor: theme.colors.border }
      : variant === "successOutline"
        ? { borderWidth: 1.5, borderColor: theme.colors.success }
        : variant === "dangerOutline"
          ? { borderWidth: 1.5, borderColor: theme.colors.danger }
          : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: ACTION_BG[variant] },
        borderStyle,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.55 },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={[styles.actionBtnLabel, { color: ACTION_TEXT[variant] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },

  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overdueBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },

  identityCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  identityCardOverdue: {
    borderColor: theme.colors.danger,
  },

  keySetBanner: {
    width: "100%",
    height: 160,
  },
  keySetBannerImage: {
    width: "100%",
    height: "100%",
  },
  keySetPhotoBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.pill,
    padding: 6,
  },

  identityTop: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  identityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  identityIconAvailable: { backgroundColor: theme.colors.successSoft },
  identityIconOut: { backgroundColor: theme.colors.warningSoft },
  identityIconOverdue: { backgroundColor: theme.colors.dangerSoft },
  identityInfo: { flex: 1, gap: 4 },
  identityStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  identityCountPill: {
    minHeight: 20,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
  },
  identityCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  identityName: { fontSize: 17, fontWeight: "700", color: theme.colors.text },
  identityCode: { fontSize: 13, color: theme.colors.textMuted },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  editBtnPressed: { opacity: 0.6 },

  identityMeta: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  identityMetaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  identityMetaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  identityMetaItem: { flex: 1, gap: 2 },
  identityMetaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  identityMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  identityMetaValueDanger: {
    color: theme.colors.danger,
  },

  section: { gap: theme.spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  activityEmptyText: {
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 11,
  },
  activityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityRowContent: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  activityRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  activityRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityRowTime: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
  },
  keysList: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  keyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  keyRowInfo: { flex: 1, gap: 2 },
  keyRowLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  keyRowCode: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  qtyBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.primarySoft,
  },
  qtyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },

  actionsSection: { gap: theme.spacing.sm },
  dueSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dueSummaryRowOverdue: { backgroundColor: theme.colors.dangerSoft },
  dueSummaryText: { fontSize: 13, color: theme.colors.warning },
  dueSummaryTextOverdue: { color: theme.colors.danger },
  dueSummaryDate: { fontWeight: "700" },
  actionBtn: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  actionBtnLabel: { fontSize: 16, fontWeight: "700" },
});

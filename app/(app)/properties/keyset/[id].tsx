import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
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

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { CountdownTimer } from "@/components/key/CountdownTimer";
import { KeyStatusChip } from "@/components/KeyStatusChip";
import { KeyEditSheet } from "@/components/property/KeyEditSheet";
import { PropertyHeader } from "@/components/property/PropertyHeader";
import { ReturnConfirmModal } from "@/components/key/ReturnConfirmModal";
import { TransferConfirmModal } from "@/components/key/TransferConfirmModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  useKeySet,
  useKeySets,
  useCheckoutKeySet,
  useReturnKeySet,
  useTransferKeySet,
  useExtendKeySet,
  useReportKeySetLost,
  useUndoReportKeySetLost,
} from "@/hooks/useKeySets";
import { useProperty } from "@/hooks/useProperties";
import { useCurrentUserId } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { useFirstKeySetImageUrl } from "@/hooks/useKeySetImages";
import { useInfiniteActivity } from "@/hooks/useTransactions";
import type { ActivityTransaction } from "@/types/database";
import { theme } from "@/constants/theme";
import { formatActivityTimestamp, formatTime, isPastDue } from "@/lib/format";
import { MOVEMENT_CONFIG, getMovementLabel } from "@/constants/movements";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const calcDueBackIso = (days = 1) =>
  new Date(Date.now() + days * DAY_MS).toISOString();
const DURATION_DAYS = [1, 2, 3, 5, 7] as const;

const errMsg = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function KeySetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();

  const { data: keySet, isLoading, isError, refetch } = useKeySet(id);
  const { data: property } = useProperty(keySet?.property_id ?? "");
  const { data: keySetImageUrl } = useFirstKeySetImageUrl(keySet?.images);

  // Last activity preview — admin only, shown when keyset is available
  const { data: lastActivityData } = useInfiniteActivity({
    keySetId: id,
    enabled: isAdmin && keySet?.status === "available",
  });
  const lastActivity = lastActivityData?.pages[0]?.slice(0, 5) ?? [];

  // For agent: check if they already have a checkout in this property
  const { data: propertySets } = useKeySets(keySet?.property_id ?? "");
  const myPropertyCheckout = (propertySets ?? []).find(
    (ks) =>
      ks.id !== id &&
      (ks.status === "checked_out" || ks.status === "overdue") &&
      ks.current_holder?.profile_id === currentUserId,
  );

  const checkout = useCheckoutKeySet(keySet?.property_id ?? "");
  const returnMut = useReturnKeySet(keySet?.property_id ?? "");
  const transferMut = useTransferKeySet(keySet?.property_id ?? "");
  const extendMut = useExtendKeySet(keySet?.property_id ?? "");
  const reportLostMut = useReportKeySetLost(keySet?.property_id ?? "");
  const undoLostMut = useUndoReportKeySetLost(keySet?.property_id ?? "");

  const isBusy =
    checkout.isPending ||
    returnMut.isPending ||
    transferMut.isPending ||
    extendMut.isPending ||
    reportLostMut.isPending ||
    undoLostMut.isPending;

  const [checkoutDays, setCheckoutDays] = useState(1);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(1);
  const [editKeysOpen, setEditKeysOpen] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────

  const isHeldByMe =
    (keySet?.status === "checked_out" || keySet?.status === "overdue") &&
    keySet?.current_holder?.profile_id === currentUserId;

  const isHeldByOther =
    (keySet?.status === "checked_out" || keySet?.status === "overdue") &&
    keySet?.current_holder?.profile_id !== currentUserId;

  const overdue =
    keySet?.status === "overdue" ||
    (keySet?.due_back_at ? isPastDue(keySet.due_back_at) : false);

  const isAvailable = keySet?.status === "available";

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCheckout = useCallback(() => {
    if (!keySet) return;
    checkout.mutate(
      { keySetId: keySet.id, dueBackAt: calcDueBackIso(checkoutDays) },
      {
        onSuccess: () => setShowCheckoutModal(false),
        onError: (err) =>
          Alert.alert("Checkout failed", errMsg(err, "Please try again.")),
      },
    );
  }, [checkout, keySet, checkoutDays]);

  const handleTransfer = useCallback(() => {
    if (!keySet) return;
    transferMut.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => setShowTransferModal(false),
        onError: (err) =>
          Alert.alert("Transfer failed", errMsg(err, "Please try again.")),
      },
    );
  }, [keySet, transferMut]);

  const handleExtend = useCallback(() => {
    if (!keySet) return;
    const newDueBack = new Date(
      (keySet.due_back_at
        ? new Date(keySet.due_back_at).getTime()
        : Date.now()) +
        extendDays * DAY_MS,
    ).toISOString();
    extendMut.mutate(
      { keySetId: keySet.id, dueBackAt: newDueBack },
      {
        onSuccess: () => setShowExtendModal(false),
        onError: (err) =>
          Alert.alert("Extend failed", errMsg(err, "Please try again.")),
      },
    );
  }, [extendMut, keySet, extendDays]);

  const handleAdminReturn = useCallback(() => {
    if (!keySet) return;
    returnMut.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => setShowReturnModal(false),
        onError: (err) =>
          Alert.alert("Failed", errMsg(err, "Please try again.")),
      },
    );
  }, [keySet, returnMut]);

  const handleReportLost = useCallback(() => {
    if (!keySet) return;
    Alert.alert(
      "Report as lost?",
      "This will mark the keyset as missing or damaged. This action cannot be undone easily.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report Lost",
          style: "destructive",
          onPress: () =>
            reportLostMut.mutate(keySet.id, {
              onError: (err) =>
                Alert.alert("Failed", errMsg(err, "Please try again.")),
            }),
        },
      ],
    );
  }, [keySet, reportLostMut]);

  const handleUndoLost = useCallback(() => {
    if (!keySet) return;
    undoLostMut.mutate(keySet.id, {
      onError: (err) => Alert.alert("Failed", errMsg(err, "Please try again.")),
    });
  }, [keySet, undoLostMut]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState message="Loading keyset…" />;

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
    keySet.status === "missing_damaged" &&
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

  // ── Actions to show ────────────────────────────────────────────────────────
  // Admin: Mark returned (if checked_out/overdue), mark overdue (future)
  // Agent: checkout (if available + no checkout in this property), return+extend (if mine), transfer (if other's)

  const showAdminReturn = isAdmin && (isHeldByMe || isHeldByOther);
  const showAgentCheckout =
    !isAdmin && isAvailable && !myPropertyCheckout && !isHeldByMe;
  const showAgentReturn = !isAdmin && isHeldByMe; // shows timer
  const showAgentExtend = !isAdmin && isHeldByMe;
  const showAgentTransfer = !isAdmin && isHeldByOther;

  // "missing_damaged" state — admins can undo any report; agents can undo their own
  const isMissingDamaged = keySet?.status === "missing_damaged";
  const showUndoLost =
    isMissingDamaged &&
    (isAdmin || keySet?.current_holder?.profile_id === currentUserId);

  const hasActions =
    showAdminReturn ||
    showAgentCheckout ||
    showAgentReturn ||
    showAgentExtend ||
    showAgentTransfer ||
    showUndoLost;

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
                      {new Date(keySet.due_back_at).toLocaleDateString(
                        "en-AU",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        },
                      )}{" "}
                      {formatTime(keySet.due_back_at)}
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
            {showAgentExtend && (
              <ActionButton
                label="Report Lost"
                variant="dangerOutline"
                disabled={isBusy}
                onPress={handleReportLost}
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

            {/* Agent: Undo report lost */}
            {showUndoLost && (
              <ActionButton
                label={undoLostMut.isPending ? "Undoing…" : "Undo Lost Report"}
                variant="successOutline"
                disabled={isBusy}
                onPress={handleUndoLost}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Checkout modal */}
      <DurationModal
        visible={showCheckoutModal}
        title="Checkout keyset"
        subtitle="Select how long you need the keyset."
        durationDays={checkoutDays}
        baseIso={undefined}
        isPending={checkout.isPending}
        onDurationChange={setCheckoutDays}
        onCancel={() => setShowCheckoutModal(false)}
        onConfirm={handleCheckout}
        confirmLabel="Confirm Checkout"
      />

      {/* Extend modal */}
      <DurationModal
        visible={showExtendModal}
        title="Extend checkout"
        subtitle="Add more days from the current due date."
        durationDays={extendDays}
        baseIso={keySet.due_back_at ?? undefined}
        isPending={extendMut.isPending}
        onDurationChange={setExtendDays}
        onCancel={() => setShowExtendModal(false)}
        onConfirm={handleExtend}
        confirmLabel="Extend"
        confirmColor={theme.colors.primary}
      />

      {/* Admin: edit keys in this keyset */}
      {isAdmin && (
        <KeyEditSheet
          visible={editKeysOpen}
          onClose={() => setEditKeysOpen(false)}
          propertyId={keySet.property_id}
          keySetId={keySet.id}
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
        isPending={returnMut.isPending}
        onCancel={() => setShowReturnModal(false)}
        onConfirm={handleAdminReturn}
      />

      {/* Agent: transfer confirm modal */}
      <TransferConfirmModal
        visible={showTransferModal}
        currentHolderName={keySet.current_holder?.full_name ?? null}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={transferMut.isPending}
        onCancel={() => setShowTransferModal(false)}
        onConfirm={handleTransfer}
      />
    </>
  );
}

// ── Activity preview row ──────────────────────────────────────────────────────

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

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant:
    | "success"
    | "successOutline"
    | "danger"
    | "dangerOutline"
    | "primary"
    | "secondary";
  disabled: boolean;
  onPress: () => void;
}) {
  const bg =
    variant === "success"
      ? theme.colors.success
      : variant === "danger"
        ? theme.colors.danger
        : variant === "primary"
          ? theme.colors.primary
          : theme.colors.surface;

  const textColor =
    variant === "secondary"
      ? theme.colors.textMuted
      : variant === "successOutline"
        ? theme.colors.success
        : variant === "dangerOutline"
          ? theme.colors.danger
          : "#fff";

  const borderStyle =
    variant === "secondary"
      ? { borderWidth: 1, borderColor: theme.colors.border }
      : variant === "successOutline"
        ? { borderWidth: 1.5, borderColor: theme.colors.success }
        : variant === "dangerOutline"
          ? { borderWidth: 1.5, borderColor: theme.colors.danger }
          : {};

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg },
        borderStyle,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.55 },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={[styles.actionBtnLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

// ── Duration modal (checkout / extend) ───────────────────────────────────────

function DurationModal({
  visible,
  title,
  subtitle,
  durationDays,
  baseIso,
  isPending,
  onDurationChange,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = theme.colors.success,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  durationDays: number;
  baseIso?: string;
  isPending: boolean;
  onDurationChange: (days: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: string;
}) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const base = baseIso ? new Date(baseIso).getTime() : Date.now();
  const newDue = new Date(base + durationDays * DAY_MS).toISOString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isPending ? undefined : onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={isPending ? undefined : onCancel}
        />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          <View style={styles.durationGrid}>
            {DURATION_DAYS.map((days) => {
              const selected = days === durationDays;
              return (
                <Pressable
                  key={days}
                  style={({ pressed }) => [
                    styles.durationChip,
                    selected && styles.durationChipSelected,
                    pressed && { opacity: 0.72 },
                  ]}
                  onPress={() => onDurationChange(days)}
                  disabled={isPending}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selected && styles.durationChipTextSelected,
                    ]}
                  >
                    {days === 1 ? "1 day" : `${days} days`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dueRow}>
            <CalendarClock
              size={14}
              color={theme.colors.primary}
              strokeWidth={2}
            />
            <Text style={styles.dueRowText}>
              {baseIso ? "New due date:" : "Return by"}{" "}
              <Text style={styles.dueRowDate}>
                {new Date(newDue).toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                {formatTime(newDue)}
              </Text>
            </Text>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                styles.modalBtnCancel,
                pressed && { opacity: 0.72 },
              ]}
              onPress={onCancel}
              disabled={isPending}
            >
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                styles.modalBtnConfirm,
                { backgroundColor: confirmColor },
                pressed && { opacity: 0.75 },
                isPending && { opacity: 0.55 },
              ]}
              onPress={onConfirm}
              disabled={isPending}
            >
              <Text style={styles.modalBtnConfirmText}>
                {isPending ? "Processing…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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

  // ── Top info row (mirrors PropertyHeader top) ─────────────────────────────
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
  identityCodeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
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

  // ── Holder meta row (mirrors PropertyHeader metaRow) ──────────────────────
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

  notesBlock: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 6,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },

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

  // ── Duration modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38,38,38,0.46)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationChipSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  durationChipTextSelected: { color: theme.colors.primary, fontWeight: "700" },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dueRowText: { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  dueRowDate: { fontWeight: "700", color: theme.colors.text },
  modalActions: { flexDirection: "row", gap: theme.spacing.sm },
  modalBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalBtnConfirm: { backgroundColor: theme.colors.success },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  modalBtnConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

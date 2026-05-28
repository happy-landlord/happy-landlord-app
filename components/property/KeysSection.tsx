import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyRound, Pencil, UserRound } from "lucide-react-native";
import { useRouter } from "expo-router";

import { CheckoutConfirmModal } from "@/components/key/CheckoutConfirmModal";
import { ReturnConfirmModal } from "@/components/key/ReturnConfirmModal";
import { TransferConfirmModal } from "@/components/key/TransferConfirmModal";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { AgentKeyList } from "@/components/property/AgentKeyList";
import { KeyActionsBar } from "@/components/property/KeyActionsBar";
import { KeyEditSheet } from "@/components/property/KeyEditSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  useCheckoutKeys,
  useReturnKeys,
  useTransferKeys,
} from "@/hooks/useCheckout";
import { useCurrentUserId } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { theme } from "@/constants/theme";
import { formatTime } from "@/lib/format";
import type { KeyWithHolder } from "@/services/keys.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const calcDueBackIso = (days = 1) =>
  new Date(Date.now() + days * DAY_MS).toISOString();

const errMsg = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type KeysSectionProps = {
  propertyId: string;
  propertyCode?: string | null;
  keys: KeyWithHolder[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Pre-select the With-me checkout group that matches this due_back_at ISO string. */
  selectDueAt?: string | null;
  /** The holder profile_id from the tapped dashboard card — used to pick the right section. */
  selectHolderId?: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export const KeysSection = memo(function KeysSection({
  propertyId,
  propertyCode,
  keys,
  isLoading,
  isError,
  onRetry,
  selectDueAt,
  selectHolderId,
}: KeysSectionProps) {
  const router = useRouter();
  // Read current user directly — no prop drilling needed.
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const defaultBorrowedSelectionRef = useRef<string | null>(null);
  const [pendingDueBackAt, setPendingDueBackAt] = useState<string | null>(null);
  const [checkoutDurationDays, setCheckoutDurationDays] = useState(1);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const checkout = useCheckoutKeys(propertyId);
  const returnKey = useReturnKeys(propertyId);
  const transfer = useTransferKeys(propertyId);
  const isBusy =
    checkout.isPending || returnKey.isPending || transfer.isPending;

  const toggleKey = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleKeys = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));

      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }

      return next;
    });
  }, []);

  // ── Derived selection state ───────────────────────────────────────────────

  const selectedKeys = (keys ?? []).filter((k) => selectedIds.has(k.id));
  const anyAvailable = selectedKeys.some((k) => k.status === "available");
  const anyHeldByMe = (keys ?? []).some(
    (k) =>
      (k.status === "borrowed" || k.status === "overdue") &&
      k.current_holder?.profile_id === currentUserId,
  );
  const anyBorrowedByMe = selectedKeys.some(
    (k) =>
      (k.status === "borrowed" || k.status === "overdue") &&
      k.current_holder?.profile_id === currentUserId,
  );
  const anyBorrowedByOther = selectedKeys.some(
    (k) =>
      (k.status === "borrowed" || k.status === "overdue") &&
      k.current_holder?.profile_id !== currentUserId,
  );
  const otherHolderName =
    selectedKeys.find(
      (k) =>
        (k.status === "borrowed" || k.status === "overdue") &&
        k.current_holder?.profile_id !== currentUserId,
    )?.current_holder?.full_name ?? null;

  // Keys the current user has borrowed from this property
  const borrowedByMe = useMemo(
    () =>
      (keys ?? []).filter(
        (k) =>
          (k.status === "borrowed" || k.status === "overdue") &&
          k.current_holder?.profile_id === currentUserId,
      ),
    [keys, currentUserId],
  );

  // Keys borrowed by someone else at this property (visible to all)
  const borrowedByOthers = useMemo(
    () =>
      (keys ?? []).filter(
        (k) =>
          (k.status === "borrowed" || k.status === "overdue") &&
          k.current_holder?.profile_id !== currentUserId,
      ),
    [keys, currentUserId],
  );

  useEffect(() => {
    // Deep-link from dashboard: pre-select a specific checkout group.
    if (selectDueAt && selectHolderId) {
      const isMyCard = selectHolderId === currentUserId;

      if (isMyCard) {
        // Target a "With me" group
        const groups = buildBorrowedActivityGroups(borrowedByMe);
        const target = groups.find((g) => g.due_back_at === selectDueAt);
        if (target) {
          defaultBorrowedSelectionRef.current = target.groupKey;
          setSelectedIds(new Set(target.keyIds));
          return;
        }
      } else {
        // Target a "Currently borrowed" group
        const groups = buildBorrowedActivityGroups(borrowedByOthers);
        const target = groups.find(
          (g) => g.holderId === selectHolderId && g.due_back_at === selectDueAt,
        );
        if (target) {
          defaultBorrowedSelectionRef.current = target.groupKey;
          setSelectedIds(new Set(target.keyIds));
          return;
        }
      }
    }

    // Default: pre-select the first "With me" group when it appears.
    const groups = buildBorrowedActivityGroups(borrowedByMe);
    const firstGroup = groups[0];
    const ids = firstGroup?.keyIds ?? [];
    const groupKey = ids.join("|");

    if (!groupKey) {
      defaultBorrowedSelectionRef.current = null;
      return;
    }

    if (defaultBorrowedSelectionRef.current === groupKey) return;

    setSelectedIds((prev) => {
      if (prev.size > 0) return prev;
      defaultBorrowedSelectionRef.current = groupKey;
      return new Set(ids);
    });
  }, [
    borrowedByMe,
    borrowedByOthers,
    selectDueAt,
    selectHolderId,
    currentUserId,
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openCheckout = useCallback(() => {
    setCheckoutDurationDays(1);
    setPendingDueBackAt(calcDueBackIso(1));
  }, []);

  const changeDuration = useCallback((days: number) => {
    setCheckoutDurationDays(days);
    setPendingDueBackAt(calcDueBackIso(days));
  }, []);

  const confirmCheckout = useCallback(() => {
    const dueBackAt = pendingDueBackAt ?? calcDueBackIso();
    checkout.mutate(
      { keyIds: Array.from(selectedIds), dueBackAt },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setPendingDueBackAt(null);
        },
        onError: (err) =>
          Alert.alert("Checkout failed", errMsg(err, "Please try again.")),
      },
    );
  }, [checkout, pendingDueBackAt, selectedIds]);

  const confirmReturn = useCallback(() => {
    // If the agent hasn't explicitly selected keys, return everything they hold.
    const returnIds = anyBorrowedByMe
      ? Array.from(selectedIds).filter((id) =>
          (keys ?? []).some(
            (k) =>
              k.id === id &&
              (k.status === "borrowed" || k.status === "overdue") &&
              k.current_holder?.profile_id === currentUserId,
          ),
        )
      : borrowedByMe.map((k) => k.id);

    returnKey.mutate(
      { keyIds: returnIds },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setReturnModalOpen(false);
        },
        onError: (err) =>
          Alert.alert("Return failed", errMsg(err, "Please try again.")),
      },
    );
  }, [
    returnKey,
    selectedIds,
    anyBorrowedByMe,
    borrowedByMe,
    keys,
    currentUserId,
  ]);

  const confirmTransfer = useCallback(() => {
    transfer.mutate(
      { keyIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setTransferModalOpen(false);
        },
        onError: (err) =>
          Alert.alert("Transfer failed", errMsg(err, "Please try again.")),
      },
    );
  }, [transfer, selectedIds]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Keys list */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {keys?.length ?? 0} {(keys?.length ?? 0) === 1 ? "Key" : "Keys"}
          </Text>
          {isAdmin && (
            <Pressable
              onPress={() => setEditSheetOpen(true)}
              style={({ pressed }) => [
                styles.sectionEditBtn,
                pressed && styles.sectionEditBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit keys"
              hitSlop={8}
            >
              <Pencil size={14} color={theme.colors.primary} strokeWidth={2} />
            </Pressable>
          )}
        </View>
        {isError ? (
          <ErrorState
            title="Couldn't load keys"
            message="Check your connection and try again."
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <LoadingState message="Loading keys…" />
        ) : !keys?.length ? (
          <EmptyState
            title="No keys"
            message="No keys have been added for this property yet."
          />
        ) : (
          <AgentKeyList
            keys={keys}
            selectedIds={selectedIds}
            isBusy={isBusy}
            onToggle={toggleKey}
          />
        )}
      </View>

      {/* With me — agent borrowed keys */}
      {borrowedByMe.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With me</Text>
          <BorrowedByMeList
            keys={borrowedByMe}
            selectedIds={selectedIds}
            isBusy={isBusy}
            onToggleGroup={toggleKeys}
          />
        </View>
      )}

      {/* Borrowed by others */}
      {borrowedByOthers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With Others</Text>
          <BorrowedByOthersList
            keys={borrowedByOthers}
            selectedIds={selectedIds}
            isBusy={isBusy}
            onToggleGroup={toggleKeys}
          />
        </View>
      )}

      {/* Actions */}
      {!!keys?.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <KeyActionsBar
            isBusy={isBusy}
            anyAvailable={anyAvailable}
            anyHeldByMe={anyHeldByMe}
            anyBorrowedByOther={anyBorrowedByOther}
            onCheckout={openCheckout}
            onReturn={() => setReturnModalOpen(true)}
            onTransfer={() => setTransferModalOpen(true)}
            onViewActivity={() =>
              router.push(
                `/(app)/(tabs)/activity?propertyId=${propertyId}` as never,
              )
            }
          />
        </View>
      )}

      {/* Modals */}
      <CheckoutConfirmModal
        visible={Boolean(pendingDueBackAt)}
        dueBackAt={pendingDueBackAt}
        durationDays={checkoutDurationDays}
        onDurationDaysChange={changeDuration}
        selectedKeys={selectedKeys}
        isPending={checkout.isPending}
        onCancel={() => setPendingDueBackAt(null)}
        onConfirm={confirmCheckout}
      />
      <ReturnConfirmModal
        visible={returnModalOpen}
        propertyCode={propertyCode}
        returningKeys={
          anyBorrowedByMe
            ? (keys ?? []).filter(
                (k) =>
                  selectedIds.has(k.id) &&
                  (k.status === "borrowed" || k.status === "overdue") &&
                  k.current_holder?.profile_id === currentUserId,
              )
            : borrowedByMe
        }
        isPending={returnKey.isPending}
        onCancel={() => setReturnModalOpen(false)}
        onConfirm={confirmReturn}
      />
      <TransferConfirmModal
        visible={transferModalOpen}
        currentHolderName={otherHolderName}
        transferringKeys={(keys ?? []).filter(
          (k) =>
            selectedIds.has(k.id) &&
            (k.status === "borrowed" || k.status === "overdue") &&
            k.current_holder?.profile_id !== currentUserId,
        )}
        isPending={transfer.isPending}
        onCancel={() => setTransferModalOpen(false)}
        onConfirm={confirmTransfer}
      />

      {/* Keys edit sheet — admin only */}
      {isAdmin && (
        <KeyEditSheet
          visible={editSheetOpen}
          onClose={() => setEditSheetOpen(false)}
          propertyId={propertyId}
          propertyCode={propertyCode}
          keys={keys ?? []}
        />
      )}
    </View>
  );
});

// ── Borrowed-by-me list (agent view) ──────────────────────────────────────────

function BorrowedByMeList({
  keys,
  selectedIds,
  isBusy,
  onToggleGroup,
}: {
  keys: KeyWithHolder[];
  selectedIds: Set<string>;
  isBusy: boolean;
  onToggleGroup: (ids: string[]) => void;
}) {
  const groups = buildBorrowedActivityGroups(keys);

  return (
    <View style={styles.list}>
      {groups.map((g) => {
        const isSelected = g.keyIds.some((id) => selectedIds.has(id));
        const isOverdue = g.isOverdue;
        const groupKeys = keys.filter((k) => g.keyIds.includes(k.id));
        const rows: KeyWithHolder[][] = [];
        for (let i = 0; i < groupKeys.length; i += 2) {
          rows.push(groupKeys.slice(i, i + 2));
        }
        return (
          <Pressable
            key={g.groupKey}
            onPress={() => onToggleGroup(g.keyIds)}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.borrowedOtherCard,
              isSelected && styles.borrowedMeCardSelected,
              isSelected && isOverdue && styles.borrowedMeCardSelectedOverdue,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`With me — ${g.keyLabels.join(", ")}`}
          >
            <View style={styles.borrowedActivityContent}>
              <View style={styles.borrowedActivityHeader}>
                <View style={styles.borrowedActivityHolderBlock}>
                  <View
                    style={[
                      styles.borrowedMeActivityAvatar,
                      isOverdue && styles.borrowedMeActivityAvatarOverdue,
                      isSelected && styles.borrowedMeActivityAvatarSelected,
                      isSelected &&
                        isOverdue &&
                        styles.borrowedMeActivityAvatarSelectedOverdue,
                    ]}
                  >
                    <KeyRound
                      size={15}
                      color={
                        isOverdue ? theme.colors.danger : theme.colors.warning
                      }
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.borrowedActivityHolderText}>
                    <Text style={styles.borrowedActivityEyebrow}>
                      Checked out
                    </Text>
                    <Text
                      style={styles.borrowedActivityHolderName}
                      numberOfLines={1}
                    >
                      {g.keyIds.length} {g.keyIds.length === 1 ? "key" : "keys"}
                    </Text>
                  </View>
                </View>

                {g.due_back_at && (
                  <View
                    style={[
                      styles.borrowedMeActivityDuePill,
                      isOverdue && styles.borrowedMeActivityDuePillOverdue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.borrowedMeActivityDuePillText,
                        isOverdue &&
                          styles.borrowedMeActivityDuePillTextOverdue,
                      ]}
                      numberOfLines={1}
                    >
                      {isOverdue ? "Overdue" : "Due"} ·{" "}
                      {new Date(g.due_back_at).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {formatTime(g.due_back_at)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.borrowedActivityKeysGrid}>
                {rows.map((row) => (
                  <View
                    key={row.map((k) => k.id).join("-")}
                    style={styles.borrowedMeKeyGridRow}
                  >
                    {row.map((k) => {
                      const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                      const label =
                        k.key_type === "other"
                          ? k.label
                          : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
                      return (
                        <View
                          key={k.id}
                          style={styles.borrowedMeActivityKeyCell}
                        >
                          <View
                            style={[
                              styles.borrowedMeActivityKeyIconCircle,
                              isSelected &&
                                styles.borrowedMeActivityKeyIconCircleSelected,
                              isSelected &&
                                isOverdue &&
                                styles.borrowedMeActivityKeyIconCircleSelectedOverdue,
                            ]}
                          >
                            <Icon
                              size={13}
                              color={
                                isOverdue
                                  ? theme.colors.danger
                                  : theme.colors.warning
                              }
                              strokeWidth={1.8}
                            />
                          </View>
                          <Text
                            style={styles.borrowedMeKeyLabel}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                    {row.length === 1 && (
                      <View style={styles.borrowedMeActivityKeyCell} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Borrowed by others list ───────────────────────────────────────────────────

type BorrowedActivityGroup = {
  groupKey: string;
  holderId: string;
  holderName: string;
  keyIds: string[];
  keyLabels: string[];
  due_back_at: string | null;
  isOverdue: boolean;
};

function buildBorrowedActivityGroups(
  keys: KeyWithHolder[],
): BorrowedActivityGroup[] {
  const map = new Map<string, BorrowedActivityGroup>();
  for (const k of keys) {
    const holderId =
      k.current_holder_id ?? k.current_holder?.profile_id ?? "unknown";
    const dueKey = k.due_back_at ?? "no-due-date";
    const groupKey = `${holderId}::${dueKey}`;
    const existing = map.get(groupKey);
    const label =
      k.key_type === "other"
        ? k.label
        : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
    if (existing) {
      existing.keyIds.push(k.id);
      existing.keyLabels.push(label);
      if (k.status === "overdue") existing.isOverdue = true;
      // keep earliest due date
      if (
        k.due_back_at &&
        (!existing.due_back_at || k.due_back_at < existing.due_back_at)
      ) {
        existing.due_back_at = k.due_back_at;
      }
    } else {
      map.set(groupKey, {
        groupKey,
        holderId,
        holderName: k.current_holder?.full_name ?? "Unknown",
        keyIds: [k.id],
        keyLabels: [label],
        due_back_at: k.due_back_at ?? null,
        isOverdue: k.status === "overdue",
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.due_back_at && !b.due_back_at) return 0;
    if (!a.due_back_at) return 1;
    if (!b.due_back_at) return -1;
    return a.due_back_at.localeCompare(b.due_back_at);
  });
}

function BorrowedByOthersList({
  keys,
  selectedIds,
  isBusy,
  onToggleGroup,
}: {
  keys: KeyWithHolder[];
  selectedIds: Set<string>;
  isBusy: boolean;
  onToggleGroup: (ids: string[]) => void;
}) {
  const groups = buildBorrowedActivityGroups(keys);

  return (
    <View style={styles.list}>
      {groups.map((g) => {
        const isSelected = g.keyIds.some((id) => selectedIds.has(id));
        const isOverdue = g.isOverdue;
        const groupKeys = keys.filter((k) => g.keyIds.includes(k.id));
        const rows: KeyWithHolder[][] = [];
        for (let i = 0; i < groupKeys.length; i += 2) {
          rows.push(groupKeys.slice(i, i + 2));
        }
        return (
          <Pressable
            key={g.groupKey}
            onPress={() => onToggleGroup(g.keyIds)}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.borrowedOtherCard,
              isOverdue && styles.borrowedOtherCardOverdue,
              isSelected && styles.borrowedOtherCardSelected,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${g.holderName} — ${g.keyLabels.join(", ")}`}
          >
            <View style={styles.borrowedActivityContent}>
              <View style={styles.borrowedActivityHeader}>
                <View style={styles.borrowedActivityHolderBlock}>
                  <View
                    style={[
                      styles.borrowedActivityAvatar,
                      isOverdue && styles.borrowedActivityAvatarOverdue,
                      isSelected && styles.borrowedActivityAvatarSelected,
                      isSelected &&
                        isOverdue &&
                        styles.borrowedActivityAvatarSelectedOverdue,
                    ]}
                  >
                    <UserRound
                      size={15}
                      color={
                        isOverdue ? theme.colors.danger : theme.colors.primary
                      }
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.borrowedActivityHolderText}>
                    <Text style={styles.borrowedActivityEyebrow}>
                      Currently with
                    </Text>
                    <Text
                      style={styles.borrowedActivityHolderName}
                      numberOfLines={1}
                    >
                      {g.holderName}
                    </Text>
                  </View>
                </View>

                {g.due_back_at && (
                  <View
                    style={[
                      styles.borrowedActivityDuePill,
                      isOverdue && styles.borrowedActivityDuePillOverdue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.borrowedActivityDuePillText,
                        isOverdue && styles.borrowedActivityDuePillTextOverdue,
                      ]}
                      numberOfLines={1}
                    >
                      {isOverdue ? "Overdue" : "Due"} ·{" "}
                      {new Date(g.due_back_at).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {formatTime(g.due_back_at)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.borrowedActivityKeysGrid}>
                {rows.map((row) => (
                  <View
                    key={row.map((k) => k.id).join("-")}
                    style={styles.borrowedMeKeyGridRow}
                  >
                    {row.map((k) => {
                      const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                      const label =
                        k.key_type === "other"
                          ? k.label
                          : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
                      return (
                        <View key={k.id} style={styles.borrowedActivityKeyCell}>
                          <View
                            style={[
                              styles.borrowedActivityKeyIconCircle,
                              isSelected &&
                                styles.borrowedActivityKeyIconCircleSelected,
                              isSelected &&
                                isOverdue &&
                                styles.borrowedActivityKeyIconCircleSelectedOverdue,
                            ]}
                          >
                            <Icon
                              size={13}
                              color={
                                isOverdue
                                  ? theme.colors.danger
                                  : theme.colors.primary
                              }
                              strokeWidth={1.8}
                            />
                          </View>
                          <Text
                            style={styles.borrowedMeKeyLabel}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                    {row.length === 1 && (
                      <View style={styles.borrowedActivityKeyCell} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionEditBtn: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionEditBtnPressed: {
    opacity: 0.6,
  },
  list: { gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  chipPressed: { opacity: 0.75 },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  keyInfo: { flex: 1, gap: 3 },
  keyLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  qtyChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.neutralSoft,
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  borrowedGrid: { gap: 6 },
  gridRow: { flexDirection: "row" as const, gap: 10 },
  gridCell: { flex: 1, minWidth: 0 },
  borrowedOtherCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  borrowedMeCardSelected: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  borrowedMeCardSelectedOverdue: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedMeActivityAvatar: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  borrowedMeActivityAvatarOverdue: {
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedMeActivityAvatarSelected: {
    backgroundColor: theme.colors.warning + "24",
  },
  borrowedMeActivityAvatarSelectedOverdue: {
    backgroundColor: theme.colors.danger + "24",
  },
  borrowedMeActivityDuePill: {
    maxWidth: "64%",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: theme.colors.warningSoft,
    flexShrink: 0,
  },
  borrowedMeActivityDuePillOverdue: {
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedMeActivityDuePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.warning,
    textAlign: "right",
  },
  borrowedMeActivityDuePillTextOverdue: {
    color: theme.colors.danger,
  },
  borrowedMeActivityKeyCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  borrowedMeActivityKeyIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  borrowedMeActivityKeyIconCircleSelected: {
    backgroundColor: theme.colors.warning + "24",
  },
  borrowedMeActivityKeyIconCircleSelectedOverdue: {
    backgroundColor: theme.colors.danger + "24",
  },
  borrowedMeContent: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  borrowedMeKeysGrid: {
    gap: 6,
  },
  borrowedMeKeyGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  borrowedMeKeyCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  borrowedMeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  borrowedMeKeyLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  borrowedMeDueFooter: {
    alignItems: "flex-end",
    marginTop: 2,
  },
  borrowedMeDueText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.warning,
    textAlign: "right",
  },
  borrowedMeDueTextOverdue: {
    color: theme.colors.danger,
  },
  borrowedOtherDueText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
    textAlign: "right",
  },
  borrowedOtherDueTextOverdue: {
    color: theme.colors.danger,
  },
  borrowedOtherCardOverdue: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedOtherCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  borrowedActivityContent: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  borrowedActivityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  borrowedActivityHolderBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  borrowedActivityAvatar: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  borrowedActivityAvatarOverdue: {
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedActivityAvatarSelected: {
    backgroundColor: theme.colors.primary + "24",
  },
  borrowedActivityAvatarSelectedOverdue: {
    backgroundColor: theme.colors.danger + "24",
  },
  borrowedActivityHolderText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  borrowedActivityEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  borrowedActivityHolderName: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  borrowedActivityDuePill: {
    maxWidth: "64%",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: theme.colors.primarySoft,
    flexShrink: 0,
  },
  borrowedActivityDuePillOverdue: {
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedActivityDuePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primaryDark,
    textAlign: "right",
  },
  borrowedActivityDuePillTextOverdue: {
    color: theme.colors.danger,
  },
  borrowedActivityKeysGrid: {
    gap: 8,
    paddingTop: 2,
  },
  borrowedActivityKeyCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  borrowedActivityKeyIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  borrowedActivityKeyIconCircleSelected: {
    backgroundColor: theme.colors.primary + "24",
  },
  borrowedActivityKeyIconCircleSelectedOverdue: {
    backgroundColor: theme.colors.danger + "24",
  },
  borrowedOtherIconCircle: {
    backgroundColor: theme.colors.neutralSoft,
  },
  borrowedOtherContent: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  borrowedOtherTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  borrowedOtherHolder: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  borrowedOtherKeys: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  borrowedOtherDue: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dueRowLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },
  dueRowLabelOverdue: {
    color: theme.colors.danger,
  },
  dueDateCol: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  dueDateDay: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
    textAlign: "right",
  },
  dueDateTime: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primaryDark,
    textAlign: "right",
  },
  dueDateOverdue: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.danger,
    textAlign: "right",
  },
  overdueTag: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.danger,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  borrowedChip: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  borrowedChipOverdue: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedChipSelected: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  borrowedIconCircle: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dueText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  dueTextOverdue: {
    color: theme.colors.danger,
  },
});

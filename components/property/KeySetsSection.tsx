import { memo, useState, useCallback, type ReactNode } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import {
  ArrowRightCircle,
  ChevronDown,
  ChevronRight,
  KeyRound,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL , TransferConfirmModal } from "@/components/key";
import { KeyStatusChip } from "@/components/KeyStatusChip";
import { EmptyState , ErrorState , LoadingState } from "@/components/ui";
import { useRole } from "@/hooks";
import {
  useKeySets,
  useTransferKeySet,
  useUnassignedKeys,
} from "@/lib/hooks";
import { theme } from "@/constants";
import { formatDate, formatDateTime , alertError } from "@/lib/utils";
import type {
  KeySetWithDetails,
  UnassignedKey,
} from "@/lib/services";
// -- Helpers -------------------------------------------------------------------
type KeySetCardTone = "available" | "warning" | "danger" | "info";
const getTotalKeyQuantity = (keySet: KeySetWithDetails) =>
  (keySet.keys ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
const getKeySetTone = (keySet: KeySetWithDetails): KeySetCardTone => {
  if (keySet.status === "overdue" || keySet.status === "missing_damaged")
    return "danger";
  if (keySet.status === "available") return "available";
  if (
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord"
  )
    return "info";
  return "warning";
};
// -- Types ---------------------------------------------------------------------
export type KeySetsSectionProps = {
  propertyId: string;
};
// -- Main component ------------------------------------------------------------
export const KeySetsSection = memo(function KeySetsSection({
  propertyId,
}: KeySetsSectionProps) {
  const { isAdmin } = useRole();

  // Owned-by-section queries: TanStack dedupes across the tree, so other
  // consumers (e.g. edit sheets) get the same cached data for free.
  const {
    data: keySets,
    isPending: keySetsPending,
    isError: keySetsError,
    refetch: refetchKeySets,
  } = useKeySets(propertyId);

  const {
    data: unassignedKeys,
    isPending: unassignedPending,
    refetch: refetchUnassigned,
  } = useUnassignedKeys(propertyId);

  if (keySetsError) {
    return (
      <ErrorState
        title="Couldn't load keys"
        message="Check your connection and try again."
        onRetry={() => {
          refetchKeySets();
          refetchUnassigned();
        }}
      />
    );
  }
  if (keySetsPending || (isAdmin && unassignedPending)) {
    return <LoadingState message="Loading keys..." />;
  }
  return isAdmin ? (
    <AdminKeysView
      keySets={keySets ?? []}
      unassignedKeys={unassignedKeys ?? []}
    />
  ) : (
    <AgentKeysView keySets={keySets ?? []} />
  );
});
// -- Admin view ----------------------------------------------------------------
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function AdminKeysView({
  keySets,
  unassignedKeys,
}: {
  keySets: KeySetWithDetails[];
  unassignedKeys: UnassignedKey[];
}) {
  const router = useRouter();
  const [unassignedOpen, setUnassignedOpen] = useState(false);

  const toggleUnassigned = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnassignedOpen((v) => !v);
  };
  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {keySets.length} {keySets.length === 1 ? "Keyset" : "Keysets"}
        </Text>
        {keySets.length === 0 ? (
          <EmptyState
            title="No key sets"
            message="No key sets added for this property yet."
          />
        ) : (
          <View style={styles.list}>
            {keySets.map((ks) => (
              <AdminKeySetCard
                key={ks.id}
                keySet={ks}
                onPress={() =>
                  router.push(`/(app)/properties/keyset/${ks.id}` as never)
                }
              />
            ))}
          </View>
        )}
      </View>
      {unassignedKeys.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.accordionHeader}
            onPress={toggleUnassigned}
            accessibilityRole="button"
            accessibilityLabel="Toggle unassigned keys"
          >
            <Text style={styles.sectionTitle}>
              {unassignedKeys.length} Unassigned{" "}
              {unassignedKeys.length === 1 ? "Key" : "Keys"}
            </Text>
            {unassignedOpen ? (
              <ChevronDown size={16} color={theme.colors.textLight} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2.5} />
            )}
          </Pressable>
          {unassignedOpen && (
            <View style={styles.list}>
              {unassignedKeys.map((k) => (
                <UnassignedKeyChip key={k.id} keyItem={k} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
// -- Agent view ----------------------------------------------------------------
function AgentKeysView({
  keySets,
}: {
  keySets: KeySetWithDetails[];
}) {
  // Agents never need to see missing/damaged keysets � hide them entirely
  const visibleKeySets = keySets.filter(
    (ks) => ks.status !== "missing_damaged",
  );

  if (visibleKeySets.length === 0) {
    return (
      <EmptyState
        title="No key sets"
        message="No key sets available for this property."
      />
    );
  }
  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {visibleKeySets.length}{" "}
          {visibleKeySets.length === 1 ? "Key Set" : "Key Sets"}
        </Text>
        <View style={styles.list}>
          {visibleKeySets.map((ks) => (
            <AgentKeySetCard key={ks.id} keySet={ks} />
          ))}
        </View>
      </View>
    </View>
  );
}
// -- Admin key set card --------------------------------------------------------
function AdminKeySetCard({
  keySet,
  onPress,
}: {
  keySet: KeySetWithDetails;
  onPress: () => void;
}) {
  const hasHolderMeta =
    keySet.status === "checked_out" ||
    keySet.status === "overdue" ||
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord";
  const holderName = keySet.current_holder?.full_name;
  return (
    <KeySetListCard
      keySet={keySet}
      tone={getKeySetTone(keySet)}
      showCode
      meta={
        hasHolderMeta && holderName ? (
          <KeySetHolderMeta
            holderName={holderName}
            dueBackAt={keySet.due_back_at}
            overdue={keySet.status === "overdue"}
          />
        ) : null
      }
      status={<KeyStatusChip status={keySet.status} />}
      onPress={onPress}
    />
  );
}
// -- Agent key set card --------------------------------------------------------
function AgentKeySetCard({ keySet }: { keySet: KeySetWithDetails }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const transferMut = useTransferKeySet(keySet.property_id);

  const handleTransfer = useCallback(() => {
    transferMut.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => setShowTransferModal(false),
        onError: (err) => alertError("Transfer failed", err),
      },
    );
  }, [transferMut, keySet.id]);

  const overdue = keySet.status === "overdue";
  const isAvailable = keySet.status === "available";
  const isCheckedOut = keySet.status === "checked_out" || overdue;
  const isHandover =
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord";

  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const totalKeys = getTotalKeyQuantity(keySet);
  const keyCountLabel = `${totalKeys} ${totalKeys === 1 ? "key" : "keys"}`;
  const keys = keySet.keys ?? [];

  const iconBg = overdue
    ? theme.colors.dangerSoft
    : isAvailable
      ? theme.colors.successSoft
      : theme.colors.warningSoft;

  const iconColor = overdue
    ? theme.colors.danger
    : isAvailable
      ? theme.colors.success
      : theme.colors.warning;

  const cardBorderColor = overdue ? theme.colors.danger : theme.colors.border;

  return (
    <>
      <View style={[agentCardStyles.card, { borderColor: cardBorderColor }]}>
        {/* Top row: icon + title/count */}
        <View style={agentCardStyles.top}>
          <View style={[agentCardStyles.iconWrap, { backgroundColor: iconBg }]}>
            <KeyRound size={22} color={iconColor} strokeWidth={1.8} />
          </View>
          <View style={agentCardStyles.info}>
            <View style={agentCardStyles.titleRow}>
              <Text style={agentCardStyles.name} numberOfLines={2}>
                {keySet.name}
              </Text>
              <View style={agentCardStyles.countPill}>
                <Text style={agentCardStyles.countText}>{keyCountLabel}</Text>
              </View>
            </View>

            {keys.length > 0 && (
              <View style={agentCardStyles.keyPillsWrap}>
                {keys.map((k) => {
                  const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                  const label =
                    k.key_type === "other"
                      ? k.label
                      : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
                  return (
                    <View key={k.id} style={agentCardStyles.keyPill}>
                      <Icon
                        size={12}
                        color={theme.colors.primary}
                        strokeWidth={1.8}
                      />
                      <Text
                        style={agentCardStyles.keyPillText}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      {k.quantity > 1 && (
                        <View style={agentCardStyles.keyPillQty}>
                          <Text style={agentCardStyles.keyPillQtyText}>
                            �{k.quantity}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Holder meta � shown when checked out / overdue / handover */}
        {(isCheckedOut || isHandover) && holderName && (
          <View style={agentCardStyles.meta}>
            <View style={agentCardStyles.metaDivider} />
            <View style={agentCardStyles.metaContent}>
              <View style={agentCardStyles.metaItem}>
                <Text style={agentCardStyles.metaLabel}>With</Text>
                <Text
                  style={[
                    agentCardStyles.metaValue,
                    overdue && agentCardStyles.metaValueDanger,
                  ]}
                  numberOfLines={1}
                >
                  {holderName}
                  {holderType && holderType !== "agent"
                    ? ` � ${holderType}`
                    : ""}
                </Text>
              </View>
              <View style={agentCardStyles.metaItem}>
                <Text style={agentCardStyles.metaLabel}>Contact</Text>
                <Text
                  style={[
                    agentCardStyles.metaValue,
                    overdue && agentCardStyles.metaValueDanger,
                  ]}
                  numberOfLines={1}
                >
                  {holderPhone ?? "No contact"}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={agentCardStyles.actionWrap}>
          {keySet.due_back_at && (
            <Text
              style={[
                agentCardStyles.dueDateText,
                overdue && agentCardStyles.dueDateTextOverdue,
              ]}
              numberOfLines={1}
            >
              {overdue ? "Was due" : "Due"} {formatDate(keySet.due_back_at)}
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [
              agentCardStyles.transferButton,
              transferMut.isPending && agentCardStyles.transferButtonDisabled,
              pressed &&
                !transferMut.isPending &&
                agentCardStyles.transferButtonPressed,
            ]}
            onPress={() => setShowTransferModal(true)}
            disabled={transferMut.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Transfer ${keySet.name} to me`}
          >
            <ArrowRightCircle size={16} color="#fff" strokeWidth={2} />
            <Text style={agentCardStyles.transferButtonText}>
              {transferMut.isPending ? "Transferring�" : "Transfer to Me"}
            </Text>
          </Pressable>
        </View>
      </View>

      <TransferConfirmModal
        visible={showTransferModal}
        currentHolderName={holderName ?? null}
        transferringKeys={keys}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={transferMut.isPending}
        onCancel={() => setShowTransferModal(false)}
        onConfirm={handleTransfer}
      />
    </>
  );
}
// -- Shared key set list card --------------------------------------------------
function KeySetListCard({
  keySet,
  tone,
  showCode = false,
  meta,
  status,
  right,
  onPress,
}: {
  keySet: KeySetWithDetails;
  tone: KeySetCardTone;
  showCode?: boolean;
  meta?: ReactNode;
  status?: ReactNode;
  right?: ReactNode;
  onPress: () => void;
}) {
  const totalKeys = getTotalKeyQuantity(keySet);
  const keyCountLabel = `${totalKeys} ${totalKeys === 1 ? "key" : "keys"}`;
  const hasMeta = !!meta || !!right;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={keySet.name}
    >
      <View style={[styles.cardAccent, getToneAccentStyle(tone)]} />
      {/* Top row: fixed-size icon + title block + chevron */}
      <View style={styles.cardTopRow}>
        <View style={[styles.cardIconWrap, getToneIconWrapStyle(tone)]}>
          <KeyRound size={18} color={toneColor[tone]} strokeWidth={1.8} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardStatusRow}>
            {status}
            <KeyCountPill label={keyCountLabel} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardName} numberOfLines={2}>
              {keySet.name}
            </Text>
            {showCode && (
              <Text style={styles.cardCode} numberOfLines={1}>
                {keySet.code}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardChevronWrap}>
          <ChevronRight
            size={18}
            color={theme.colors.textLight}
            strokeWidth={2}
          />
        </View>
      </View>
      {/* Meta row: holder info below the icon+title row */}
      {hasMeta && (
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaDivider} />
          <View style={styles.cardMetaContent}>
            {meta}
            {right ? (
              <View style={styles.cardRight}>{right}</View>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}
function KeyCountPill({ label }: { label: string }) {
  return (
    <View style={styles.rightCountPill}>
      <Text style={styles.rightCountText}>{label}</Text>
    </View>
  );
}
function KeySetHolderMeta({
  holderName,
  dueBackAt,
  overdue,
}: {
  holderName: string;
  dueBackAt?: string | null;
  overdue: boolean;
  color?: string;
}) {
  return (
    <>
      <View style={styles.metaItem}>
        <Text style={styles.metaLabel}>With</Text>
        <Text
          style={[styles.metaValue, overdue && styles.metaValueDanger]}
          numberOfLines={1}
        >
          {holderName}
        </Text>
      </View>
      {dueBackAt && (
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Due Date</Text>
          <Text
            style={[styles.metaValue, overdue && styles.metaValueDanger]}
            numberOfLines={1}
          >
            {overdue
              ? `Overdue � ${formatDateTime(dueBackAt)}`
              : formatDateTime(dueBackAt)}
          </Text>
        </View>
      )}
    </>
  );
}
const getToneIconWrapStyle = (tone: KeySetCardTone) => {
  switch (tone) {
    case "available":
      return styles.cardIconWrapAvailable;
    case "warning":
      return styles.cardIconWrapWarning;
    case "danger":
      return styles.cardIconWrapOverdue;
    case "info":
      return styles.cardIconWrapInfo;
  }
};
const getToneAccentStyle = (tone: KeySetCardTone) => {
  switch (tone) {
    case "available":
      return styles.cardAccentAvailable;
    case "warning":
      return styles.cardAccentWarning;
    case "danger":
      return styles.cardAccentDanger;
    case "info":
      return styles.cardAccentInfo;
  }
};
const toneColor: Record<KeySetCardTone, string> = {
  available: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  info: theme.colors.info,
};
// -- Unassigned key chip -------------------------------------------------------
function UnassignedKeyChip({ keyItem }: { keyItem: UnassignedKey }) {
  const Icon = KEY_TYPE_ICON[keyItem.key_type] ?? KeyRound;
  const label =
    keyItem.key_type === "other"
      ? keyItem.label
      : (KEY_TYPE_LABEL[keyItem.key_type] ?? keyItem.key_type);
  return (
    <View style={styles.unassignedChip}>
      <View style={styles.unassignedIconCircle}>
        <Icon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />
      </View>
      <Text style={styles.unassignedLabel} numberOfLines={1}>
        {label}
      </Text>
      {keyItem.quantity > 1 && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>x{keyItem.quantity}</Text>
        </View>
      )}
    </View>
  );
}
// -- Styles --------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  list: { gap: 8 },
  card: {
    flexDirection: "column",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    overflow: "hidden",
    position: "relative",
  },
  cardPressed: { opacity: 0.72 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardAccentAvailable: { backgroundColor: theme.colors.success },
  cardAccentWarning: { backgroundColor: theme.colors.warning },
  cardAccentDanger: { backgroundColor: theme.colors.danger },
  cardAccentInfo: { backgroundColor: theme.colors.info },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: theme.colors.neutralSoft,
    marginLeft: 2,
  },
  cardIconWrapAvailable: { backgroundColor: theme.colors.successSoft },
  cardIconWrapWarning: { backgroundColor: theme.colors.warningSoft },
  cardIconWrapOverdue: { backgroundColor: theme.colors.dangerSoft },
  cardIconWrapInfo: { backgroundColor: theme.colors.infoSoft },
  cardInfo: { flex: 1, minWidth: 0, gap: 4 },
  cardStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  cardTitleBlock: { flex: 1, minWidth: 0, gap: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardCode: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  cardRight: { alignItems: "flex-end", justifyContent: "center" },
  cardMetaRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cardMetaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardMetaContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  cardFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  cardChevronWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rightCountPill: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  rightCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  cardDetailsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 4,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metaValueDanger: {
    color: theme.colors.danger,
  },
  unassignedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  unassignedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unassignedLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  qtyBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.neutralSoft,
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
});

// -- Agent card styles ---------------------------------------------------------
const agentCardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.72 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1, gap: 10, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  countPill: {
    minHeight: 20,
    flexShrink: 0,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  keyPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  keyPill: {
    maxWidth: "100%",
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.primarySoft,
  },
  keyPillText: {
    maxWidth: 130,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },
  keyPillQty: {
    minWidth: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: theme.colors.surface,
  },
  keyPillQtyText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },
  meta: {
    paddingHorizontal: theme.spacing.md,
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  metaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metaValueDanger: {
    color: theme.colors.danger,
  },
  actionWrap: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  dueDateText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.warning,
  },
  dueDateTextOverdue: {
    color: theme.colors.danger,
  },
  transferButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  transferButtonPressed: { opacity: 0.75 },
  transferButtonDisabled: { opacity: 0.55 },
  transferButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

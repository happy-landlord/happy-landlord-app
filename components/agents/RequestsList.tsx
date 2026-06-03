import { memo, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle, Clock, Phone, UserX, XCircle } from "lucide-react-native";

import { theme } from "@/constants";
import { useRegistrationRequests, useReviewRequest } from "@/lib/hooks";
import { useRefreshControl } from "@/hooks";
import type { RegistrationRequest } from "@/lib/services";

import { sharedStyles } from "./styles";

type ProcessingState = "approve" | "reject" | null;

/** Requests list — pending first, then reviewed. */
export function RequestsList() {
  const {
    data: requests,
    isLoading,
    error,
    refetch,
  } = useRegistrationRequests();
  const { approve, reject } = useReviewRequest();
  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const { sorted, pendingCount } = useMemo(() => {
    const rows = requests ?? [];
    const pending: RegistrationRequest[] = [];
    const reviewed: RegistrationRequest[] = [];
    for (const r of rows) {
      (r.status === "pending" ? pending : reviewed).push(r);
    }
    return { sorted: [...pending, ...reviewed], pendingCount: pending.length };
  }, [requests]);

  // Derive a single "which row is currently being processed" descriptor so
  // each card only needs one boolean-ish prop (instead of 4).
  const activeId = approve.isPending
    ? approve.variables?.requestId
    : reject.isPending
      ? reject.variables?.requestId
      : null;
  const activeKind: ProcessingState = approve.isPending
    ? "approve"
    : reject.isPending
      ? "reject"
      : null;

  if (isLoading) {
    return (
      <View style={sharedStyles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={sharedStyles.centered}>
        <Text style={sharedStyles.errorText}>Failed to load requests.</Text>
        <Pressable onPress={() => refetch()} style={sharedStyles.retryBtn}>
          <Text style={sharedStyles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={sharedStyles.centered}>
        <View style={sharedStyles.emptyIcon}>
          <Clock size={32} color={theme.colors.textLight} strokeWidth={1.5} />
        </View>
        <Text style={sharedStyles.emptyTitle}>No requests yet</Text>
        <Text style={sharedStyles.emptyMessage}>
          Agent registration requests will appear here for your review.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={keyExtractor}
      contentContainerStyle={sharedStyles.list}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        pendingCount > 0 ? (
          <View style={styles.sectionHeader}>
            <View style={styles.pendingDot} />
            <Text style={styles.sectionTitle}>
              {pendingCount} pending{" "}
              {pendingCount === 1 ? "request" : "requests"}
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          processing={activeId === item.id ? activeKind : null}
          onApprove={() =>
            approve.mutate({ requestId: item.id, role: "agent" })
          }
          onReject={() => reject.mutate({ requestId: item.id })}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const keyExtractor = (item: RegistrationRequest) => item.id;
const Separator = () => <View style={sharedStyles.separator} />;

const STATUS_CONFIG: Record<
  RegistrationRequest["status"],
  { color: string; bg: string; label: string }
> = {
  pending: {
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
    label: "Pending",
  },
  approved: {
    color: theme.colors.success,
    bg: theme.colors.successSoft,
    label: "Approved",
  },
  rejected: {
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
    label: "Rejected",
  },
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", DATE_OPTS);

// ── Card ──────────────────────────────────────────────────────────────────────

type RequestCardProps = {
  request: RegistrationRequest;
  processing: ProcessingState;
  onApprove: () => void;
  onReject: () => void;
};

const RequestCard = memo(function RequestCard({
  request,
  processing,
  onApprove,
  onReject,
}: RequestCardProps) {
  const isPending = request.status === "pending";
  const statusConfig = STATUS_CONFIG[request.status];
  const initial = (request.full_name || request.email || "?")[0].toUpperCase();
  const isBusy = processing !== null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.cardName} numberOfLines={1}>
            {request.full_name ?? "Unknown name"}
          </Text>
          <Text style={styles.cardEmail} numberOfLines={1}>
            {request.email ?? "—"}
          </Text>
          {request.phone ? (
            <View style={styles.phoneRow}>
              <Phone size={11} color={theme.colors.textLight} strokeWidth={2} />
              <Text style={styles.cardPhone}>{request.phone}</Text>
            </View>
          ) : null}
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
        >
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{request.requested_role}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
      </View>

      {request.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{request.admin_note}</Text>
        </View>
      ) : null}

      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.approveBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onApprove}
            disabled={isBusy}
          >
            {processing === "approve" ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <CheckCircle
                  size={16}
                  color={theme.colors.surface}
                  strokeWidth={2}
                />
                <Text style={styles.approveBtnLabel}>Approve</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.rejectBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onReject}
            disabled={isBusy}
          >
            {processing === "reject" ? (
              <ActivityIndicator size="small" color={theme.colors.danger} />
            ) : (
              <>
                <XCircle
                  size={16}
                  color={theme.colors.danger}
                  strokeWidth={2}
                />
                <Text style={styles.rejectBtnLabel}>Reject</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {!isPending && request.reviewed_at && (
        <View style={styles.reviewedRow}>
          {request.status === "approved" ? (
            <CheckCircle
              size={14}
              color={theme.colors.success}
              strokeWidth={2}
            />
          ) : (
            <UserX size={14} color={theme.colors.danger} strokeWidth={2} />
          )}
          <Text style={styles.reviewedText}>
            {request.status === "approved" ? "Approved" : "Rejected"} on{" "}
            {formatDate(request.reviewed_at)}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.warning,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  cardEmail: { fontSize: 13, color: theme.colors.textMuted },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  cardPhone: { fontSize: 12, color: theme.colors.textLight },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginLeft: 44 + theme.spacing.md,
  },
  rolePill: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.infoSoft,
    borderRadius: theme.radius.pill,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.info,
    textTransform: "capitalize",
  },
  dateText: { fontSize: 12, color: theme.colors.textLight },
  noteBox: {
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: 2,
  },
  noteText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.pill,
    minHeight: 40,
  },
  btnPressed: { opacity: 0.75 },
  approveBtn: { backgroundColor: theme.colors.success },
  approveBtnLabel: {
    color: theme.colors.surface,
    fontWeight: "600",
    fontSize: 14,
  },
  rejectBtn: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  rejectBtnLabel: {
    color: theme.colors.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  reviewedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  reviewedText: { fontSize: 12, color: theme.colors.textLight },
});


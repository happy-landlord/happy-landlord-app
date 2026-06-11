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
import { formatDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
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
    return <LoadingState message="Loading requests…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load requests"
        message="Check your connection and try again."
        onRetry={refetch}
      />
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        Icon={Clock}
        title="No requests yet"
        message="Agent registration requests will appear here for your review."
      />
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
  const initial = (request.full_name || request.email || "?")[0].toUpperCase();
  const isBusy = processing !== null;
  const reviewerName = request.reviewer?.full_name ?? "Admin";
  const reviewedDate = request.reviewed_at
    ? formatDate(request.reviewed_at)
    : null;

  return (
    <View style={styles.card}>
      {/* ── Header: avatar + name + date ── */}
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

        <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
      </View>

      {/* ── Status row ── */}
      <View style={styles.statusRow}>
        {isPending ? (
          <>
            <View style={styles.pendingDot} />
            <Text style={styles.statusPending}>Awaiting review</Text>
          </>
        ) : request.status === "approved" ? (
          <>
            <CheckCircle
              size={14}
              color={theme.colors.success}
              strokeWidth={2.2}
            />
            <Text style={styles.statusApproved}>
              Approved by {reviewerName}
              {reviewedDate ? ` · ${reviewedDate}` : ""}
            </Text>
          </>
        ) : (
          <>
            <UserX size={14} color={theme.colors.danger} strokeWidth={2.2} />
            <Text style={styles.statusRejected}>
              Rejected by {reviewerName}
              {reviewedDate ? ` · ${reviewedDate}` : ""}
            </Text>
          </>
        )}
      </View>

      {/* ── User message (pending) ── */}
      {request.user_message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.messageText}>{request.user_message}</Text>
        </View>
      ) : null}

      {/* ── Admin note (reviewed) ── */}
      {request.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Admin note</Text>
          <Text style={styles.noteText}>{request.admin_note}</Text>
        </View>
      ) : null}

      {/* ── Actions (pending only) ── */}
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
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverse}
              />
            ) : (
              <>
                <CheckCircle
                  size={15}
                  color={theme.colors.textInverse}
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
                  size={15}
                  color={theme.colors.danger}
                  strokeWidth={2}
                />
                <Text style={styles.rejectBtnLabel}>Reject</Text>
              </>
            )}
          </Pressable>
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

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  cardMeta: { flex: 1, gap: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  cardEmail: { fontSize: 13, color: theme.colors.textMuted },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardPhone: { fontSize: 12, color: theme.colors.textLight },
  dateText: {
    fontSize: 11,
    color: theme.colors.textLight,
    flexShrink: 0,
    paddingTop: 2,
  },

  // Status row
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  statusPending: {
    fontSize: 13,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  statusApproved: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "500",
    flexShrink: 1,
  },
  statusRejected: {
    fontSize: 13,
    color: theme.colors.danger,
    fontWeight: "600",
    flexShrink: 1,
  },

  // Message / note boxes
  messageBox: {
    backgroundColor: theme.colors.infoSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    gap: 2,
  },
  messageLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.info,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  noteBox: {
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    gap: 2,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  // Actions
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
    color: theme.colors.textInverse,
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
});

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle, Clock, Phone, UserX, XCircle } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { useRegistrationRequests, useReviewRequest } from "@/hooks/useAgentRequests";
import type { RegistrationRequest } from "@/services/requests.service";

export default function RequestsScreen() {
  const { data: requests, isLoading, error, refetch } = useRegistrationRequests();
  const { approve, reject } = useReviewRequest();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load requests.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}>
          <Clock size={32} color={theme.colors.textLight} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No requests yet</Text>
        <Text style={styles.emptyMessage}>
          Agent registration requests will appear here for your review.
        </Text>
      </View>
    );
  }

  const pending  = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <FlatList
      data={[...pending, ...reviewed]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        pending.length > 0 ? (
          <View style={styles.sectionHeader}>
            <View style={styles.pendingDot} />
            <Text style={styles.sectionTitle}>
              {pending.length} pending {pending.length === 1 ? "request" : "requests"}
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          onApprove={(role) => approve.mutate({ requestId: item.id, role })}
          onReject={() => reject.mutate({ requestId: item.id })}
          isApprovingThis={
            approve.isPending &&
            (approve.variables as { requestId: string } | undefined)?.requestId === item.id
          }
          isRejectingThis={
            reject.isPending &&
            (reject.variables as { requestId: string } | undefined)?.requestId === item.id
          }
        />
      )}
    />
  );
}

type RequestCardProps = {
  request: RegistrationRequest;
  onApprove: (role: "agent" | "admin") => void;
  onReject: () => void;
  isApprovingThis: boolean;
  isRejectingThis: boolean;
};

function RequestCard({
  request,
  onApprove,
  onReject,
  isApprovingThis,
  isRejectingThis,
}: RequestCardProps) {
  const isPending = request.status === "pending";

  const statusConfig = {
    pending:  { color: theme.colors.warning, bg: theme.colors.warningSoft,  label: "Pending" },
    approved: { color: theme.colors.success, bg: theme.colors.successSoft,  label: "Approved" },
    rejected: { color: theme.colors.danger,  bg: theme.colors.dangerSoft,   label: "Rejected" },
  }[request.status];

  const initial = (request.full_name ?? request.email ?? "?")[0].toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header */}
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

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Role requested + date */}
      <View style={styles.metaRow}>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{request.requested_role}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(request.created_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>

      {/* Admin note (if any) */}
      {request.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{request.admin_note}</Text>
        </View>
      ) : null}

      {/* Action buttons — pending only */}
      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.approveBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => onApprove("agent")}
            disabled={isApprovingThis || isRejectingThis}
          >
            {isApprovingThis ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <CheckCircle size={16} color={theme.colors.surface} strokeWidth={2} />
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
            disabled={isApprovingThis || isRejectingThis}
          >
            {isRejectingThis ? (
              <ActivityIndicator size="small" color={theme.colors.danger} />
            ) : (
              <>
                <XCircle size={16} color={theme.colors.danger} strokeWidth={2} />
                <Text style={styles.rejectBtnLabel}>Reject</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Reviewed note */}
      {!isPending && request.reviewed_at && (
        <View style={styles.reviewedRow}>
          {request.status === "approved" ? (
            <CheckCircle size={14} color={theme.colors.success} strokeWidth={2} />
          ) : (
            <UserX size={14} color={theme.colors.danger} strokeWidth={2} />
          )}
          <Text style={styles.reviewedText}>
            {request.status === "approved" ? "Approved" : "Rejected"} on{" "}
            {new Date(request.reviewed_at).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.screen,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
  },
  retryLabel: { color: theme.colors.primary, fontWeight: "600" },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  list: { padding: theme.spacing.screen, backgroundColor: theme.colors.background },
  separator: { height: theme.spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: theme.colors.primary },
  cardMeta: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  cardEmail: { fontSize: 13, color: theme.colors.textMuted },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
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
  roleText: { fontSize: 11, fontWeight: "600", color: theme.colors.info, textTransform: "capitalize" },
  dateText: { fontSize: 12, color: theme.colors.textLight },
  noteBox: {
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: 2,
  },
  noteText: { fontSize: 13, color: theme.colors.textMuted, fontStyle: "italic" },
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
  approveBtnLabel: { color: theme.colors.surface, fontWeight: "600", fontSize: 14 },
  rejectBtn: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  rejectBtnLabel: { color: theme.colors.danger, fontWeight: "600", fontSize: 14 },
  reviewedRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginTop: 2 },
  reviewedText: { fontSize: 12, color: theme.colors.textLight },
});

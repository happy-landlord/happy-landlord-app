import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import {
  AlertCircle,
  BellOff,
  BellRing,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  Trash2,
} from "lucide-react-native";
import { theme, FEATURES } from "@/constants";
import {
  useMarkAllNotificationsRead,
  usePushStatus,
  useTogglePush,
  useUnreadNotificationCount,
  useBiometricSettings,
  useToggleBiometric,
} from "@/lib/hooks";
import { getBiometricLabel } from "@/lib/services";
import { DeleteAccountSheet } from "@/components/settings";
// -- helpers ------------------------------------------------------------------
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}
function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}
function RowDivider() {
  return <View style={styles.rowDivider} />;
}
type RowProps = {
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};
function SettingRow({
  Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  disabled,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.rowPressed,
      ]}
      accessibilityRole={onPress ? "button" : "none"}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? null}
    </Pressable>
  );
}
// -- main screen ---------------------------------------------------------------
export default function SettingsScreen() {
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: pushStatus, isLoading: pushLoading } = usePushStatus();
  const togglePush = useTogglePush();
  const markAllRead = useMarkAllNotificationsRead();
  const { data: biometric } = useBiometricSettings();
  const toggleBiometric = useToggleBiometric();
  const biometricCapability = biometric?.capability ?? null;
  const biometricEnabled = biometric?.enabled ?? false;
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const permissionDenied = pushStatus?.permissionStatus === "denied";
  const pushEnabled = pushStatus?.pushEnabled ?? false;
  const biometricLabel = biometricCapability
    ? getBiometricLabel(biometricCapability.type)
    : "Biometrics";
  function handlePushToggle(value: boolean) {
    if (value && permissionDenied) {
      Linking.openSettings();
      return;
    }
    togglePush.mutate(value);
  }
  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    Alert.alert(
      "Mark all as read",
      `Mark all ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""} as read?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark all read", onPress: () => markAllRead.mutate() },
      ],
    );
  }
  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>
        {FEATURES.BIOMETRIC_LOCK && (
          <>
            <SectionHeader title="Security" />
            <SectionCard>
              <SettingRow
                Icon={Fingerprint}
                iconBg={theme.colors.accentSoft}
                iconColor={theme.colors.accent}
                title={`${biometricLabel} login`}
                subtitle={
                  biometricCapability?.isAvailable
                    ? `Unlock the app with ${biometricLabel}`
                    : "Not available on this device"
                }
                disabled={
                  !biometricCapability?.isAvailable || toggleBiometric.isPending
                }
                right={
                  toggleBiometric.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accent}
                      style={styles.rowSpinner}
                    />
                  ) : (
                    <Switch
                      value={biometricEnabled}
                      onValueChange={(v) => toggleBiometric.mutate(v)}
                      disabled={
                        !biometricCapability?.isAvailable ||
                        toggleBiometric.isPending
                      }
                      trackColor={{
                        false: theme.colors.neutralSoft,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.surface}
                      ios_backgroundColor={theme.colors.neutralSoft}
                    />
                  )
                }
              />
            </SectionCard>
          </>
        )}
        <SectionHeader title="Notifications" />
        <SectionCard>
          {FEATURES.PUSH_NOTIFICATIONS && (
            <>
              <SettingRow
                Icon={pushEnabled ? BellRing : BellOff}
                iconBg={theme.colors.accentSoft}
                iconColor={theme.colors.accent}
                title="Push notifications"
                subtitle="Alerts for keyset due dates, recalls and reservations"
                disabled={pushLoading || togglePush.isPending}
                right={
                  pushLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accent}
                      style={styles.rowSpinner}
                    />
                  ) : (
                    <Switch
                      value={pushEnabled}
                      onValueChange={handlePushToggle}
                      disabled={togglePush.isPending}
                      trackColor={{
                        false: theme.colors.neutralSoft,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.surface}
                      ios_backgroundColor={theme.colors.neutralSoft}
                    />
                  )
                }
              />
              {permissionDenied ? (
                <Pressable
                  onPress={() => Linking.openSettings()}
                  style={({ pressed }) => [
                    styles.permissionBanner,
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open system settings to allow notifications"
                >
                  <AlertCircle
                    size={14}
                    color={theme.colors.warning}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.permissionText}>
                    Notifications are blocked in system settings.
                  </Text>
                  <View style={styles.permissionLink}>
                    <Text style={styles.permissionLinkText}>Open Settings</Text>
                    <ExternalLink
                      size={12}
                      color={theme.colors.accentDark}
                      strokeWidth={2.5}
                    />
                  </View>
                </Pressable>
              ) : null}
              <RowDivider />
            </>
          )}
          <SettingRow
            Icon={CheckCheck}
            iconBg={theme.colors.accentSoft}
            iconColor={theme.colors.accent}
            title="Mark all as read"
            subtitle={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "No unread notifications"
            }
            onPress={unreadCount > 0 ? handleMarkAllRead : undefined}
            disabled={unreadCount === 0 || markAllRead.isPending}
            right={
              markAllRead.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.accent}
                  style={styles.rowSpinner}
                />
              ) : unreadCount > 0 ? (
                <View style={styles.rowRight}>
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                  <ChevronRight
                    size={16}
                    color={theme.colors.textLight}
                    strokeWidth={2}
                  />
                </View>
              ) : null
            }
          />
        </SectionCard>
        <SectionHeader title="Account" />
        <SectionCard>
          <SettingRow
            Icon={Trash2}
            iconBg={theme.colors.dangerSoft}
            iconColor={theme.colors.danger}
            title="Delete account"
            subtitle="Permanently remove your account and all data"
            onPress={() => setDeleteAccountVisible(true)}
            right={
              <ChevronRight
                size={16}
                color={theme.colors.textLight}
                strokeWidth={2}
              />
            }
          />
        </SectionCard>
      </ScrollView>
      <DeleteAccountSheet
        visible={deleteAccountVisible}
        onClose={() => setDeleteAccountVisible(false)}
      />
    </>
  );
}
// -- styles --------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl * 2,
  },
  pageHeader: { paddingBottom: theme.spacing.sm },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionCard: {
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 64,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  rowPressed: { backgroundColor: theme.colors.neutralSoft },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  rowTitleDisabled: { color: theme.colors.textDisabled },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  rowSpinner: { marginRight: 4 },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: theme.colors.warningSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  permissionText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.warning,
    lineHeight: 17,
  },
  permissionLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  permissionLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accentDark,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textInverse,
  },
});


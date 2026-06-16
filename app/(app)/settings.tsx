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
  Bug,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Trash2,
  Wrench,
} from "lucide-react-native";
import * as Sentry from "@sentry/react-native";

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
import { useDevOverridesStore } from "@/lib/state";
import { ChangePasswordSheet, DeleteAccountSheet } from "@/components/settings";

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  // ── Notifications ─────────────────────────────────────────────────────
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: pushStatus, isLoading: pushLoading } = usePushStatus();
  const togglePush = useTogglePush();
  const markAllRead = useMarkAllNotificationsRead();

  // ── Biometrics ────────────────────────────────────────────────────────
  const { data: biometric } = useBiometricSettings();
  const toggleBiometric = useToggleBiometric();
  const biometricCapability = biometric?.capability ?? null;
  const biometricEnabled = biometric?.enabled ?? false;

  // ── Change password ───────────────────────────────────────────────────
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  // ── Delete account ────────────────────────────────────────────────────
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

  // ── Shared ────────────────────────────────────────────────────────────
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
        {/* Page title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── Security section ──────────────────────────────────────────── */}
        <SectionHeader title="Security" />

        <SectionCard>
          {/* Biometric row — hidden when FEATURES.BIOMETRIC_LOCK is false */}
          {FEATURES.BIOMETRIC_LOCK && (
            <>
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
              <RowDivider />
            </>
          )}

          <SettingRow
            Icon={KeyRound}
            iconBg={theme.colors.accentSoft}
            iconColor={theme.colors.accent}
            title="Change password"
            subtitle="Update your account password"
            onPress={() => setChangePasswordVisible(true)}
            right={
              <ChevronRight
                size={16}
                color={theme.colors.textLight}
                strokeWidth={2}
              />
            }
          />
        </SectionCard>

        {/* ── Notifications section ──────────────────────────────────────── */}
        <SectionHeader title="Notifications" />

        <SectionCard>
          {/* Push toggle — hidden when FEATURES.PUSH_NOTIFICATIONS is false */}
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

        {/* ── Account section ───────────────────────────────────────────── */}
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

        {/* ── Developer section (dev builds only) ───────────────────────── */}
        {FEATURES.DEVELOPER_SECTION && <DeveloperSection />}
      </ScrollView>

      <ChangePasswordSheet
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />

      <DeleteAccountSheet
        visible={deleteAccountVisible}
        onClose={() => setDeleteAccountVisible(false)}
      />
    </>
  );
}

// ── Developer-only overrides ─────────────────────────────────────────────────
// Rendered ONLY when `__DEV__` is true. Metro strips the entire branch — and
// therefore this component — from production bundles, so neither the toggle UI
// nor the store reference ship to end users.

function DeveloperSection() {
  const adminOverride = useDevOverridesStore((s) => s.adminOverride);
  const toggleAdminOverride = useDevOverridesStore(
    (s) => s.toggleAdminOverride,
  );

  return (
    <>
      <SectionHeader title="Developer" />
      <SectionCard>
        <SettingRow
          Icon={Wrench}
          iconBg={theme.colors.neutralSoft}
          iconColor={theme.colors.textMuted}
          title="Make me admin"
          subtitle="Preview admin features in this dev session"
          right={
            <Switch
              value={adminOverride}
              onValueChange={toggleAdminOverride}
              trackColor={{
                false: theme.colors.neutralSoft,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.neutralSoft}
            />
          }
        />
        <RowDivider />
        <SettingRow
          Icon={Bug}
          iconBg={theme.colors.dangerSoft}
          iconColor={theme.colors.danger}
          title="Test Sentry"
          subtitle="Capture a test exception to verify Sentry is working"
          onPress={() =>
            Sentry.captureException(new Error("Test Sentry error"))
          }
          right={
            <ChevronRight
              size={16}
              color={theme.colors.textLight}
              strokeWidth={2}
            />
          }
        />
      </SectionCard>
    </>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl * 2,
  },
  pageHeader: {
    paddingBottom: theme.spacing.sm,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },

  // Section
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
    marginLeft: 64, // visually aligns with text start (icon 36 + padding 16 + gap 12)
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  rowPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  rowTitleDisabled: {
    color: theme.colors.textDisabled,
  },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  rowSpinner: {
    marginRight: 4,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },

  // Permission-denied banner
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
  permissionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  permissionLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accentDark,
  },

  // Unread badge
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

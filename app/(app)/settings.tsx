import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle,
  BellOff,
  BellRing,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  ShieldCheck,
  Smartphone,
} from "lucide-react-native";
import * as Device from "expo-device";

import { theme } from "@/constants/theme";
import { useSession } from "@/hooks/useSession";
import {
  useMarkAllNotificationsRead,
  usePushStatus,
  useTogglePush,
  useUnreadNotificationCount,
} from "@/hooks/useNotifications";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  getBiometricLabel,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricCapability,
} from "@/services/biometric.service";

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
  const { session } = useSession();
  const userId = session?.user.id;

  // ── Notifications ─────────────────────────────────────────────────────
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);
  const {
    data: pushStatus,
    isLoading: pushLoading,
    refetch: refetchPushStatus,
  } = usePushStatus(userId);
  const togglePush = useTogglePush(userId);
  const markAllRead = useMarkAllNotificationsRead(userId);

  // ── Biometrics ────────────────────────────────────────────────────────
  const [biometricCapability, setBiometricCapability] =
    useState<BiometricCapability | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricToggling, setBiometricToggling] = useState(false);

  async function loadBiometricState() {
    const [cap, enabled] = await Promise.all([
      getBiometricCapability(),
      userId ? isBiometricEnabled(userId) : Promise.resolve(false),
    ]);
    setBiometricCapability(cap);
    setBiometricEnabledState(enabled);
  }

  useFocusEffect(
    useCallback(() => {
      refetchPushStatus();
      loadBiometricState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
  );

  async function handleBiometricToggle(value: boolean) {
    if (!userId || biometricToggling) return;
    setBiometricToggling(true);

    try {
      if (value) {
        // Require a successful biometric prompt before enabling —
        // prevents someone else from enabling it without your face/fingerprint.
        const result = await authenticateWithBiometrics(
          "Verify your identity to enable biometric login",
        );
        if (!result.success) {
          setBiometricToggling(false);
          return;
        }
        await setBiometricEnabled(userId, true);
        setBiometricEnabledState(true);
      } else {
        Alert.alert(
          "Disable biometric login?",
          "You will need to enter your password the next time you open the app.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setBiometricToggling(false),
            },
            {
              text: "Disable",
              style: "destructive",
              onPress: async () => {
                await setBiometricEnabled(userId, false);
                setBiometricEnabledState(false);
                setBiometricToggling(false);
              },
            },
          ],
        );
        return;
      }
    } catch {
      // silently ignore
    } finally {
      setBiometricToggling(false);
    }
  }

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

  const deviceLabel = Device.deviceName
    ? `${Device.deviceName} · ${Platform.OS === "ios" ? "iOS" : "Android"}`
    : Platform.OS === "ios"
      ? "iOS device"
      : "Android device";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Security section ──────────────────────────────────────────── */}
      <SectionHeader title="Security" />

      <SectionCard>
        <SettingRow
          Icon={Fingerprint}
          iconBg={
            biometricEnabled
              ? theme.colors.primarySoft
              : theme.colors.neutralSoft
          }
          iconColor={
            biometricEnabled ? theme.colors.primary : theme.colors.neutral
          }
          title={`${biometricLabel} login`}
          subtitle={
            biometricCapability?.isAvailable
              ? `Unlock the app with ${biometricLabel}`
              : "Not available on this device"
          }
          disabled={!biometricCapability?.isAvailable || biometricToggling}
          right={
            biometricToggling ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.rowSpinner}
              />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={
                  !biometricCapability?.isAvailable || biometricToggling
                }
                trackColor={{
                  false: theme.colors.neutralSoft,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.neutralSoft}
              />
            )
          }
        />

        <RowDivider />

        <SettingRow
          Icon={ShieldCheck}
          iconBg={theme.colors.successSoft}
          iconColor={theme.colors.success}
          title="Session"
          subtitle="Your login session is managed securely by Supabase"
        />
      </SectionCard>

      {/* ── Notifications section ──────────────────────────────────────── */}
      <SectionHeader title="Notifications" />

      <SectionCard>
        <SettingRow
          Icon={pushEnabled ? BellRing : BellOff}
          iconBg={
            pushEnabled ? theme.colors.primarySoft : theme.colors.neutralSoft
          }
          iconColor={pushEnabled ? theme.colors.primary : theme.colors.neutral}
          title="Push notifications"
          subtitle="Alerts for key checkouts, due dates, overdue keys and recalls"
          disabled={pushLoading || togglePush.isPending}
          right={
            pushLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.rowSpinner}
              />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                disabled={togglePush.isPending}
                trackColor={{
                  false: theme.colors.neutralSoft,
                  true: theme.colors.primary,
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
                color={theme.colors.primary}
                strokeWidth={2.5}
              />
            </View>
          </Pressable>
        ) : null}

        <RowDivider />

        <SettingRow
          Icon={Smartphone}
          iconBg={theme.colors.infoSoft}
          iconColor={theme.colors.info}
          title="This device"
          subtitle={deviceLabel}
        />

        <RowDivider />

        <SettingRow
          Icon={CheckCheck}
          iconBg={
            unreadCount > 0
              ? theme.colors.successSoft
              : theme.colors.neutralSoft
          }
          iconColor={
            unreadCount > 0 ? theme.colors.success : theme.colors.neutral
          }
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
                color={theme.colors.success}
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
    </ScrollView>
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
    color: theme.colors.textLight,
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
    color: theme.colors.primary,
  },

  // Unread badge
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
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

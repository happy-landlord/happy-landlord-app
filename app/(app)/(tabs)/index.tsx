import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Bell,
  Building2,
  HelpCircle,
  KeyRound,
  ScanLine,
  Users,
} from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";

import { KeyDashboardSummary, PropertyStatsBanner } from "@/components/keyset";
import { SectionHeader } from "@/components/ui";
import { useRole, useRefreshControl } from "@/hooks";
import { theme, useBottomListPadding } from "@/constants";

// ── Quick actions config ──────────────────────────────────────────────────────

type QuickAction = {
  label: string;
  sublabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
  onPress: (router: ReturnType<typeof useRouter>, pathname: string) => void;
};

const AGENT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Scan",
    sublabel: "Scan a keyset",
    Icon: ScanLine,
    iconColor: theme.colors.primaryText,
    iconBg: theme.colors.primary,
    onPress: (router, pathname) =>
      router.push({ pathname: "/(app)/scan", params: { returnTo: pathname } } as never),
  },
  {
    label: "My Keysets",
    sublabel: "Checked out & reserved",
    Icon: KeyRound,
    iconColor: theme.colors.accent,
    iconBg: theme.colors.accentSoft,
    onPress: (router) => router.push("/(app)/(tabs)/activity" as never),
  },
  {
    label: "Support",
    sublabel: "Help & support",
    Icon: HelpCircle,
    iconColor: theme.colors.info,
    iconBg: theme.colors.infoSoft,
    onPress: (router) => router.push("/(app)/help" as never),
  },
  {
    label: "Properties",
    sublabel: "Browse all properties",
    Icon: Building2,
    iconColor: theme.colors.success,
    iconBg: theme.colors.successSoft,
    onPress: (router) => router.push("/(app)/(tabs)/properties" as never),
  },
];

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Scan",
    sublabel: "Scan a keyset",
    Icon: ScanLine,
    iconColor: theme.colors.primaryText,
    iconBg: theme.colors.primary,
    onPress: (router, pathname) =>
      router.push({ pathname: "/(app)/scan", params: { returnTo: pathname } } as never),
  },
  {
    label: "Properties",
    sublabel: "Browse all properties",
    Icon: Building2,
    iconColor: theme.colors.success,
    iconBg: theme.colors.successSoft,
    onPress: (router) => router.push("/(app)/(tabs)/properties" as never),
  },
  {
    label: "Activity",
    sublabel: "Checked out & attention",
    Icon: KeyRound,
    iconColor: theme.colors.warning,
    iconBg: theme.colors.warningSoft,
    onPress: (router) => router.push("/(app)/(tabs)/activity" as never),
  },
  {
    label: "Agents",
    sublabel: "Manage agents",
    Icon: Users,
    iconColor: theme.colors.accent,
    iconBg: theme.colors.accentSoft,
    onPress: (router) => router.push("/(app)/agents" as never),
  },
  {
    label: "Notifications",
    sublabel: "Send & view alerts",
    Icon: Bell,
    iconColor: theme.colors.info,
    iconBg: theme.colors.infoSoft,
    onPress: (router) => router.push("/(app)/notifications" as never),
  },
  {
    label: "Support",
    sublabel: "Help & support",
    Icon: HelpCircle,
    iconColor: theme.colors.neutral,
    iconBg: theme.colors.neutralSoft,
    onPress: (router) => router.push("/(app)/help" as never),
  },
];

// ── Shared quick-actions grid ─────────────────────────────────────────────────

function QuickActionsGrid({ actions }: { actions: QuickAction[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() => action.onPress(router, pathname)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={[styles.iconWrap, { backgroundColor: action.iconBg }]}>
            <action.Icon size={24} color={action.iconColor} strokeWidth={2} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
          <Text style={styles.actionSublabel} numberOfLines={1}>
            {action.sublabel}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const listPaddingBottom = useBottomListPadding();
  const { isAdmin } = useRole();

  const { refreshing, onRefresh } = useRefreshControl();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: listPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Admin dashboard */}
      {isAdmin && (
        <>
          <PropertyStatsBanner />
          <View style={styles.section}>
            <SectionHeader title="Keyset status" />
            <KeyDashboardSummary />
          </View>
          <View style={styles.section}>
            <SectionHeader title="Quick actions" />
            <QuickActionsGrid actions={ADMIN_QUICK_ACTIONS} />
          </View>
        </>
      )}

      {/* Quick actions — agent only */}
      {!isAdmin && (
        <View style={styles.section}>
          <SectionHeader title="Quick actions" />
          <QuickActionsGrid actions={AGENT_QUICK_ACTIONS} />
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  section: { gap: theme.spacing.sm },

  // ── Quick actions grid ────────────────────────────────────────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  actionCard: {
    width: "48.5%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  actionCardPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  actionSublabel: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
});

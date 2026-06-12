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
import { useProfile } from "@/lib/hooks";
import { theme, useBottomListPadding } from "@/constants";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// ── Quick actions config ──────────────────────────────────────────────────────

type QuickAction = {
  label: string;
  sublabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: (router: ReturnType<typeof useRouter>, pathname: string) => void;
};

const ACTION_SCAN: QuickAction = {
  label: "Scan",
  sublabel: "Scan a keyset",
  Icon: ScanLine,
  onPress: (router, pathname) =>
    router.push({ pathname: "/(app)/scan", params: { returnTo: pathname } } as never),
};

const ACTION_PROPERTIES: QuickAction = {
  label: "Properties",
  sublabel: "Browse all properties",
  Icon: Building2,
  onPress: (router) => router.push("/(app)/(tabs)/properties" as never),
};

const ACTION_SUPPORT: QuickAction = {
  label: "Support",
  sublabel: "Help & support",
  Icon: HelpCircle,
  onPress: (router) => router.push("/(app)/help" as never),
};

const AGENT_QUICK_ACTIONS: QuickAction[] = [
  ACTION_SCAN,
  {
    label: "My Keysets",
    sublabel: "Checked out & reserved",
    Icon: KeyRound,
    onPress: (router) => router.push("/(app)/(tabs)/activity" as never),
  },
  ACTION_PROPERTIES,
  ACTION_SUPPORT,
];

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  ACTION_SCAN,
  ACTION_PROPERTIES,
  {
    label: "Activity",
    sublabel: "Checked out & attention",
    Icon: KeyRound,
    onPress: (router) => router.push("/(app)/(tabs)/activity" as never),
  },
  {
    label: "Agents",
    sublabel: "Manage agents",
    Icon: Users,
    onPress: (router) => router.push("/(app)/agents" as never),
  },
  {
    label: "Notifications",
    sublabel: "Send & view alerts",
    Icon: Bell,
    onPress: (router) => router.push("/(app)/notifications" as never),
  },
  ACTION_SUPPORT,
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
          <View style={[styles.iconWrap, styles.iconWrapBg]}>
            <action.Icon size={24} color={theme.colors.info} strokeWidth={2} />
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
  const { data: profile } = useProfile();
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
          tintColor={theme.colors.accentLight}
          colors={[theme.colors.accentLight]}
        />
      }
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingLabel}>{getGreeting()}</Text>
        <Text style={styles.greetingName} numberOfLines={1}>
          {profile?.full_name ?? ""}
        </Text>
      </View>
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

  // ── Greeting ──────────────────────────────────────────────────────────────
  greeting: {
    gap: 2,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: theme.colors.textMuted,
    letterSpacing: 0.1,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },

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
  iconWrapBg: {
    backgroundColor: theme.colors.infoSoft,
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

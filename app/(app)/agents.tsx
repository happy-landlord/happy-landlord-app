import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";
import {
  AgentsList,
  RequestsList,
  TabBar,
  type TabDef,
} from "@/components/agents";
import { useAgents, usePendingRequests } from "@/lib/hooks";

type TabKey = "agents" | "requests";

export default function AgentsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");

  // Both queries are also read by their respective list components — TanStack
  // Query deduplicates the network call, so this only drives badge counts.
  const { data: agents } = useAgents();
  const { data: pendingRequests } = usePendingRequests();

  const tabs = useMemo<TabDef<TabKey>[]>(
    () => [
      {
        key: "agents",
        label: "Agents",
        badgeCount: agents?.length ?? 0,
        badgeVariant: "primary",
        alwaysShowBadge: true,
      },
      {
        key: "requests",
        label: "Requests",
        badgeCount: pendingRequests?.length ?? 0,
        badgeVariant: "danger",
      },
    ],
    [agents?.length, pendingRequests?.length],
  );

  return (
    <View style={styles.root}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Agents</Text>
      </View>
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === "agents" ? <AgentsList /> : <RequestsList />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  pageHeader: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
});

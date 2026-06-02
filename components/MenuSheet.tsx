import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Settings,
  HelpCircle,
  LogOut,
  ClipboardList,
} from "lucide-react-native";

import { BottomSheet } from "@/components/ui";
import { RoleGate } from "@/components/RoleGate";
import { theme } from "@/constants";
import { usePendingRequests , useSignOut } from "@/lib/hooks";

type MenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function MenuSheet({ visible, onClose }: MenuSheetProps) {
  const router = useRouter();
  const { data: pendingRequests } = usePendingRequests();
  const signOut = useSignOut();

  const navigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as never), 220);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => signOut.mutate(), 220);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>Menu</Text>

      <View style={styles.items}>
        {/* Admin-only section */}
        <RoleGate allow="admin">
          <MenuItem
            Icon={ClipboardList}
            label="Agent Requests"
            onPress={() => navigate("/(app)/requests")}
            badge={pendingRequests?.length ?? 0}
          />
          <View style={styles.divider} />
        </RoleGate>

        <MenuItem
          Icon={Settings}
          label="Settings"
          onPress={() => navigate("/(app)/settings")}
        />
        <View style={styles.divider} />
        <MenuItem
          Icon={HelpCircle}
          label="Help"
          onPress={() => navigate("/(app)/help")}
        />
        <View style={styles.divider} />
        <MenuItem
          Icon={LogOut}
          label="Sign out"
          onPress={handleLogout}
          danger
          loading={signOut.isPending}
        />
      </View>
    </BottomSheet>
  );
}

type MenuItemProps = {
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
  badge?: number;
};

function MenuItem({
  Icon,
  label,
  onPress,
  danger,
  loading,
  badge,
}: MenuItemProps) {
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Icon size={20} color={color} strokeWidth={1.8} />
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>
        {loading ? "Signing out…" : label}
      </Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  items: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceWarm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  itemPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  itemLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "500",
    flex: 1,
  },
  itemLabelDanger: {
    color: theme.colors.danger,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.surface,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 20 + theme.spacing.md,
  },
});

import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  ClipboardList,
} from "lucide-react-native";

import { supabase } from "@/lib/supabase";
import { useLockStore } from "@/lib/lockStore";
import { RoleGate } from "@/components/RoleGate";
import { theme } from "@/constants/theme";
import { usePendingRequests } from "@/hooks/useAgentRequests";

type MenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function MenuSheet({ visible, onClose }: MenuSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const { data: pendingRequests } = usePendingRequests();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Clear all cached data so the next user starts fresh
      queryClient.clear();
      // Reset biometric lock so the next login goes through the normal flow
      useLockStore.getState().reset();
    },
  });

  const navigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as never), 220);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => signOutMutation.mutate(), 220);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dimmed backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + theme.spacing.md },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle at top */}
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Menu</Text>

        <View style={styles.items}>
          {/* Admin-only section */}
          <RoleGate allow="admin">
            <MenuItem
              Icon={ShieldCheck}
              label="Admin"
              onPress={() => navigate("/(app)/admin")}
            />
            <View style={styles.divider} />
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
            loading={signOutMutation.isPending}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

type MenuItemProps = {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
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
      <Text
        style={[styles.itemLabel, danger && styles.itemLabelDanger]}
      >
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 38, 38, 0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
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

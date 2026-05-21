import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useSession } from "@/hooks/useSession";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";

type NotificationBellProps = {
  size?: number;
};

export function NotificationBell({ size = 38 }: NotificationBellProps) {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications" as never)}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        pressed && styles.buttonPressed,
      ]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Open notifications, ${unreadCount} unread`
          : "Open notifications"
      }
    >
      <Bell size={21} color={theme.colors.text} strokeWidth={1.8} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.surface,
  },
});


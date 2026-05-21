import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, Building2, ScanLine, History } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";

import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { theme } from "@/constants/theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const { isAdmin } = useRole();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingHi}>Hi, {firstName} 👋</Text>
        <Text style={styles.greetingRole}>
          {isAdmin ? "Admin · Happy Landlord" : "Agent · Happy Landlord"}
        </Text>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionLabel}>Quick actions</Text>
      <View style={styles.grid}>
        <QuickAction
          Icon={Building2}
          label="Properties"
          color={theme.colors.info}
          bg={theme.colors.infoSoft}
          onPress={() => router.push("/(app)/(tabs)/properties")}
        />
        <QuickAction
          Icon={ScanLine}
          label="Scan QR"
          color={theme.colors.primary}
          bg={theme.colors.primarySoft}
          onPress={() => router.push({ pathname: "/(app)/scan", params: { returnTo: pathname } } as never)}
        />
        <QuickAction
          Icon={History}
          label="Activity"
          color={theme.colors.success}
          bg={theme.colors.successSoft}
          onPress={() => router.push("/(app)/(tabs)/activity")}
        />
        <QuickAction
          Icon={KeyRound}
          label="Keys"
          color={theme.colors.warning}
          bg={theme.colors.warningSoft}
          onPress={() => router.push("/(app)/(tabs)/properties")}
        />
      </View>
    </ScrollView>
  );
}

function QuickAction({
  Icon, label, color, bg, onPress,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardIcon, { backgroundColor: bg }]}>
        <Icon size={22} color={color} strokeWidth={1.8} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  greeting: { gap: 4, paddingTop: theme.spacing.sm },
  greetingHi: { fontSize: 26, fontWeight: "800", color: theme.colors.text },
  greetingRole: { fontSize: 14, color: theme.colors.textMuted },
  sectionLabel: {
    fontSize: 13, fontWeight: "600", color: theme.colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  card: {
    width: "47.5%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardPressed: { opacity: 0.7 },
  cardIcon: {
    width: 44, height: 44, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
});

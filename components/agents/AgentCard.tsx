import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { ChevronRight } from "lucide-react-native";

import { PhoneLink, PressableCard } from "@/components/ui";
import { theme } from "@/constants";
import { useProfileImageUrl } from "@/lib/hooks";
import type { AgentProfile } from "@/lib/services";

type Props = {
  agent: AgentProfile;
  /** When provided the card becomes pressable (list usage). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AgentCard({ agent, onPress, style }: Props) {
  const { data: imageUrl } = useProfileImageUrl(agent.profile_image);

  const name =
    agent.full_name?.trim() || agent.key_holder_full_name?.trim() || null;
  const mobile = agent.phone?.trim() || agent.key_holder_phone?.trim() || null;
  const initial = (name || agent.email || "?")[0].toUpperCase();

  const inner = (
    <>
      {/* Left image pane */}
      <View style={styles.imagePane}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={160}
            recyclingKey={imageUrl}
          />
        ) : (
          <View style={styles.imageFallback}>
            <View style={styles.initialCircle}>
              <Text style={styles.imageInitial}>{initial}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Right content */}
      <View style={styles.content}>
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>
            {name ?? "Unknown name"}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {agent.email ?? "—"}
          </Text>
        </View>
        <View style={styles.mobileRow}>
          {mobile ? (
            <PhoneLink
              phone={mobile}
              showIcon
              iconSize={14}
              iconColor={theme.colors.textMuted}
              textStyle={styles.mobile}
            />
          ) : (
            <Text style={styles.mobileEmpty}>No mobile</Text>
          )}
        </View>
        {onPress ? (
          <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2.5} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <PressableCard
        onPress={onPress}
        flush
        pressEffect="lift"
        accessibilityRole="button"
        accessibilityLabel={`View ${name ?? "agent"} details`}
        style={[styles.card, style]}
      >
        {inner}
      </PressableCard>
    );
  }

  return <View style={[styles.card, style]}>{inner}</View>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  imagePane: { width: 74 },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  initialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  imageInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },

  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  details: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  email: { fontSize: 12, color: theme.colors.textMuted },
  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: "44%",
  },
  mobile: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  mobileEmpty: {
    fontSize: 13,
    fontWeight: "400",
    color: theme.colors.textLight,
  },
});

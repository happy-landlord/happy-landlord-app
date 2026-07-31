import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { ChevronRight, KeyRound } from "lucide-react-native";

import { PressableCard } from "@/components/ui";
import { theme } from "@/constants";
import { useAgentHeldKeySets, useProfileImageUrl } from "@/lib/hooks";
import type { AgentProfile } from "@/lib/services";

type Props = {
  agent: AgentProfile;
  /** When provided the card becomes pressable (list usage). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AgentCard({ agent, onPress, style }: Props) {
  const { data: imageUrl } = useProfileImageUrl(agent.profile_image);
  const { data: heldKeySets } = useAgentHeldKeySets(agent.id);

  const name =
    agent.full_name?.trim() || agent.key_holder_full_name?.trim() || null;
  const initial = (name || agent.email || "?")[0].toUpperCase();
  const keysetCount = heldKeySets?.length ?? 0;

  const inner = (
    <>
      {/* Avatar */}
      <View style={styles.avatarOuter}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={160}
            recyclingKey={imageUrl}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name ?? "Unknown name"}
        </Text>
        <View style={styles.keysetBadge}>
          <KeyRound
            size={11}
            color={theme.colors.accentLight}
            strokeWidth={2}
          />
          <Text style={styles.keysetText}>
            {keysetCount} {keysetCount === 1 ? "keyset" : "keysets"}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      {onPress ? (
        <ChevronRight
          size={16}
          color={theme.colors.textMuted}
          strokeWidth={2.5}
        />
      ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm + 2,
    gap: theme.spacing.sm + 2,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },

  avatarOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },

  content: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  keysetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  keysetText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.accentLight,
  },
});

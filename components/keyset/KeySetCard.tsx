import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, KeyRound } from "lucide-react-native";

import { KeyStatusChip } from "@/components/KeyStatusChip";
import { theme } from "@/constants";
import { useFirstKeySetImageUrl } from "@/lib/hooks";
import {
  type KeySetWithDetails,
  getVisibleKeySetImages,
} from "@/lib/services";

export type KeySetCardProps = {
  keySet: KeySetWithDetails;
  onPress?: () => void;
};

export const KeySetCard = memo(function KeySetCard({
  keySet,
  onPress,
}: KeySetCardProps) {
  const totalKeys = (keySet.keys ?? []).reduce(
    (sum: number, item: { quantity: number }) => sum + (item.quantity ?? 0),
    0,
  );
  const typeLabel = keySet.name;

  const hasImages = getVisibleKeySetImages(keySet.images ?? []).length > 0;
  const { data: thumbnailUrl } = useFirstKeySetImageUrl(keySet.images);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={typeLabel}
    >
      {/* Thumbnail if available, otherwise icon */}
      {hasImages && thumbnailUrl ? (
        <View style={styles.thumbnail}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.iconWrap}>
          <KeyRound size={18} color={theme.colors.primary} strokeWidth={1.8} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <Text style={styles.code}>{keySet.code}</Text>
        <Text style={styles.keyCount}>
          {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
        </Text>
      </View>

      <View style={styles.right}>
        <KeyStatusChip status={keySet.status} />
        <ChevronRight
          size={16}
          color={theme.colors.textLight}
          strokeWidth={1.8}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  code: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  keyCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "500",
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
});

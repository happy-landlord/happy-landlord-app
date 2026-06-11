/**
 * PhotoPicker
 *
 * Reusable photo-capture / gallery component.
 * Shows a dashed placeholder when empty, a thumbnail grid when photos exist,
 * and an "Add" button in the header once at least one photo has been added.
 *
 * Props
 *   uris        – current photo URIs
 *   onChange    – called with the updated URI array
 *   color       – accent colour for add button and compact variant
 *   label       – section label (default "Photos")
 *   hint        – placeholder helper text
 *   gridInset   – total extra horizontal space already consumed inside the parent
 *                 (beyond screen padding × 2), used to compute thumbnail width
 */

import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Camera, Plus, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { theme } from "@/constants";

const SCREEN_W = Dimensions.get("window").width;
const PHOTO_GAP = 6;

function thumbSize(gridInset: number) {
  return Math.floor(
    (SCREEN_W - theme.spacing.screen * 2 - gridInset - PHOTO_GAP * 2) / 3,
  );
}

type Props = {
  uris: string[];
  onChange: (uris: string[]) => void;
  /** Accent colour for icon, placeholder border, add button. Defaults to primary. */
  color?: string;
  /** Section label. Defaults to "Photos". */
  label?: string;
  /** Placeholder helper text. */
  hint?: string;
  /** Extra horizontal inset beyond the screen padding already applied by the parent. */
  gridInset?: number;
  /** Smaller spacing/button/thumb controls for nested forms. */
  compact?: boolean;
};

export function PhotoPicker({
  uris,
  onChange,
  color = theme.colors.primary,
  label = "Photos",
  hint = "Tap to add photos",
  gridInset = 0,
  compact = false,
}: Props) {
  const size = thumbSize(gridInset);

  async function handleAdd() {
    Alert.alert("Add Photos", "Choose photo source", [
      {
        text: "Take Photo",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.85,
          });
          if (!result.canceled && result.assets.length > 0) {
            onChange([...uris, result.assets[0].uri]);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== "granted") {
            Alert.alert(
              "Permission required",
              "Allow photo library access in Settings.",
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.85,
            allowsMultipleSelection: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            onChange([...uris, ...result.assets.map((a) => a.uri)]);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleRemove(index: number) {
    onChange(uris.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {label}
        </Text>
        {uris.length > 0 && (
          <Text style={styles.photoCount}>
            {uris.length} {uris.length === 1 ? "photo" : "photos"} added
          </Text>
        )}
      </View>

      {/* Empty placeholder */}
      {uris.length === 0 && (
        <Pressable
          style={[
            styles.placeholder,
            compact && styles.placeholderCompact,
            { borderColor: compact ? color + "66" : theme.colors.border },
          ]}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={hint}
        >
          <Camera
            size={compact ? 26 : 28}
            color={compact ? color : theme.colors.textMuted}
            strokeWidth={compact ? 1.6 : 1.5}
          />
          <Text
            style={[
              styles.hint,
              compact && styles.hintCompact,
              { color: compact ? color : theme.colors.textMuted },
            ]}
          >
            {hint}
          </Text>
        </Pressable>
      )}

      {/* Photo grid */}
      {uris.length > 0 && (
        <View style={styles.grid}>
          {uris.map((uri, index) => (
            <View
              key={uri + index}
              style={[styles.thumb, { width: size, height: size }]}
            >
              <Image
                source={{ uri }}
                style={styles.thumbImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
              <Pressable
                style={[styles.removeBtn, compact && styles.removeBtnCompact]}
                onPress={() => handleRemove(index)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <X size={11} color={theme.colors.textInverse} strokeWidth={3} />
              </Pressable>
              <View style={[styles.badge, compact && styles.badgeCompact]}>
                <Text
                  style={[styles.badgeText, compact && styles.badgeTextCompact]}
                >
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}

          {/* Add More tile */}
          <Pressable
            style={({ pressed }) => [
              styles.addMoreTile,
              compact && { backgroundColor: theme.colors.background },
              { width: size, height: size, borderColor: color + "88" },
              pressed && styles.addBtnPressed,
            ]}
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel="Add more photos"
          >
            <View style={[styles.addMoreIconCircle, { borderColor: color }]}>
              <Plus size={compact ? 16 : 18} color={color} strokeWidth={2} />
            </View>
            <Text style={[styles.addMoreText, { color }]}>Add More</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
    paddingBottom: 4,
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  photoCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "500",
  },
  addBtnPressed: { opacity: 0.75 },
  addMoreTile: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addMoreIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  placeholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceWarm,
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  placeholderCompact: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.lg,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
  },
  hintCompact: {
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PHOTO_GAP,
  },
  thumb: {
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  removeBtnCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  badge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeCompact: {
    bottom: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textInverse,
    lineHeight: 13,
  },
  badgeTextCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
});

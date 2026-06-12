import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { theme } from "@/constants";
import {
  useProfile,
  useProfileImageUrl,
  useUploadProfileImage,
} from "@/lib/hooks";
import { getInitials } from "@/lib/utils";

// ── ProfileAvatar ────────────────────────────────────────────────────────────
// Self-sufficient avatar with camera badge. Reads the current profile via
// TanStack and runs the upload mutation internally — no props required.

export function ProfileAvatar() {
  const { data: profile } = useProfile();
  const { data: avatarUrl } = useProfileImageUrl(profile?.profile_image);
  const upload = useUploadProfileImage();

  const initials = getInitials(profile?.full_name, profile?.email);
  const busy = upload.isPending;

  const handlePress = () => {
    Alert.alert("Profile Photo", "Choose a photo source", [
      { text: "Take Photo", onPress: () => pickAndUpload("camera") },
      { text: "Choose from Library", onPress: () => pickAndUpload("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickAndUpload = async (source: "camera" | "library") => {
    const result = await launchPicker(source);
    if (!result || result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;

    upload.mutate(uri);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={({ pressed }) => [styles.shell, pressed && styles.shellPressed]}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
    >
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={avatarUrl}
          />
        ) : (
          <Text style={styles.text}>{initials}</Text>
        )}
      </View>

      <View style={styles.badge}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : (
          <Camera size={14} color={theme.colors.accent} strokeWidth={2} />
        )}
      </View>
    </Pressable>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function launchPicker(
  source: "camera" | "library",
): Promise<ImagePicker.ImagePickerResult | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission required", "Allow camera access in Settings.");
      return null;
    }
    return ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    Alert.alert(
      "Permission required",
      "Allow photo library access in Settings.",
    );
    return null;
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    quality: 0.85,
    allowsEditing: true,
    aspect: [1, 1],
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 84;

const styles = StyleSheet.create({
  shell: {
    padding: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    position: "relative",
  },
  shellPressed: { opacity: 0.8 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  text: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.textInverse,
  },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});

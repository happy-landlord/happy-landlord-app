import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Check, Pencil, Phone, User, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import {
  useProfile,
  useUpdateProfile,
  useProfileImageUrl,
} from "@/hooks/useProfile";
import { useCurrentUserId } from "@/hooks/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  uploadProfileImage,
  updateProfileImagePath,
} from "@/services/profile.service";
import type { ProfileEdits } from "@/services/profile.service";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const updateMutation = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Signed URL for the stored profile image path
  const { data: avatarUrl } = useProfileImageUrl(profile?.profile_image);

  const startEdit = () => {
    setDraftName(profile?.full_name ?? "");
    setDraftPhone(profile?.phone ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftName(profile?.full_name ?? "");
    setDraftPhone(profile?.phone ?? "");
    setEditing(false);
  };

  const saveEdit = () => {
    const edits: ProfileEdits = {
      full_name: draftName.trim() || null,
      phone: draftPhone.trim() || null,
    };
    updateMutation.mutate(edits, {
      onSuccess: () => setEditing(false),
      onError: () =>
        Alert.alert("Error", "Could not save changes. Please try again."),
    });
  };

  const handleAvatarPress = () => {
    Alert.alert("Profile Photo", "Choose a photo source", [
      {
        text: "Take Photo",
        onPress: () => pickImage("camera"),
      },
      {
        text: "Choose from Library",
        onPress: () => pickImage("library"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = async (source: "camera" | "library") => {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Allow camera access in Settings.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Allow photo library access in Settings.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
    }

    if (result.canceled || !result.assets[0]?.uri || !userId) return;

    setUploadingImage(true);
    try {
      const path = await uploadProfileImage(userId, result.assets[0].uri);
      await updateProfileImagePath(userId, path);

      // Immediately write the new path into the profile cache so
      // useProfileImageUrl(path) becomes enabled in the same render cycle
      // and fires the signed URL fetch right away — no background-refetch lag.
      if (profile) {
        queryClient.setQueryData(QUERY_KEYS.auth.profile(userId), {
          ...profile,
          profile_image: path,
        });
      }
      // If this is a re-upload (same path, file overwritten), bust the cached
      // signed URL so a fresh one is fetched for the new content.
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.storage.signedUrl(path),
      });
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload photo. Please try again.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading profile…" />;
  if (isError || !profile) {
    return <ErrorState onRetry={refetch} message="Could not load your profile." />;
  }

  const hasName = Boolean(profile.full_name?.trim());
  const hasPhone = Boolean(profile.phone?.trim());
  const initials = getInitials(profile.full_name, profile.email);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 96 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        {/* Tappable avatar */}
        <Pressable
          onPress={handleAvatarPress}
          disabled={uploadingImage}
          style={({ pressed }) => [styles.avatarShell, pressed && styles.avatarShellPressed]}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          {/* Camera badge overlay */}
          <View style={styles.cameraBadge}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Camera size={14} color="#fff" strokeWidth={2} />
            )}
          </View>
        </Pressable>

        <Text style={styles.email} numberOfLines={1}>
          {profile.email ?? "No email available"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account details</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <User size={16} color={theme.colors.primary} strokeWidth={1.9} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Name</Text>
              {editing ? (
                <TextInput
                  style={styles.rowInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  autoFocus
                />
              ) : (
                <Text style={[styles.rowValue, !hasName && styles.emptyValue]}>
                  {profile.full_name?.trim() || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Phone size={16} color={theme.colors.primary} strokeWidth={1.9} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.rowInput}
                  value={draftPhone}
                  onChangeText={setDraftPhone}
                  placeholder="Add phone number"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                />
              ) : (
                <Text style={[styles.rowValue, !hasPhone && styles.emptyValue]}>
                  {profile.phone?.trim() || "Not set"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {editing ? (
        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnOutline,
              pressed && styles.btnPressed,
              updateMutation.isPending && styles.btnDisabled,
            ]}
            onPress={cancelEdit}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing profile"
          >
            <X size={16} color={theme.colors.text} strokeWidth={2} />
            <Text style={styles.btnOutlineLabel}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnPrimary,
              pressed && styles.btnPressed,
              updateMutation.isPending && styles.btnDisabled,
            ]}
            onPress={saveEdit}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
          >
            <Check size={16} color={theme.colors.textInverse} strokeWidth={2} />
            <Text style={styles.btnPrimaryLabel}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnOutline,
            styles.btnFull,
            pressed && styles.btnPressed,
          ]}
          onPress={startEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Pencil size={16} color={theme.colors.text} strokeWidth={1.9} />
          <Text style={styles.btnOutlineLabel}>Edit profile</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const cleanName = name?.trim();
  if (cleanName) {
    return cleanName
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return (email?.trim()[0] ?? "?").toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  hero: {
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  avatarShell: {
    padding: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    position: "relative",
  },
  avatarShellPressed: { opacity: 0.8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 84, height: 84 },
  avatarText: { fontSize: 30, fontWeight: "800", color: theme.colors.textInverse },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  email: {
    maxWidth: "100%",
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  section: { gap: theme.spacing.sm },
  sectionLabel: {
    paddingHorizontal: theme.spacing.xs,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md - 2,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0, gap: 3 },
  rowLabel: {
    fontSize: 11,
    color: theme.colors.textLight,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  rowValue: { fontSize: 15, color: theme.colors.text, fontWeight: "600", lineHeight: 21 },
  emptyValue: { color: theme.colors.textMuted, fontWeight: "500" },
  rowInput: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: theme.spacing.xs,
  },
  btnRow: { flexDirection: "row", gap: theme.spacing.sm },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    minHeight: 48,
  },
  btnPressed: { opacity: 0.75 },
  btnFull: { flex: 0, width: "100%" },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryLabel: { fontSize: 15, fontWeight: "700", color: theme.colors.textInverse },
  btnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  btnOutlineLabel: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
});

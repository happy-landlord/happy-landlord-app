import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar, ProfileDetailsCard } from "@/components/profile";
import { ErrorState, LoadingState } from "@/components/ui";
import { theme, useBottomListPadding } from "@/constants";
import { useProfile } from "@/lib/hooks";
export default function ProfileScreen() {
  const listPaddingBottom = useBottomListPadding();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  if (isLoading) return <LoadingState message="Loading profile…" />;
  if (isError || !profile) {
    return (
      <ErrorState onRetry={refetch} message="Could not load your profile." />
    );
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: listPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <ProfileAvatar />
        <Text style={styles.email} numberOfLines={1}>
          {profile.email ?? "No email available"}
        </Text>
      </View>
      <ProfileDetailsCard />
    </ScrollView>
  );
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
  email: {
    maxWidth: "100%",
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
});

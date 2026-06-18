import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ProfileAvatar, ProfileDetailsCard } from "@/components/profile";
import { ErrorState, LoadingState } from "@/components/ui";
import { theme, useBottomListPadding } from "@/constants";
import { useProfile } from "@/lib/hooks";
import { useRefreshControl } from "@/hooks";

export default function ProfileScreen() {
  const listPaddingBottom = useBottomListPadding();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { refreshing, onRefresh } = useRefreshControl(refetch);
  if (isLoading) return <LoadingState message="Loading profile..." />;
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accentLight}
          colors={[theme.colors.accentLight]}
        />
      }
    >
      <View style={styles.hero}>
        <ProfileAvatar />
        <Text style={styles.email} numberOfLines={1}>
          {profile.phone ?? "No phone number set"}
        </Text>
        {profile.email ? (
          <Text style={styles.email} numberOfLines={1}>
            {profile.email}
          </Text>
        ) : null}
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
  phone: {
    maxWidth: "100%",
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  email: {
    maxWidth: "100%",
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});

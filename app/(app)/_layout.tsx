import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { useSession } from '@/hooks/useSession';
import { useProfile } from '@/hooks/useProfile';
import {
  useNotificationRealtime,
  useNotificationResponseNavigation,
  useRegisterPushToken,
  useForegroundNotificationListener,
} from '@/hooks/useNotifications';
import { theme } from '@/constants/theme';

export default function AppLayout() {
  const { isLoading: sessionLoading, isAuthenticated } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const userId = profile?.id;
  const router = useRouter();
  const segments = useSegments();

  useRegisterPushToken(isAuthenticated ? userId : undefined);
  useNotificationRealtime(isAuthenticated ? userId : undefined);
  useForegroundNotificationListener(isAuthenticated ? userId : undefined);
  useNotificationResponseNavigation();

  const isLoading = sessionLoading || (isAuthenticated && profileLoading);

  // Last segment tells us which screen is currently active inside (app)
  const currentScreen = segments[segments.length - 1] as string | undefined;
  const isOnStatusScreen = currentScreen === 'pending' || currentScreen === 'rejected';

  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) return;

    const isAdmin = profile.role === 'admin';
    const needsStatusScreen =
      !isAdmin &&
      (profile.status === 'pending' ||
        profile.status === 'rejected' ||
        profile.status === 'inactive');

    if (isOnStatusScreen) {
      // If we're on a status screen but the profile no longer requires it
      // (e.g. admin account, or agent just got approved), escape to the app.
      if (!needsStatusScreen) {
        router.replace('/(app)/(tabs)');
      }
      return;
    }

    if (needsStatusScreen) {
      if (profile.status === 'pending') {
        router.replace('/(app)/pending');
      } else {
        router.replace('/(app)/rejected');
      }
    }
  }, [isLoading, isAuthenticated, profile, isOnStatusScreen, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ header: () => <AppHeader /> }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="properties/[id]" />
      <Stack.Screen name="keys/[id]" />
      <Stack.Screen name="keys/scan" options={{ headerShown: false }} />
      <Stack.Screen name="checkouts/[id]" />
      <Stack.Screen name="requests" options={{ title: 'Agent Requests' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="help" options={{ title: 'Help' }} />
      <Stack.Screen name="pending" options={{ headerShown: false }} />
      <Stack.Screen name="rejected" options={{ headerShown: false }} />
    </Stack>
  );
}

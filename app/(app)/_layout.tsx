import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { useSession } from '@/hooks/useSession';
import { theme } from '@/constants/theme';

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useSession();

  // Show a neutral splash while the session resolves
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // Not authenticated — hand off to the auth group
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
    </Stack>
  );
}

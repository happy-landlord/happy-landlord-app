import { Redirect, Stack } from "expo-router";

import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/hooks/useSession";

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect the old /dashboard entry point to the tabs root
  if (!isLoading && isAuthenticated) {
    return (
      <Stack
        screenOptions={{
          header: () => <AppHeader />,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
        <Stack.Screen name="dashboard" redirect />
        <Stack.Screen name="properties/[id]" />
        <Stack.Screen name="keys/[id]" />
        <Stack.Screen name="keys/scan" />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        header: () => <AppHeader />,
      }}
    />
  );
}

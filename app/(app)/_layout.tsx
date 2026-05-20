import { Redirect, Stack } from "expo-router";

import { useSession } from "@/hooks/useSession";

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}


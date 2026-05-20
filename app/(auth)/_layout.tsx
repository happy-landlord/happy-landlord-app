import { Redirect, Stack } from "expo-router";

import { useSession } from "@/hooks/useSession";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}


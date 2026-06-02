import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/hooks";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (!isLoading && isAuthenticated) {
    return <Redirect href={"/(app)/(tabs)" as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

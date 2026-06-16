import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/hooks";
import { BrandedSplash } from "@/components/ui";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) return <BrandedSplash />;

  // All authenticated users (approved/admin/pending) go to the app gate.
  // Rejected/inactive are never left signed in — useLogin signs them out.
  if (isAuthenticated) {
    return <Redirect href={"/(app)/(tabs)" as never} />;
  }


  return <Stack screenOptions={{ headerShown: false }} />;
}

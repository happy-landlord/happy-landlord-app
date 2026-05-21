import { Tabs } from "expo-router";

import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="properties" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}


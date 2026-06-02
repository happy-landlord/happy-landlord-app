import { useEffect } from "react";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SystemUI from "expo-system-ui";
import "react-native-reanimated";

import { queryClient } from "@/lib/query";
import { useDevOverridesStore } from "@/lib/state";

// GooglePlacesAutocomplete renders a FlatList inside the add-property ScrollView.
// The warning is cosmetic — scroll-stealing is prevented by
// keyboardShouldPersistTaps="handled" on the outer ScrollView.
LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);

// Set the native root background colour BEFORE JS mounts so there is no white
// flash between the splash screen and the first React render.
SystemUI.setBackgroundColorAsync("#FAF9F5").catch(() => {
  // No-op: not fatal if it fails (e.g. on web).
});

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#FAF9F5",
  },
};

export default function RootLayout() {
  // Reset dev overrides on every app mount so a refresh never carries stale
  // overrides (e.g. "Make me admin" left on from the previous session).
  // __DEV__ is a Metro compile-time constant — stripped from production builds.
  const resetDevOverrides = useDevOverridesStore((s) => s.reset);
  useEffect(() => {
    if (__DEV__) resetDevOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <ThemeProvider value={AppTheme}>
              <Stack
                initialRouteName="(app)"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

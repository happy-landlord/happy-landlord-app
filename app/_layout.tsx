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

import { queryClient } from "@/lib/query/queryClient";

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

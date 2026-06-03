import { useEffect } from "react";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SystemUI from "expo-system-ui";
import "react-native-reanimated";

import { queryClient } from "@/lib/query";
import { useDevOverridesStore } from "@/lib/state";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://4a66fc94d624e04205dc8739ec3aa399@o4511500226527232.ingest.us.sentry.io/4511500234391553',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

/**
 * Expo Router v6 segment-level error boundary. Exporting a function named
 * `ErrorBoundary` from a layout file makes Router render it when any child
 * route throws during render — preventing the white-screen-of-death.
 */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={errorStyles.screen}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message} numberOfLines={6}>
        {error?.message ?? "An unexpected error occurred."}
      </Text>
      <Pressable
        onPress={retry}
        style={errorStyles.button}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAF9F5",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  message: { fontSize: 14, color: "#5C5C5C", textAlign: "center" },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#A38449",
  },
  buttonText: { color: "#FFF", fontWeight: "600" },
});

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

export default Sentry.wrap(function RootLayout() {
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
});

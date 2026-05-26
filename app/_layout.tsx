import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import "../global.css";

import { queryClient } from '@/lib/queryClient';

// GooglePlacesAutocomplete renders a FlatList inside the add-property ScrollView.
// The warning is cosmetic — scroll-stealing is prevented by
// keyboardShouldPersistTaps="handled" on the outer ScrollView.
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAF9F5',
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={AppTheme}>
        <PaperProvider>
          <Stack initialRouteName="(app)" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="dark" />
        </PaperProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

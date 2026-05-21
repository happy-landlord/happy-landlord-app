import { StyleSheet, View } from "react-native";
import { Settings } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/constants/theme";

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <EmptyState
        Icon={Settings}
        title="Settings"
        message="App preferences and account settings will appear here soon."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});


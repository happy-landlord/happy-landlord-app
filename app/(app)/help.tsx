import { StyleSheet, View } from "react-native";
import { HelpCircle } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/constants/theme";

export default function HelpScreen() {
  return (
    <View style={styles.screen}>
      <EmptyState
        Icon={HelpCircle}
        title="Help"
        message="Guides, FAQs, and support options will be available here soon."
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


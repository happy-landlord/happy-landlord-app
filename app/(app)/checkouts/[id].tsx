import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ClipboardList } from "lucide-react-native";

import { EmptyState } from "@/components/ui";
import { theme } from "@/constants";

export default function CheckoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.screen}>
      <EmptyState
        Icon={ClipboardList}
        title="Checkout details"
        message={
          id
            ? `Checkout ${id} was opened from a notification. Detailed checkout history will appear here soon.`
            : "Detailed checkout history will appear here soon."
        }
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


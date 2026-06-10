import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.screen}>
        <Text style={styles.title}>This screen doesn’t exist.</Text>
        <Text style={styles.subtitle}>
          The page you were looking for couldn’t be found.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  subtitle: {
    fontSize: 14,
    color: theme.colors.accentLight,
    textAlign: "center",
  },
  link: { marginTop: 16 },
  linkText: { color: theme.colors.primary, fontWeight: "600", fontSize: 16 },
});

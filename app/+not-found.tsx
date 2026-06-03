import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#FAF9F5",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { fontSize: 14, color: "#5C5C5C", textAlign: "center" },
  link: { marginTop: 16 },
  linkText: { color: "#A38449", fontWeight: "600", fontSize: 16 },
});


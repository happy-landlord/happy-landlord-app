import { Animated, StyleSheet } from "react-native";

import View = Animated.View;

export default function HomeScreen() {
  return <View style={styles.container}></View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

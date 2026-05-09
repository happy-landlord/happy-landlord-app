import { Animated, StyleSheet } from "react-native";
import View = Animated.View;

export default function ModalScreen() {
  return <View style={styles.container}>Hello</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

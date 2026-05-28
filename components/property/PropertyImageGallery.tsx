import { useCallback, useRef, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  /** Pre-resolved signed URLs in display order. */
  urls: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
};

export function PropertyImageGallery({
  urls,
  initialIndex = 0,
  visible,
  onClose,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const total = urls.length;

  const handleLayout = useCallback(() => {
    if (initialIndex > 0) {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, width]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      if (idx !== currentIndex) setCurrentIndex(idx);
    },
    [currentIndex, width],
  );

  if (total === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* Close button */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {currentIndex + 1} / {total}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close gallery"
          >
            <X size={22} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={handleLayout}
          style={styles.scroll}
          contentContainerStyle={{ alignItems: "center" }}
        >
          {urls.map((url, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <Image
                source={{ uri: url }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </View>
          ))}
        </ScrollView>

        {/* Dots indicator */}
        {total > 1 && (
          <View style={[styles.dotsRow, { paddingBottom: insets.bottom + 20 }]}>
            {urls.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  counter: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  scroll: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 18,
    borderRadius: 3,
  },
});

import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { theme } from "@/constants/theme";

type StepIndicatorProps = {
  steps: readonly string[];
  /** 1-based current step index */
  current: number;
};

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <View key={label} style={styles.item}>
            {i > 0 && (
              <View
                style={[styles.line, (done || active) && styles.lineActive]}
              />
            )}
            <View
              style={[
                styles.circle,
                active && styles.circleActive,
                done && styles.circleDone,
              ]}
            >
              {done ? (
                <Check
                  size={12}
                  color={theme.colors.textInverse}
                  strokeWidth={3}
                />
              ) : (
                <Text
                  style={[
                    styles.circleText,
                    active && styles.circleTextActive,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                done && styles.labelDone,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.md,
  },
  item: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  line: {
    position: "absolute",
    top: 14,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: theme.colors.border,
    zIndex: 0,
  },
  lineActive: {
    backgroundColor: theme.colors.primary,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  circleActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  circleDone: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textLight,
  },
  circleTextActive: {
    color: theme.colors.textInverse,
  },
  label: {
    marginTop: theme.spacing.xs,
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
    textAlign: "center",
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  labelDone: {
    color: theme.colors.primary,
  },
});


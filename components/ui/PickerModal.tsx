import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "@/constants";
import { BottomSheet } from "@/components/ui/BottomSheet";

type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type PickerModalProps<T extends string> = {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Generic bottom-sheet option picker. */
export function PickerModal<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: PickerModalProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => {
              onSelect(opt.value);
              onClose();
            }}
          >
            <Text
              style={[styles.optionText, selected && styles.optionTextSelected]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.cancelBtn} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionSelected: {
    backgroundColor: theme.colors.accentSoft,
    marginHorizontal: -theme.spacing.screen,
    paddingHorizontal: theme.spacing.screen,
  },
  optionText: {
    fontSize: 17,
    color: theme.colors.text,
    textAlign: "center",
    flex: 1,
  },
  optionTextSelected: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  cancelBtn: {
    marginTop: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.danger,
    fontWeight: "600",
  },
});

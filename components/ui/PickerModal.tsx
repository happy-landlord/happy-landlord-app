import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { theme } from "@/constants";
import { BottomSheet } from "@/components/ui/BottomSheet";

type PickerOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
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
            <View style={styles.optionLeft}>
              {opt.icon && <View style={styles.optionIcon}>{opt.icon}</View>}
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </View>
            {selected && (
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            )}
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
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  optionIcon: {
    width: 28,
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: theme.colors.accentSoft,
    marginHorizontal: -theme.spacing.screen,
    paddingHorizontal: theme.spacing.screen,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

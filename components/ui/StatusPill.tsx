import { Text, View } from "react-native";

export type KeyStatus =
  | "available"
  | "checkedOut"
  | "booked"
  | "overdue"
  | "inactive"
  | "lost";

const statusStyles: Record<
  KeyStatus,
  { bg: string; text: string; label: string }
> = {
  available: {
    bg: "bg-successSoft",
    text: "text-success",
    label: "Available",
  },
  checkedOut: {
    bg: "bg-warningSoft",
    text: "text-warning",
    label: "Checked out",
  },
  booked: {
    bg: "bg-infoSoft",
    text: "text-info",
    label: "Booked",
  },
  overdue: {
    bg: "bg-dangerSoft",
    text: "text-danger",
    label: "Overdue",
  },
  inactive: {
    bg: "bg-neutralSoft",
    text: "text-neutral",
    label: "Inactive",
  },
  lost: {
    bg: "bg-neutralSoft",
    text: "text-text",
    label: "Lost",
  },
};

export function StatusPill({ status }: { status: KeyStatus }) {
  const styles = statusStyles[status];

  return (
    <View className={`self-start rounded-pill px-3 py-1 ${styles.bg}`}>
      <Text className={`text-xs font-semibold ${styles.text}`}>
        {styles.label}
      </Text>
    </View>
  );
}

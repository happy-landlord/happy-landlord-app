import { Text, View } from "react-native";
import { Button } from "./Button";

type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="rounded-full bg-accentSoft p-5" />

      <Text className="mt-5 text-center text-xl font-bold text-text">
        {title}
      </Text>

      {message ? (
        <Text className="mt-2 text-center text-base text-textMuted">
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          variant="primary"
          className="mt-6"
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

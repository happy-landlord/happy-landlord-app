import { Text, View } from "react-native";
import { Button } from "./Button";

type ErrorStateProps = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-xl font-bold text-text">{title}</Text>
      <Text className="mt-2 text-center text-base text-textMuted">
        {message}
      </Text>

      {onRetry ? (
        <Button
          title={retryLabel}
          variant="outline"
          className="mt-6"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

import { ActivityIndicator, Text, View } from "react-native";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator />
      <Text className="mt-3 text-base text-textMuted">{message}</Text>
    </View>
  );
}

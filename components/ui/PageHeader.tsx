import { Text, View } from "react-native";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <View className="mb-5 flex-row items-start justify-between gap-4">
      <View className="flex-1">
        <Text className="text-3xl font-bold text-text">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-base text-textMuted">{subtitle}</Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}

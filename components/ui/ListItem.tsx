import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View, type PressableProps } from "react-native";

type ListItemProps = PressableProps & {
  title: string;
  subtitle?: string;
  rightText?: string;
  showChevron?: boolean;
};

export function ListItem({
  title,
  subtitle,
  rightText,
  showChevron = true,
  className = "",
  ...props
}: ListItemProps) {
  return (
    <Pressable
      className={`flex-row items-center justify-between rounded-xl border border-border bg-surface p-4 ${className}`}
      {...props}
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-text">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-textMuted">{subtitle}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        {rightText ? (
          <Text className="text-sm text-textMuted">{rightText}</Text>
        ) : null}
        {showChevron ? <ChevronRight size={18} color="#746B5D" /> : null}
      </View>
    </Pressable>
  );
}

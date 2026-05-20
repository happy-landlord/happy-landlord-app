import { Search } from "lucide-react-native";
import { TextInput, View, type TextInputProps } from "react-native";

export function SearchInput({ className = "", ...props }: TextInputProps) {
  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl border border-border bg-surface px-4 ${className}`}
    >
      <Search size={18} color="#746B5D" />

      <TextInput
        placeholderTextColor="#9A9387"
        className="min-h-12 flex-1 text-base text-text"
        {...props}
      />
    </View>
  );
}

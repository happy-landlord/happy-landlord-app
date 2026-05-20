import { Text, TextInput, View, type TextInputProps } from "react-native";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-sm font-medium text-text">{label}</Text>
      ) : null}

      <TextInput
        placeholderTextColor="#9A9387"
        className={`min-h-12 rounded-xl border border-border bg-surface px-4 text-base text-text ${
          error ? "border-danger" : ""
        } ${className}`}
        {...props}
      />

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}

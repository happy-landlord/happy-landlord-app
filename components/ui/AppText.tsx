import { Text, type TextProps } from "react-native";

type AppTextProps = TextProps & {
  variant?: "title" | "subtitle" | "body" | "caption";
};

export function AppText({
  variant = "body",
  className = "",
  ...props
}: AppTextProps) {
  const variantClass = {
    title: "text-2xl font-bold text-text",
    subtitle: "text-lg font-semibold text-text",
    body: "text-base text-text",
    caption: "text-sm text-textMuted",
  }[variant];

  return <Text className={`${variantClass} ${className}`} {...props} />;
}

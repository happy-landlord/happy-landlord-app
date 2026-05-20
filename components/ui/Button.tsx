import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger";

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  outline: "border border-border bg-transparent",
  ghost: "bg-transparent",
  danger: "bg-danger",
};

const textVariants: Record<ButtonVariant, string> = {
  primary: "text-textInverse",
  accent: "text-text",
  outline: "text-text",
  ghost: "text-primary",
  danger: "text-textInverse",
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`min-h-12 items-center justify-center rounded-pill px-5 py-3 ${
        variants[variant]
      } ${isDisabled ? "opacity-50" : "opacity-100"} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className={`text-base font-semibold ${textVariants[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

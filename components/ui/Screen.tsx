import { View, type ViewProps } from "react-native";

type ScreenProps = ViewProps & {
  padded?: boolean;
};

export function Screen({
  padded = true,
  className = "",
  ...props
}: ScreenProps) {
  return (
    <View
      className={`flex-1 bg-background ${padded ? "px-5 pt-6" : ""} ${className}`}
      {...props}
    />
  );
}

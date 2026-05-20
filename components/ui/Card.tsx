import { View, type ViewProps } from "react-native";

type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ padded = true, className = "", ...props }: CardProps) {
  return (
    <View
      className={`rounded-card border border-border bg-surface ${
        padded ? "p-4" : ""
      } ${className}`}
      {...props}
    />
  );
}

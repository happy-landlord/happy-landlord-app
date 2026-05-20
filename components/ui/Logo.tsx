import Svg, { G, Path, Rect } from "react-native-svg";
import { type ViewStyle } from "react-native";

type LogoProps = {
  size?: number;
  style?: ViewStyle;
};

/**
 * Happy Landlord logo — inline react-native-svg component derived from assets/logo.svg.
 * Yellow square background with dark charcoal house/key icon.
 */
export function Logo({ size = 60, style }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" style={style}>
      {/* Yellow background */}
      <Rect width="60" height="60" fill="#E6CD2E" />
      <G>
        {/* Outer circle arc */}
        <Path
          fill="#221617"
          d="M44.68,30.01c-.36.04-.61.37-.57.72.07.63.11,1.19.11,1.7,0,7.91-6.44,14.35-14.35,14.35s-14.35-6.44-14.35-14.35c0-.52.04-1.08.11-1.7.04-.36-.21-.68-.57-.72-.35-.04-.68.21-.72.57-.08.68-.12,1.28-.12,1.85,0,8.63,7.02,15.65,15.65,15.65s15.65-7.02,15.65-15.65c0-.57-.04-1.17-.12-1.85-.04-.36-.36-.61-.72-.57Z"
        />
        {/* House/key shape */}
        <Path
          fill="#221617"
          d="M46.79,28.31L29.99,11.51l-10.66,10.66v-6.24c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5,1.5v9.24l-3.12,3.12c-.3.3-.3.77,0,1.06.29.3.76.3,1.06,0l2.16-2.16,2.9-2.9,10.66-10.66,15.74,15.74c.15.15.34.22.53.22s.38-.07.53-.22c.29-.29.29-.76,0-1.06Z"
        />
      </G>
    </Svg>
  );
}

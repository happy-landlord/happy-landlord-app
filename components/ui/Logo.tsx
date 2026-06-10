import Svg, { G, Path } from "react-native-svg";
import { type ViewStyle } from "react-native";

import { theme } from "@/constants";

type LogoProps = {
  size?: number;
  style?: ViewStyle;
};

/**
 * Happy Landlord logo — inline react-native-svg component derived from assets/logo.svg.
 * House silhouette with a golden arc, on a transparent background.
 *
 * Colours follow the app theme:
 *   • House path  → theme.colors.text        (near-black)
 *   • Arc path    → theme.colors.primary     (golden yellow)
 */
export function Logo({ size = 60, style }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1100 1100" style={style}>
      <G>
        {/* House / key silhouette */}
        <Path
          fill={theme.colors.text}
          d="M635.6,106.8c10.1,3.2,19.8,12,27.8,19.8,139.1,138.8,281,277.1,415.6,420,9.2,14.4,4.8,35.6-12.8,39.4-21.1,3.8-36.9-16.8-50.7-30.2-122.5-125.7-245.5-251.1-370.2-374.5-6.4-5.3-12.9-8.4-19.3-8-6.1.3-12.3,3.7-18.3,8.9-127.7,128.2-254.1,257.8-379.6,388.1-10.9,10.9-26.6,24.2-42.3,16.7-13.9-6.7-13.6-25.2-5.5-36.6,14.3-20.9,34.1-37.6,51-56.4,12.5-12.9,25.5-25.1,30.6-42.3,8.5-59.6.5-121.3,2.5-181.5.5-19.9-2.9-41.8,6.1-60.3,7.1-14.6,25.7-21.4,40.1-13.8,13.2,6.8,17.7,22.2,18.7,36.1,1.7,40.4,0,80.8,0,121.3.6,7.5-1.9,24.8,7.5,25.9,5.1-.2,12.9-8.4,17.5-13.1,76.6-80.3,161.4-166.2,240.7-245.3,10.9-10.3,25.3-19.9,40.6-14.5h.2Z"
        />
        {/* Golden arc */}
        <Path
          fill={theme.colors.primary}
          d="M244.3,634.1c11.8,13.8,5.7,33.7,7.4,50.4,1,44.7,10.5,89.9,29.1,130.6,126.1,296.4,564,298.2,693.1,3.2,23.7-48.5,32-103.5,31.5-157.1.1-9.1-.9-18.6,5.9-25.8,17.5-15.9,41.7-4,39.2,20.3,6.3,135.4-60.1,269.6-170.6,347.9-224.1,165.4-566.8,65.4-653.6-202.9-17.3-47.8-21.4-98.6-21-149.1.3-20.9,23-30,39-17.4Z"
        />
      </G>
    </Svg>
  );
}

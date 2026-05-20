export const theme = {
  colors: {
    // Happy Landlord brand
    bronze: "#A38449",
    gold: "#E6CD2E",
    charcoal: "#262626",

    // App base
    background: "#FAF9F5",
    surface: "#FFFFFF",
    surfaceWarm: "#FFFCF5",
    border: "#E5DDCE",

    // Text
    text: "#262626",
    textMuted: "#746B5D",
    textLight: "#9A9387",
    textInverse: "#FFFFFF",

    // Brand actions
    primary: "#A38449",
    primaryDark: "#7E6638",
    primarySoft: "#F2E9D7",

    accent: "#E6CD2E",
    accentDark: "#BFA91F",
    accentSoft: "#FBF7D6",

    // Status
    success: "#2F7D5C",
    successSoft: "#E7F3ED",

    warning: "#B9821F",
    warningSoft: "#FFF3D8",

    danger: "#B94747",
    dangerSoft: "#FBEAEA",

    info: "#3E6F8F",
    infoSoft: "#E8F1F6",

    neutral: "#746B5D",
    neutralSoft: "#F0EDE7",

    // Key statuses
    keyAvailable: "#2F7D5C",
    keyCheckedOut: "#B9821F",
    keyBooked: "#3E6F8F",
    keyOverdue: "#B94747",
    keyInactive: "#9A9387",
    keyLost: "#262626",
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    card: 22,
    pill: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    screen: 20,
  },
} as const;

export const Colors = {
  light: {
    tint: theme.colors.primary,
  },
  dark: {
    tint: theme.colors.accent,
  },
} as const;

export type Theme = typeof theme;

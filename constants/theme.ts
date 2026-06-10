export const theme = {
  colors: {
    // ── Brand ────────────────────────────────────────────────────────────────
    /** Golden yellow – main brand / CTA colour */
    primary: "#E5C229", //FDC107
    /** Darker shade of primary (hover / pressed ~25%) */
    primaryDark: "#C99706",
    /** Mid tint of primary */
    primaryLight: "#FED54A",
    /** Very pale primary tint (backgrounds, tags) */
    primarySoft: "#FEF3C2",
    /** Text / icons placed on a primary-coloured surface */
    primaryText: "#111111",

    /** Dark charcoal – secondary / accent colour */
    accent: "#3A3A3A",
    /** Deeper charcoal (pressed state) */
    accentDark: "#1E1E1E",
    /** Mid charcoal (secondary text, icons) */
    accentLight: "#5C5C5C",
    /** Near-white charcoal tint (subtle backgrounds) */
    accentSoft: "#EBEBEB",

    // ── App base ─────────────────────────────────────────────────────────────
    /** Warm off-white page background */
    background: "#F8F6F1",
    /** Pure white card / sheet surface */
    surface: "#FFFFFF",
    /** Warm white (e.g. modals, elevated cards) */
    surfaceWarm: "#FFFDF8",
    /** Subtle warm-gray divider / border */
    border: "#E4DFCE",
    /** Stronger border / separator */
    borderStrong: "#C8C0AE",

    // ── Text ─────────────────────────────────────────────────────────────────
    /** Primary text (near-black) */
    text: "#1A1A1A",
    /** Secondary / muted text */
    textMuted: "#6B6560",
    /** Placeholder / disabled text */
    textLight: "#9E9890",
    /** Text on dark surfaces */
    textInverse: "#FFFFFF",

    // ── Semantic status ───────────────────────────────────────────────────────
    success: "#2A7A55",
    successSoft: "#E4F2EC",

    warning: "#C07A18",
    warningSoft: "#FFF1D6",

    danger: "#C03838",
    dangerSoft: "#FCEAEA",

    info: "#2F6A99",
    infoSoft: "#E3EFF7",

    neutral: "#6B6560",
    neutralSoft: "#EDEAE4",

    // ── Key statuses ─────────────────────────────────────────────────────────
    keyAvailable: "#2A7A55",
    keyCheckedOut: "#C07A18",
    keyBooked: "#2F6A99",
    keyOverdue: "#C03838",
    keyInactive: "#9E9890",
    keyLost: "#3A3A3A",
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

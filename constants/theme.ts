export const theme = {
  colors: {
    // ── Brand ────────────────────────────────────────────────────────────────
    /** Primary yellow – main brand / CTA colour */
    primary: "#F9D54B",
    /** Darker shade of primary (pressed / hover) */
    primaryDark: "#C9A200",
    /** Mid tint of primary */
    primaryLight: "#FBE07A",
    /** Very pale primary tint (backgrounds, tags) */
    primarySoft: "#FFF8DC",
    /** Text / icons placed on a primary-coloured surface */
    primaryText: "#3D3530",

    /** Dark charcoal – secondary / accent colour */
    accent: "#3D3530",
    /** Deeper charcoal (pressed state) */
    accentDark: "#2B2B2B",
    /** Mid charcoal / icon stroke */
    accentLight: "#6D645B",
    /** Warm off-white tint – icon background, subtle fills */
    accentSoft: "#F4F1EB",

    // ── App base ─────────────────────────────────────────────────────────────
    /** Warm off-white page background */
    background: "#F8F6F2",
    /** Pure white card / sheet surface */
    surface: "#FFFFFF",
    /** Warm off-white elevated surface (modals, sheets) */
    surfaceWarm: "#F4F1EB",
    /** Subtle warm divider / border */
    border: "#E1D9CA",
    /** Stronger border / separator */
    borderStrong: "#C8BFB0",

    // ── Text ─────────────────────────────────────────────────────────────────
    /** Primary text */
    text: "#2B2B2B",
    /** Secondary / muted text */
    textMuted: "#7B756D",
    /** Placeholder / hint text */
    textLight: "#8A837B",
    /** Text on dark surfaces */
    textInverse: "#FFFFFF",
    /** Disabled control text (lighter than placeholder) */
    textDisabled: "#B8B8B8",

    // ── Semantic status ───────────────────────────────────────────────────────
    /** Available – warm olive */
    success: "#4F7A4A",
    successSoft: "#E8F2EA",

    /** Checked out – warm amber */
    warning: "#A06A00",
    warningSoft: "#FFF0C7",

    /** Overdue – warm red */
    danger: "#B64242",
    dangerSoft: "#FBE3E3",

    /** With tenant – warm brown */
    info: "#7A6347",
    infoSoft: "#E8E1D4",

    /** Lost / neutral – warm gray-brown */
    neutral: "#75695D",
    neutralSoft: "#ECE7E1",

    // ── Key statuses ─────────────────────────────────────────────────────────
    keyAvailable: "#4F7A4A",
    keyAvailableSoft: "#E8F2EA",
    keyCheckedOut: "#A06A00",
    keyCheckedOutSoft: "#FFF0C7",
    keyTenant: "#7A6347",
    keyTenantSoft: "#E8E1D4",
    keyOverdue: "#B64242",
    keyOverdueSoft: "#FBE3E3",
    keyInactive: "#8A837B",
    keyInactiveSoft: "#F2F0EC",
    keyLost: "#75695D",
    keyLostSoft: "#ECE7E1",
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        bronze: "#A38449",
        gold: "#E6CD2E",
        charcoal: "#262626",

        // App surfaces
        background: "#FAF9F5",
        surface: "#FFFFFF",
        surfaceWarm: "#FFFCF5",
        surfaceMuted: "#F7F3EA",
        border: "#E5DDCE",
        borderStrong: "#D2C4AA",

        // Text
        text: "#262626",
        textMuted: "#746B5D",
        textLight: "#9A9387",
        textInverse: "#FFFFFF",

        // Brand actions
        primary: "#A38449",
        primaryDark: "#7E6638",
        primaryLight: "#C3AA70",
        primarySoft: "#F2E9D7",

        accent: "#E6CD2E",
        accentDark: "#BFA91F",
        accentLight: "#F4E678",
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

        // Key-management statuses
        keyAvailable: "#2F7D5C",
        keyCheckedOut: "#B9821F",
        keyBooked: "#3E6F8F",
        keyOverdue: "#B94747",
        keyInactive: "#9A9387",
        keyLost: "#262626",
      },

      borderRadius: {
        card: "22px",
        pill: "999px",
      },

      boxShadow: {
        card: "0 8px 24px rgba(38, 38, 38, 0.08)",
        soft: "0 4px 14px rgba(38, 38, 38, 0.06)",
      },
    },
  },
  plugins: [],
};

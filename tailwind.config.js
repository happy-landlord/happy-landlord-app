/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#3C8D7A",
        secondary: "#4B5C77",
        accent: "#FFC857",
        background: "#F9FAFB",
        text: "#2D2D2D",
        muted: "#AEB4BE",
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        kanit: ["Kanit_400Regular", "sans-serif"],
        "kanit-light": ["Kanit_300Light", "sans-serif"],
        "kanit-medium": ["Kanit_500Medium", "sans-serif"],
        "kanit-semibold": ["Kanit_600SemiBold", "sans-serif"],
        "kanit-bold": ["Kanit_700Bold", "sans-serif"],
        sans: ["Kanit_400Regular", "sans-serif"],
      },
    },
  },
  plugins: [],
};

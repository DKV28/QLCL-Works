import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2158E6",
          dark: "#1B2A6B",
          light: "#29B6F6",
        },
        accent: {
          DEFAULT: "#F7941D",
          dark: "#E07E0A",
        },
      },
    },
  },
  plugins: [],
};

export default config;

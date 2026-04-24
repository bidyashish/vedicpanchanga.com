import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        deva: ['"Tiro Devanagari Hindi"', '"Noto Serif Devanagari"', "serif"],
      },
      colors: {
        parchment: {
          50: "#FCFAF5",
          100: "#F4F1E8",
          200: "#E3D5C1",
          300: "#C9B89D",
        },
        crimson: {
          DEFAULT: "#993D2E",
          dark: "#7A2E22",
          light: "#B05543",
        },
        saffron: {
          DEFAULT: "#B26329",
          light: "#CC7B45",
        },
        gold: {
          DEFAULT: "#C5A059",
          dark: "#9A7B3D",
          light: "#E3D5C1",
        },
        ink: {
          DEFAULT: "#2C241B",
          soft: "#635647",
          muted: "#8A7E6D",
        },
        leaf: {
          DEFAULT: "#1B5E20",
          light: "#2F7D32",
        },
      },
      maxWidth: {
        "screen-3xl": "1792px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(44, 36, 27, 0.04), 0 4px 12px rgba(44, 36, 27, 0.04)",
        lift: "0 8px 30px rgba(44, 36, 27, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

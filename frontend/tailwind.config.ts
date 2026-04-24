import type { Config } from "tailwindcss";

// Helper: build a Tailwind color value backed by a CSS rgb-channel variable
// (e.g. `--text-rgb: 15 23 42;`). Letting Tailwind insert the alpha keeps
// modifiers like `bg-saffron/10` working in both themes.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Manrope", "Hind", "ui-sans-serif", "system-ui", "sans-serif"],
        deva: ['"Tiro Devanagari Hindi"', '"Noto Serif Devanagari"', "Hind", "serif"],
        devaBody: ["Hind", '"Noto Serif Devanagari"', '"Tiro Devanagari Hindi"', "sans-serif"],
      },
      colors: {
        // Brand scale — Pumpkin Spice. Use these directly when you want the
        // raw shade regardless of light/dark mode.
        pumpkin: {
          50:  "#fff0e5",
          100: "#ffe0cc",
          200: "#ffc299",
          300: "#ffa366",
          400: "#ff8533",
          500: "#ff6600",
          600: "#cc5200",
          700: "#993d00",
          800: "#662900",
          900: "#331400",
          950: "#240e00",
        },
        // Surface tier — names retained for compatibility with existing JSX,
        // but values now come from theme variables.
        parchment: {
          50: v("--surface-rgb"),
          100: v("--surface-soft-rgb"),
          200: v("--border-rgb"),
          300: v("--border-strong-rgb"),
        },
        // Primary accent — single Cloudflare-style blue (was saffron/crimson)
        crimson: {
          DEFAULT: v("--primary-rgb"),
          dark: v("--primary-hover-rgb"),
          light: v("--primary-soft-rgb"),
        },
        saffron: {
          DEFAULT: v("--primary-rgb"),
          light: v("--primary-soft-rgb"),
        },
        gold: {
          DEFAULT: v("--text-muted-rgb"),
          dark: v("--text-soft-rgb"),
          light: v("--surface-soft-rgb"),
        },
        indigo: {
          DEFAULT: v("--accent-moon-rgb"),
          dark: v("--accent-moon-rgb"),
          soft: v("--primary-soft-rgb"),
        },
        ink: {
          DEFAULT: v("--text-rgb"),
          soft: v("--text-soft-rgb"),
          muted: v("--text-muted-rgb"),
        },
        leaf: {
          DEFAULT: v("--success-rgb"),
          light: v("--success-rgb"),
        },
        rose: {
          DEFAULT: v("--danger-rgb"),
        },
      },
      maxWidth: {
        "screen-3xl": "1792px",
      },
      borderRadius: {
        "2xs": "3px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        glow: "0 0 0 3px rgb(var(--primary-rgb) / 0.18)",
      },
      // Semantic font scale — every component should reach for one of
      // these instead of `text-[Npx]`. Each entry is [size, line-height].
      fontSize: {
        micro:   ["10px", { lineHeight: "1.4",  letterSpacing: "0.04em" }],
        tiny:    ["11px", { lineHeight: "1.4" }],
        mini:    ["12px", { lineHeight: "1.45" }],
        meta:    ["13px", { lineHeight: "1.5" }],
        body:    ["14px", { lineHeight: "1.55" }],
        lead:    ["15px", { lineHeight: "1.55" }],
        title:   ["18px", { lineHeight: "1.35" }],
        heading: ["22px", { lineHeight: "1.25" }],
        display: ["28px", { lineHeight: "1.15" }],
      },
      letterSpacing: {
        eyebrow: "0.1em",
      },
    },
  },
  plugins: [],
} satisfies Config;

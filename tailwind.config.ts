import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f6feb",
          dark: "#1a5fce",
        },
        bg: "#f6f7f9",
        panel: "#ffffff",
        ink: "#0f172a",
        muted: "#667085",
        line: "#d7dce3",
        accent: {
          DEFAULT: "#1f6feb",
          dark: "#1a5fce",
        },
        warn: "#b45309",
        danger: "#b91c1c",
        ok: "#15803d",
      },
      boxShadow: {
        "paper-edge": "0 5px 22px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

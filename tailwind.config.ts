
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        foreground: "#f8fafc",
        muted: "#94a3b8",
        border: "#334155",
        danger: "#f87171",
        success: "#34d399",
        warning: "#fbbf24",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;


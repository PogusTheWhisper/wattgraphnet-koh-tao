import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#060a17",
          panel: "#0c1426",
          panel2: "#121d36",
          border: "#1b2a4a",
          accent: "#38bdf8", // sky-400
          accent2: "#a78bfa", // violet-400
          success: "#34d399",
          warn: "#fbbf24",
          danger: "#f87171",
          muted: "#64748b",
          text: "#e2e8f0",
        },
        pea: {
          purple: "#6D3B9E",
          gold: "#FFB71C",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "var(--font-thai)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
        thai: ["var(--font-thai)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(56, 189, 248, 0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 16s linear infinite",
        "flow": "flow 3s ease-in-out infinite",
      },
      keyframes: {
        flow: {
          "0%, 100%": { strokeDashoffset: "0" },
          "50%": { strokeDashoffset: "-20" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

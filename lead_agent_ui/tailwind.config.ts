import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        card: "#111111",
        border: "#262626",
        foreground: "#FAFAFA",
        muted: "#A3A3A3",
        accent: "#6366F1",
        success: "#22C55E",
        warning: "#F59E0B"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(99,102,241,0.35), 0 10px 35px rgba(99,102,241,0.18)"
      },
      borderRadius: {
        xl2: "1rem"
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 40%), radial-gradient(circle at top left, rgba(124,58,237,0.14), transparent 38%)"
      }
    }
  },
  plugins: []
};

export default config;

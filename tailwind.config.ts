import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta principal SM Hub — gradiente de azul royal → marinho
        royal: {
          50: "#EEF1FF",
          100: "#D9DEFF",
          200: "#B0BBFF",
          300: "#8797FF",
          400: "#5E74FF",
          500: "#3D5AFE", // primária
          600: "#2D44D6",
          700: "#1F30AD",
          800: "#152285",
          900: "#0D1759",
          950: "#0A1A40", // secundária
        },
        // Escala "navy" — base do dark mode
        navy: {
          50: "#E6E9F2",
          100: "#C2C8DD",
          200: "#8590B5",
          300: "#475581",
          400: "#1F2D52",
          500: "#0F172A", // surface
          600: "#0B1224",
          700: "#080E1C",
          800: "#060A14",
          900: "#03060D",
          950: "#0A1A40",
        },
        // Backgrounds semânticos
        bg: {
          DEFAULT: "#0A1A40",
          surface: "#0F172A",
          elevated: "#131C36",
          muted: "#1A2547",
        },
        border: {
          DEFAULT: "#1E2A52",
          muted: "#15234A",
        },
        // Acentos semânticos (mantidos para badges, status etc.)
        accent: {
          500: "#22D3EE",
          600: "#06B6D4",
          700: "#0891B2",
        },
        success: {
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
        },
        warning: {
          400: "#FACC15",
          500: "#EAB308",
          600: "#CA8A04",
        },
        danger: {
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-royal": "linear-gradient(135deg, #3D5AFE 0%, #0A1A40 100%)",
        "gradient-royal-soft":
          "linear-gradient(135deg, rgba(61,90,254,0.18) 0%, rgba(10,26,64,0.10) 100%)",
        "gradient-radial":
          "radial-gradient(circle at top left, rgba(61,90,254,0.18), transparent 50%)",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.25)",
        card: "0 4px 20px rgba(0, 0, 0, 0.30)",
        elevated: "0 8px 30px rgba(0, 0, 0, 0.45)",
        glow: "0 0 0 4px rgba(61, 90, 254, 0.18)",
        ring: "0 0 0 1px rgba(61, 90, 254, 0.35)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 240ms ease-out both",
        "scale-in": "scale-in 180ms ease-out both",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

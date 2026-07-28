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
        // Paleta principal SM Hub — violeta / lavanda / neon.
        // No dark fica neon/roxo; no claro vira violeta sólido e legível.
        royal: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          150: "rgb(var(--royal-150) / <alpha-value>)",
          200: "rgb(var(--royal-200) / <alpha-value>)",
          250: "rgb(var(--royal-250) / <alpha-value>)",
          300: "rgb(var(--royal-300) / <alpha-value>)",
          400: "rgb(var(--royal-400) / <alpha-value>)",
          500: "#7C3AED", // primária (violet-600)
          550: "#6D28D9",
          600: "#5B21B6",
          700: "#4C1D95",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Escala "navy" — base do dark mode (fria, quase preta azulada)
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
          950: "#02040A",
        },
        // Backgrounds semânticos — flipam com o tema via CSS vars (canais RGB).
        // rgb(var(--token) / <alpha-value>) permite bg-bg/80, bg-bg-elevated/60 etc.
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--bg-surface) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          muted: "rgb(var(--bg-muted) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          muted: "rgb(var(--border-muted) / <alpha-value>)",
        },
        // slate 100..500 flipam com o tema (text principal).
        // 50 e 600..950 permanecem os defaults do Tailwind (usados em superfícies
        // explicitamente claras: print views, cards brancos).
        slate: {
          100: "rgb(var(--slate-100) / <alpha-value>)",
          200: "rgb(var(--slate-200) / <alpha-value>)",
          300: "rgb(var(--slate-300) / <alpha-value>)",
          400: "rgb(var(--slate-400) / <alpha-value>)",
          500: "rgb(var(--slate-500) / <alpha-value>)",
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
        "gradient-royal": "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #1E1B4B 100%)",
        "gradient-royal-soft":
          "linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(124,58,214,0.12) 50%, rgba(30,27,75,0.08) 100%)",
        "gradient-radial":
          "radial-gradient(circle at top left, rgba(139,92,246,0.20), transparent 50%)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        glow: "0 0 0 4px rgba(139, 92, 246, 0.22)",
        ring: "0 0 0 1px rgba(139, 92, 246, 0.40)",
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
        "logo-in": {
          "0%": { opacity: "0", transform: "scale(0.7) translateY(10px)" },
          "60%": { opacity: "1", transform: "scale(1.04) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "logo-float": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        // Micro-interações (menos "cara de IA") ---------------------------
        "icon-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.18) rotate(-4deg)" },
          "100%": { transform: "scale(1)" },
        },
        "icon-bob": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "icon-wiggle": {
          "0%,100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-10deg)" },
          "75%": { transform: "rotate(10deg)" },
        },
        "float-slow": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(2%, -3%) scale(1.04)" },
          "66%": { transform: "translate(-2%, 2%) scale(0.98)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(139,92,246,0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(139,92,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0)" },
        },
        "shine-sweep": {
          "0%": { transform: "translateX(-130%) skewX(-12deg)" },
          "100%": { transform: "translateX(130%) skewX(-12deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 240ms ease-out both",
        "scale-in": "scale-in 180ms ease-out both",
        "shimmer": "shimmer 2s linear infinite",
        "logo-in": "logo-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "logo-float": "logo-float 4s ease-in-out infinite",
        // Micro-interações ------------------------------------------------
        "icon-pop": "icon-pop 0.5s ease both",
        "icon-bob": "icon-bob 1.4s ease-in-out infinite",
        "icon-wiggle": "icon-wiggle 0.5s ease-in-out both",
        "float-slow": "float-slow 18s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "shine-sweep": "shine-sweep 0.9s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

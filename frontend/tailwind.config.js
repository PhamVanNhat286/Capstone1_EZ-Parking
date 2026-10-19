/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        primary: "#1d4ed8", // blue-700
        secondary: "#10b981", // emerald-500
        dark: "#0f172a", // slate-900
        danger: "#ef4444", // red-500
        warning: "#f59e0b", // amber-500
        navy: {
          800: "#1E293B",
          900: "#0F172A",
          950: "#0A0F1D",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          blue: "#2563EB",
          sky: "#38BDF8",
          green: "#16A34A",
          yellow: "#EAB308",
          red: "#EF4444",
        },
        status: {
          free: "#22C55E",
          holding: "#FACC15",
          occupied: "#EF4444",
        },
      },
      animation: {
        blob: "blob 10s infinite",
        float: "float 6s ease-in-out infinite",
        "car-loop": "carRoute 7s ease-in-out infinite",
        "spot-occupy": "spotStatus 7s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-slide": "fadeSlide 0.35s ease-out forwards",
        "pulse-radar": "pulseRadar 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite",
        "dash-move": "dashMove 1.2s linear infinite",
        "bell-wiggle": "bellWiggle 3.5s ease-in-out infinite",
        "glow-breath": "glowBreath 2.8s ease-in-out infinite",
        "fade-up": "fadeUp 0.3s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
        "orb-float": "orbFloat 6s ease-in-out infinite",
        "orb-pulse": "orbPulse 3s ease-in-out infinite",
        "bounce-dot1": "dotJump 1.2s infinite ease-in-out 0s",
        "bounce-dot2": "dotJump 1.2s infinite ease-in-out 0.2s",
        "bounce-dot3": "dotJump 1.2s infinite ease-in-out 0.4s",
      },
      keyframes: {
        orbFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-8px) scale(1.03)" },
        },
        orbPulse: {
          "0%, 100%": { boxShadow: "0 0 25px 8px rgba(37, 99, 235, 0.25)" },
          "50%": { boxShadow: "0 0 45px 18px rgba(37, 99, 235, 0.45)" },
        },
        dotJump: {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        pulseRadar: {
          "0%": { transform: "scale(0.8)", opacity: "0.85" },
          "70%": { transform: "scale(2.6)", opacity: "0" },
          "100%": { transform: "scale(2.6)", opacity: "0" },
        },
        dashMove: {
          to: { strokeDashoffset: "-20" },
        },
        bellWiggle: {
          "0%, 85%, 100%": { transform: "rotate(0deg)" },
          "88%": { transform: "rotate(-14deg)" },
          "92%": { transform: "rotate(12deg)" },
          "96%": { transform: "rotate(-8deg)" },
          "98%": { transform: "rotate(4deg)" },
        },
        glowBreath: {
          "0%, 100%": { boxShadow: "0 8px 24px -4px rgba(37, 99, 235, 0.45)" },
          "50%": { boxShadow: "0 12px 32px 0px rgba(37, 99, 235, 0.75)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(25px, -30px) scale(1.15)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        carRoute: {
          "0%": { transform: "translate(20px, 34px) rotate(0deg)", opacity: "0" },
          "10%": { transform: "translate(45px, 34px) rotate(0deg)", opacity: "1" },
          "45%": { transform: "translate(150px, 34px) rotate(0deg)", opacity: "1" },
          "55%": { transform: "translate(175px, 34px) rotate(45deg)", opacity: "1" },
          "70%": { transform: "translate(196px, 16px) rotate(90deg)", opacity: "1" },
          "85%": { transform: "translate(196px, 16px) rotate(90deg)", opacity: "1" },
          "95%": { transform: "translate(196px, 16px) rotate(90deg)", opacity: "0" },
          "100%": { transform: "translate(20px, 34px) rotate(0deg)", opacity: "0" },
        },
        spotStatus: {
          "0%, 65%": { borderColor: "#16A34A", backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#15803D" },
          "70%, 90%": { borderColor: "#DC2626", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#B91C1C" },
          "95%, 100%": { borderColor: "#16A34A", backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#15803D" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeSlide: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

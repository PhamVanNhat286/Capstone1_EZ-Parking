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
      colors: {
        primary: "#1d4ed8", // blue-700
        secondary: "#10b981", // emerald-500
        dark: "#0f172a", // slate-900
        danger: "#ef4444", // red-500
        warning: "#f59e0b", // amber-500
      },
    },
  },
  plugins: [],
};

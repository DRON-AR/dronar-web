import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aero: {
          950: "#050b14",
          900: "#0a1628",
          700: "#12345c",
          500: "#1e6fb8",
          300: "#7fc4ff",
        },
        // Ver docs/DESIGN_NOTES.md — vocabulario de horizonte artificial
        ground: "#8a5a2b",
        signal: "#e8b34a",
        mist: "#c9d9ec",
        nogo: "#e2543f",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

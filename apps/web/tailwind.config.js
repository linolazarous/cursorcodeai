/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Ensures dark theme by default (matches your video)
  theme: {
    extend: {
      colors: {
        // Logo + Storyboard inspired palette
        brand: {
          blue: "#1E88E5",        // Main logo blue
          dark: "#0A0A0A",        // Video background
          card: "#111827",        // UI panels in storyboard
          glow: "#67E8F9",        // Neon node glow
          neon: "#22D3EE",        // Cyber accents
          border: "#334155",
        },
        // shadcn-style neutral palette (dark mode)
        background: "#0A0A0A",
        foreground: "#F1F5F9",
        card: "#111827",
        "card-foreground": "#F1F5F9",
        popover: "#111827",
        "popover-foreground": "#F1F5F9",
        primary: {
          DEFAULT: "#1E88E5",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#334155",
          foreground: "#E2E8F0",
        },
        accent: {
          DEFAULT: "#67E8F9",
          foreground: "#0F172A",
        },
        muted: "#1E2937",
        "muted-foreground": "#94A3B8",
        border: "#334155",
        input: "#1E2937",
        ring: "#1E88E5",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "sans-serif"], // Futuristic headings (logo + ad style)
        mono: ["JetBrains Mono", "monospace"],     // Code snippets in demo
      },

      boxShadow: {
        "neon-blue": "0 0 20px -5px #67E8F9, 0 0 40px -10px #1E88E5",
        "logo-glow": "0 0 30px rgba(30, 136, 229, 0.6)",
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(circle at center, #1E88E5 0%, transparent 70%)",
        "storyboard-grid": "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

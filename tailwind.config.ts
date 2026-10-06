import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System tokens (06-design-system.md §2.1)
        cream: "#FBF6ED",
        paper: "#FFFFFF",
        ink: "#2B2622",
        "ink-muted": "#93897C",
        amber: "#E8743B",
        "amber-soft": "#FBE4D6",
        honey: "#F2B544",
        "honey-soft": "#FCEFD2",
        sage: "#6F9B7D",
        "sage-soft": "#E3EFE7",
        clay: "#ECE3D3",
        "clay-dark": "#DCD0BB",
        rust: "#C0524A",
        "rust-soft": "#F7E2DE",
      },
      fontFamily: {
        // Typography (06-design-system.md §3.1)
        display: ["Plus Jakarta Sans", ...defaultTheme.fontFamily.sans],
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: ["JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        // Typographic scale (06-design-system.md §3.2)
        "display": ["24px", { lineHeight: "1.2", fontWeight: "800" }],
        "title": ["20px", { lineHeight: "1.25", fontWeight: "800" }],
        "heading": ["16px", { lineHeight: "1.3", fontWeight: "700" }],
        "body": ["14px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "600" }],
        "eyebrow": ["11px", { lineHeight: "1.3", fontWeight: "800" }],
        "data": ["12px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      spacing: {
        // Spacing scale (06-design-system.md §4)
        // Uses default Tailwind 4px scale
        // Key values: 3 (12px), 3.5 (14px), 4 (16px), 5 (20px), 6 (24px)
      },
      borderRadius: {
        // Radius scale (06-design-system.md §5)
        sm: "6px",
        md: "10px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        // Shadow/Elevation (06-design-system.md §6)
        sm: "0 1px 3px rgba(43,38,34,0.06)",
        md: "0 2px 8px rgba(43,38,34,0.10)",
        lg: "0 8px 24px rgba(43,38,34,0.16)",
      },
      backgroundColor: {
        // Background utilities
        // Use cream as default app background
        // Use paper for cards
        // Others as per color palette above
      },
      textColor: {
        // Text color utilities
        // Use ink for primary text
        // Use ink-muted for secondary text
      },
    },
  },
  plugins: [],
};

export default config;

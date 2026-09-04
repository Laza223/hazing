import type { Config } from "tailwindcss";

// Tokens de dirección de arte — ver docs/spec/05-direccion-arte.md §3.1
// (RAW EDITORIAL × FUTURE FASHION) y docs/decisions/0003-motion-y-3d.md.
// Escala de grises idéntica a docs/spec/00-handoff.md §8.3. NUNCA agregar
// un color fuera de esta tabla al storefront (regla del brief: monocromo real).
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1600px",
    },
    container: { center: true, padding: "1rem", screens: { "2xl": "1600px" } },
    extend: {
      colors: {
        // Escala semántica del brief — bg-ink, text-ink-2, bg-paper-2, border-line, etc.
        paper: { DEFAULT: "#FFFFFF", 2: "#FAFAFA" },
        line: { DEFAULT: "#D4D4D4", 2: "#EDEDED" },
        mute: "#A3A3A3",
        ink: { DEFAULT: "#171717", 2: "#404040", 3: "#595959", 4: "#737373" },
        // Alias hsl(var(--x)) para Radix/shadcn (admin, Fase 7) — mapeados a la
        // misma escala de arriba en globals.css, no una paleta aparte.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // 0 en imágenes/tiles (default de Tailwind ya es "none"/0), 2px en
        // controles (botones/inputs), 9999px en swatches vía rounded-full.
        control: "2px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        micro: "150ms",
        ui: "250ms",
        overlay: "450ms",
        image: "700ms",
        cinema: "1200ms",
      },
      transitionTimingFunction: {
        ui: "cubic-bezier(0.4, 0, 0.2, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        cinema: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

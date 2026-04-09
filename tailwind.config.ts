import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores institucionales Alzak Foundation
        alzak: {
          blue: "#1a365d",    // Azul profundo corporativo
          gold: "#eab308",    // Dorado/Amarillo de acento
          light: "#f8fafc",   // Gris casi blanco estilo Vercel
          dark: "#0f172a",    // Para textos elegantes
        },
      },
      borderRadius: {
        'apple': '1.25rem',   // Bordes suaves tipo iOS
      },
    },
  },
  plugins: [],
};
export default config;
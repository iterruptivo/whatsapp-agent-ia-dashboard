import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1b967a',
          light: '#22b894',
          dark: '#157a63',
        },
        secondary: {
          DEFAULT: '#192c4d',
          light: '#253d66',
          dark: '#0f1d33',
        },
        accent: {
          DEFAULT: '#fbde17',
          light: '#fce850',
          dark: '#d9bc00',
        },
      },
    },
  },
  plugins: [],
};
export default config;

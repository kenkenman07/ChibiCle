/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Drivoアプリのベースカラーを設定
        primary: {
          DEFAULT: "#006B54",
          light: "#E5F0ED",
          dark: "#004D3C",
        },
        dark: "#1A1A1A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // クリーンな印象にするためInter等を推奨
      },
    },
  },
  plugins: [],
};

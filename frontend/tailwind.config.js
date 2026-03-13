/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Shippori Mincho"', 'serif'],
        sans: ['"Zen Maru Gothic"', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          DEFAULT: '#0f2942',
          light: '#1e3a5f',
        },
        primary: {
          DEFAULT: '#1a56db',
          dark: '#1444b0',
          light: '#e8eefb',
        },
        accent: {
          DEFAULT: '#d97706',
          light: '#fef3c7',
          dark: '#b45309',
        },
        danger: {
          DEFAULT: '#c0392b',
          dark: '#962d23',
          light: '#fde8e8',
        },
        success: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#ecfdf5',
        },
        surface: '#faf9f7',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

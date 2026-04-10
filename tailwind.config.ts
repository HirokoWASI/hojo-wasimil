import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f4f0',
        surface: '#ffffff',
        accent: '#c45c1a',
        'accent-hover': '#a84d16',
        brand: {
          green: '#2d7a47',
          blue: '#1a5fa8',
          red: '#b83232',
          orange: '#c45c1a',
        },
        neutral: {
          50: '#faf9f7',
          100: '#f5f4f0',
          200: '#e8e6e1',
          300: '#d0cdc6',
          400: '#b0ada5',
          500: '#9b9890',
          600: '#7a7770',
          700: '#5a5650',
          800: '#3a3730',
          900: '#1a1814',
        },
      },
      fontFamily: {
        sans: ['Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

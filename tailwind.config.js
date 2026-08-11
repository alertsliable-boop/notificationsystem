/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'signal-blue': '#007aff',
        'ink-black': '#000000',
        'graphite': '#3e3e3e',
        'smoke': '#636363',
        'paper-white': '#ffffff',
        'ash-mist': '#f7f7f7',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'nav': '22px',
        'card': '22px',
        'badge': '50px',
        'button': '50px',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-signal-blue',
    'text-signal-blue',
    'bg-paper-white',
    'bg-ash-mist',
    'text-ink-black',
    'text-graphite',
    'text-smoke',
  ],
}

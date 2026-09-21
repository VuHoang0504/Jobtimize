/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0A66C2',       // LinkedIn Signature Blue
          dark: '#004182',
          light: '#E8F3FF',
          green: '#00B14F',      // TopCV Signature Emerald Green
          greenDark: '#008b3e',
          greenLight: '#E6F8EE',
          purple: '#6366F1',     // AI Accent Purple
          purpleLight: '#EEF2FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 12px 24px -6px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'ai-glow': '0 0 20px rgba(99, 102, 241, 0.2)'
      }
    },
  },
  plugins: [],
}

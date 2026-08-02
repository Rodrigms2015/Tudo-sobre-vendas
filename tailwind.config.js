/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bruto: {
          black: '#0A0A0B',
          carbon: '#121316',
          graphite: '#1C1E23',
          steel: '#2A2D34',
          ash: '#8A9099',
          white: '#F5F6F7',
          yellow: '#F2B705',
          amber: '#D98C00',
          red: '#D64545',
          green: '#3E9E6A',
          blue: '#4A7FB5',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        metric: ['2rem', { lineHeight: '1.1', fontWeight: '700' }],
        'metric-lg': ['2.5rem', { lineHeight: '1.05', fontWeight: '700' }],
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      maxWidth: {
        shell: '1600px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

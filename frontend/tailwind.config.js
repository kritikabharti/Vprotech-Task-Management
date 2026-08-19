/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2F7',
          100: '#D6E0EC',
          200: '#AFC3DA',
          300: '#87A6C7',
          400: '#5F89B5',
          500: '#3D6B9C',
          600: '#2C527D',
          700: '#1E3A5F',
          800: '#152A46',
          900: '#0D1B2E',
        },
        brandGreen: {
          400: '#8FD19E',
          500: '#5CB85C',
          600: '#3F9C4B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(30, 58, 95, 0.08), 0 1px 2px -1px rgba(30, 58, 95, 0.08)',
      },
    },
  },
  plugins: [],
};

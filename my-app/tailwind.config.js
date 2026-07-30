/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#111111',
        surfaceHighlight: '#1f1f1f',
        border: '#2a2a2a',
        primary: '#ffffff',
        secondary: '#a1a1aa',
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(255, 255, 255, 0.1)',
        'glow-strong': '0 0 60px -15px rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}


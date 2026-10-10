/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030712',
          900: '#0a0f1e',
          850: '#0d1528',
          800: '#111827',
          700: '#1a2540',
          600: '#1e2d4a',
          500: '#243356',
        },
        electric: {
          500: '#00ff88',
          400: '#22ffa0',
          300: '#66ffba',
        },
        cyan: {
          accent: '#00d4ff',
          soft: '#67e8f9',
        },
        amber: {
          alert: '#f59e0b',
        },
        rose: {
          alert: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.15)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-red': '0 0 20px rgba(244, 63, 94, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle, rgba(0,212,255,0.05) 1px, transparent 1px)',
        'gradient-card': 'linear-gradient(135deg, rgba(13,21,40,0.95) 0%, rgba(17,24,39,0.98) 100%)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

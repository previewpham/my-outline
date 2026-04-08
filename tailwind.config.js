/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // 다크모드 배경을 네이비 느낌 없이 중립 다크로 오버라이드
        gray: {
          800: '#1e1e1e',
          900: '#141414',
        },
      },
    },
  },
  plugins: [],
}


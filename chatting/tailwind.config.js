/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'dot-pulse': {
          '0%, 80%, 100%': { opacity: 0 },
          '40%': { opacity: 1 },
        },
      },
      animation: {
        'dot-pulse-1': 'dot-pulse 1.4s infinite ease-in-out 0s',
        'dot-pulse-2': 'dot-pulse 1.4s infinite ease-in-out 0.2s',
        'dot-pulse-3': 'dot-pulse 1.4s infinite ease-in-out 0.4s',
      },
    },
  },
  plugins: [],
};

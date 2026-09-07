import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:         '#12161C',
        surface:    '#1B212B',
        surfaceAlt: '#222937',
        amber:      '#E8A33D',
        teal:       '#4FA8A0',
        muted:      '#8A94A6',
        line:       '#2C3542',
      },
      fontFamily: {
        mono:    ["'JetBrains Mono'", 'monospace'],
        display: ["'Space Grotesk'", 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
      gridTemplateColumns: {
        'segment': '280px 1fr',
      },
    },
  },
  plugins: [],
};

export default config;

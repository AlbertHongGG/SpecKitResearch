import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12263a',
        mist: '#edf2f7',
        accent: '#d97706',
      },
    },
  },
  plugins: [],
};

export default config;
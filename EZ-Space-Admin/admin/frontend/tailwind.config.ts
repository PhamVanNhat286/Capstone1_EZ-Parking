import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        page: '#F8FAFC',
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          tint: '#EFF6FF'
        }
      },
      boxShadow: {
        card: '0 2px 5px rgba(15, 23, 42, 0.025)',
        'card-hover': '0 9px 21px rgba(15, 23, 42, 0.055)',
        btn: '0 1px 3px rgba(15, 23, 42, 0.035)'
      }
    }
  },
  plugins: []
};

export default config;


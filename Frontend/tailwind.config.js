/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ONE accent. No gradients. Driven by CSS custom properties (see
        // index.css) so opacity modifiers like bg-primary/20 keep working.
        'base-100': 'rgb(var(--c-bg-0) / <alpha-value>)',
        'base-200': 'rgb(var(--c-bg-1) / <alpha-value>)',
        'base-300': 'rgb(var(--c-bg-2) / <alpha-value>)',
        'base-content': 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        edge: 'rgb(var(--c-border) / <alpha-value>)',
        primary: 'rgb(var(--c-accent) / <alpha-value>)',
        'primary-content': 'rgb(var(--c-on-accent) / <alpha-value>)',
        // secondary intentionally aliases primary — the brief is explicit
        // that a second gradient color is what made this look generated.
        // Kept only so nothing breaks if a stray `text-secondary` remains.
        secondary: 'rgb(var(--c-accent) / <alpha-value>)',
        'secondary-content': 'rgb(var(--c-on-accent) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        neutral: 'rgb(var(--c-bg-2) / <alpha-value>)',
        'neutral-content': 'rgb(var(--c-text) / <alpha-value>)',
        error: 'rgb(var(--c-danger) / <alpha-value>)',
        'error-content': '255 255 255',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // A real hierarchy, not one class reused everywhere:
        // buttons/artwork ~8px, cards ~10px, modals ~14px.
        sm: '5px',
        DEFAULT: '6px',
        md: '8px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '14px',
        full: '9999px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

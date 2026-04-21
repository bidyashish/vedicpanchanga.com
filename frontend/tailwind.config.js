/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                parchment: {
                    50: '#FCFAF5',
                    100: '#F4F1E8',
                    200: '#E3D5C1',
                },
                crimson: {
                    DEFAULT: '#8B1E0F',
                    dark: '#6A160A',
                    light: '#B73A25',
                },
                saffron: {
                    DEFAULT: '#D35400',
                    light: '#E67E22',
                },
                gold: {
                    DEFAULT: '#C5A059',
                    dark: '#9A7B3D',
                },
                ink: {
                    DEFAULT: '#2C241B',
                    soft: '#635647',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

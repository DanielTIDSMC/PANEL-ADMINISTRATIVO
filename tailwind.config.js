/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--background)',
                card: 'var(--card)',
                primary: 'var(--primary)',
                secondary: 'var(--secondary)',
                foreground: 'var(--foreground)',
                border: 'var(--border)',
                'muted-foreground': 'var(--muted-foreground)',
            },
        },
    },
    plugins: [],
}

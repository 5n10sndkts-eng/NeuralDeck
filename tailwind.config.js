
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'void-black': '#050505',
                'electric-cyan': '#00f0ff',
                'acid-purple': '#bc13fe',
                'crimson-red': '#ff003c',
                'terminal-green': '#0aff0a',
                'glass-dark': 'rgba(10, 10, 10, 0.7)',
                'glass-light': 'rgba(255, 255, 255, 0.05)',
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
                display: ['"Orbitron"', '"Exo"', 'sans-serif'],
            },
            animation: {
                'glitch': 'glitch 1s linear infinite',
                'scanline': 'scanline 8s linear infinite',
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                glitch: {
                    '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
                    '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
                    '62%': { transform: 'translate(0,0) skew(5deg)' },
                },
                scanline: {
                    '0%': { backgroundPosition: '0% 0%' },
                    '100%': { backgroundPosition: '0% 100%' },
                }
            },
            boxShadow: {
                'neon-cyan': '0 0 5px #00f0ff, 0 0 10px #00f0ff',
                'neon-purple': '0 0 5px #bc13fe, 0 0 10px #bc13fe',
            }
        },
    },
    plugins: [],
}

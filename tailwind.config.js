/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Base colors (matches CSS variables)
                'void-black': '#050510',
                'electric-cyan': '#00f0ff',
                'acid-purple': '#bc13fe',
                'crimson-red': '#ff003c',
                'terminal-green': '#0aff0a',
                'glass-dark': 'rgba(10, 10, 26, 0.6)',
                'glass-light': 'rgba(255, 255, 255, 0.05)',
                // Cyber theme (unified)
                cyber: {
                    void: '#050510',
                    black: '#050505',
                    dark: '#0a0a0a',
                    panel: '#0f0f14',
                    cyan: '#00f0ff',
                    purple: '#bc13fe',
                    red: '#ff003c',
                    green: '#0aff0a',
                    text: '#e0e0e0',
                    muted: '#8888a0',
                    dim: 'rgba(255,255,255,0.05)',
                    border: 'rgba(255,255,255,0.1)',
                },
                // War Room Theme Colors
                warroom: {
                    void: '#0a0000',
                    black: '#0a0000',
                    dark: '#140505',
                    panel: '#1a0808',
                    primary: '#ff003c',
                    accent: '#ff4500',
                    dim: 'rgba(255,0,60,0.1)',
                    glow: 'rgba(255,0,60,0.5)',
                    border: 'rgba(255,0,60,0.2)',
                },
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
                display: ['"Orbitron"', '"Exo"', 'sans-serif'],
                body: ['"Inter"', 'system-ui', 'sans-serif'],
            },
            spacing: {
                // Standardized spacing scale
                'xs': '0.25rem',  // 4px
                'sm': '0.5rem',   // 8px
                'md': '0.75rem',  // 12px
                'lg': '1rem',     // 16px
                'xl': '1.5rem',   // 24px
                '2xl': '2rem',    // 32px
            },
            borderRadius: {
                'cyber-sm': '0.25rem',  // 4px
                'cyber-md': '0.5rem',   // 8px
                'cyber-lg': '0.75rem',  // 12px
            },
            fontSize: {
                'cyber-xs': ['0.625rem', { lineHeight: '1' }],   // 10px
                'cyber-sm': ['0.75rem', { lineHeight: '1.25' }], // 12px
                'cyber-md': ['0.875rem', { lineHeight: '1.5' }], // 14px
            },
            animation: {
                'glitch': 'glitch 1s linear infinite',
                'scanline': 'scanline 8s linear infinite',
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 12s linear infinite',
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
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
                },
                spin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                'glow-pulse': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 15px rgba(0, 240, 255, 0.6), 0 0 30px rgba(0, 240, 255, 0.3)' },
                },
            },
            boxShadow: {
                // Standardized glow effects
                'glow-sm': '0 0 5px rgba(0, 240, 255, 0.5)',
                'glow-md': '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.2)',
                'glow-lg': '0 0 15px rgba(0, 240, 255, 0.5), 0 0 30px rgba(0, 240, 255, 0.3)',
                'neon-cyan': '0 0 5px #00f0ff, 0 0 10px #00f0ff',
                'neon-purple': '0 0 5px #bc13fe, 0 0 10px #bc13fe',
                'neon-red': '0 0 5px #ff003c, 0 0 10px #ff003c',
                'panel': '0 4px 24px rgba(0, 0, 0, 0.3)',
                'elevated': '0 8px 32px rgba(0, 0, 0, 0.4)',
                'warroom-glow': '0 0 10px rgba(255, 0, 60, 0.5), 0 0 20px rgba(255, 0, 60, 0.3)',
            },
            transitionDuration: {
                'fast': '150ms',
                'base': '300ms',
                'slow': '500ms',
            },
        },
    },
    plugins: [],
}

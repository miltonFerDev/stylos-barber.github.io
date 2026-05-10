/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				gothic: ['"Gothic A1"', 'sans-serif'],
			},
			colors: {
				primary: '#242331',
				primaryLight: '#3A3A52',
				accent: '#3E52D5',
				accentHover: '#586DF3',
				accentMuted: 'rgba(62, 82, 213, 0.2)',
				surface: '#1E1E2A',
				surfaceLight: '#FBFFF1',
				textLight: '#FBFFF1',
				textMuted: 'rgba(251, 255, 241, 0.85)',
				textFooter: '#B4C5E3',
				cardBg: '#302E46',
				cardBgSoft: '#383653',
				cupGreen: '#26D9A2',
				cupLime: '#B7F000',
				cupOrange: '#FF8A1F',
				cupPink: '#FF4F9A',
				cupCyan: '#19C8E8',
				cupYellow: '#FFD84D',
				cupPurple: '#7657FF',
				cupGold: '#D4AF37',
			},
			keyframes: {
				fadeUp: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				bounceDown: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(8px)' },
				},
			},
			animation: {
				fadeUp: 'fadeUp 0.6s ease-out forwards',
				bounceDown: 'bounceDown 2s ease-in-out infinite',
			},
			boxShadow: {
				'accent': '0 10px 40px -10px rgba(62, 82, 213, 0.3)',
				'accentLg': '0 20px 50px -10px rgba(62, 82, 213, 0.25)',
				'card': '0 4px 20px -4px rgba(62, 82, 213, 0.1)',
				'cardHover': '0 12px 30px -6px rgba(62, 82, 213, 0.2)',
				'cardProde': '0 16px 40px -4px rgba(0, 0, 0, 0.25)',
				'mapa': '0 8px 30px -6px rgba(0, 0, 0, 0.15)',
			},
			borderRadius: {
				'card': '20px',
			},
		},
	},
	plugins: [],
}

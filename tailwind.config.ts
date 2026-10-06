import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			// Brand amber (stars, highlights). shadcn "accent" stays a neutral hover color.
  			highlight: {
  				DEFAULT: "hsl(var(--highlight))",
  				foreground: "hsl(var(--highlight-foreground))"
  			},
  			success: {
  				DEFAULT: "hsl(var(--success))",
  				foreground: "hsl(var(--success-foreground))"
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
  		},
  		// All UI animations stay at or under 300ms (loops like shimmer excepted)
  		keyframes: {
  			shimmer: {
  				"0%": { backgroundPosition: "-150% 0" },
  				"100%": { backgroundPosition: "250% 0" }
  			},
  			shake: {
  				"0%, 100%": { transform: "translateX(0)" },
  				"20%, 60%": { transform: "translateX(-4px)" },
  				"40%, 80%": { transform: "translateX(4px)" }
  			},
  			"toast-progress": {
  				from: { transform: "scaleX(1)" },
  				to: { transform: "scaleX(0)" }
  			},
  			"pulse-ring": {
  				"0%": { transform: "scale(1)", opacity: "0.5" },
  				"100%": { transform: "scale(1.6)", opacity: "0" }
  			}
  		},
  		animation: {
  			shimmer: "shimmer 1.4s ease-in-out infinite",
  			shake: "shake 300ms ease-in-out",
  			"toast-progress": "toast-progress linear forwards",
  			"pulse-ring": "pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite"
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Custom color palette using CSS custom properties
            colors: {
                primary: {
                    50: 'var(--clr-primary-50)',
                    100: 'var(--clr-primary-100)',
                    200: 'var(--clr-primary-200)',
                    300: 'var(--clr-primary-300)',
                    400: 'var(--clr-primary-400)',
                    500: 'var(--clr-primary-500)',
                    600: 'var(--clr-primary-600)',
                    650: '#2563eb', // Intermediate color for gradients
                    700: 'var(--clr-primary-700)',
                    800: 'var(--clr-primary-800)',
                    900: 'var(--clr-primary-900)',
                    950: 'var(--clr-primary-950)',
                },
                success: {
                    50: 'var(--clr-success-50)',
                    100: 'var(--clr-success-100)',
                    200: 'var(--clr-success-200)',
                    300: 'var(--clr-success-300)',
                    400: 'var(--clr-success-400)',
                    500: 'var(--clr-success-500)',
                    600: 'var(--clr-success-600)',
                    700: 'var(--clr-success-700)',
                    800: 'var(--clr-success-800)',
                    900: 'var(--clr-success-900)',
                    950: 'var(--clr-success-950)',
                },
                warning: {
                    50: 'var(--clr-warning-50)',
                    100: 'var(--clr-warning-100)',
                    200: 'var(--clr-warning-200)',
                    300: 'var(--clr-warning-300)',
                    400: 'var(--clr-warning-400)',
                    500: 'var(--clr-warning-500)',
                    600: 'var(--clr-warning-600)',
                    700: 'var(--clr-warning-700)',
                    800: 'var(--clr-warning-800)',
                    900: 'var(--clr-warning-900)',
                    950: 'var(--clr-warning-950)',
                },
                error: {
                    50: 'var(--clr-error-50)',
                    100: 'var(--clr-error-100)',
                    200: 'var(--clr-error-200)',
                    300: 'var(--clr-error-300)',
                    400: 'var(--clr-error-400)',
                    500: 'var(--clr-error-500)',
                    600: 'var(--clr-error-600)',
                    700: 'var(--clr-error-700)',
                    800: 'var(--clr-error-800)',
                    900: 'var(--clr-error-900)',
                    950: 'var(--clr-error-950)',
                },
                info: {
                    50: 'var(--clr-info-50)',
                    100: 'var(--clr-info-100)',
                    200: 'var(--clr-info-200)',
                    300: 'var(--clr-info-300)',
                    400: 'var(--clr-info-400)',
                    500: 'var(--clr-info-500)',
                    600: 'var(--clr-info-600)',
                    700: 'var(--clr-info-700)',
                    800: 'var(--clr-info-800)',
                    900: 'var(--clr-info-900)',
                    950: 'var(--clr-info-950)',
                },
                neutral: {
                    0: 'var(--clr-neutral-0)',
                    50: 'var(--clr-neutral-50)',
                    100: 'var(--clr-neutral-100)',
                    200: 'var(--clr-neutral-200)',
                    300: 'var(--clr-neutral-300)',
                    400: 'var(--clr-neutral-400)',
                    500: 'var(--clr-neutral-500)',
                    600: 'var(--clr-neutral-600)',
                    700: 'var(--clr-neutral-700)',
                    800: 'var(--clr-neutral-800)',
                    900: 'var(--clr-neutral-900)',
                    950: 'var(--clr-neutral-950)',
                },
            },

            // Typography using Golden Ratio scale
            fontFamily: {
                sans: 'var(--ff-sans)',
                mono: 'var(--ff-mono)',
            },
            fontSize: {
                xs: 'var(--fs-xs)',
                sm: 'var(--fs-sm)',
                base: 'var(--fs-base)',
                lg: 'var(--fs-lg)',
                xl: 'var(--fs-xl)',
                '2xl': 'var(--fs-2xl)',
                '3xl': 'var(--fs-3xl)',
                '4xl': 'var(--fs-4xl)',
            },
            lineHeight: {
                tight: 'var(--lh-tight)',
                normal: 'var(--lh-normal)',
                relaxed: 'var(--lh-relaxed)',
            },
            fontWeight: {
                light: 'var(--fw-light)',
                normal: 'var(--fw-normal)',
                medium: 'var(--fw-medium)',
                semibold: 'var(--fw-semibold)',
                bold: 'var(--fw-bold)',
            },

            // Spacing scale
            spacing: {
                0: 'var(--sp-0)',
                1: 'var(--sp-1)',
                2: 'var(--sp-2)',
                3: 'var(--sp-3)',
                4: 'var(--sp-4)',
                5: 'var(--sp-5)',
                6: 'var(--sp-6)',
                8: 'var(--sp-8)',
                10: 'var(--sp-10)',
                12: 'var(--sp-12)',
                16: 'var(--sp-16)',
                20: 'var(--sp-20)',
                24: 'var(--sp-24)',
                32: 'var(--sp-32)',
            },

            // Border radius
            borderRadius: {
                sm: 'var(--rad-sm)',
                DEFAULT: 'var(--rad-base)',
                md: 'var(--rad-md)',
                lg: 'var(--rad-lg)',
                xl: 'var(--rad-xl)',
                full: 'var(--rad-full)',
            },

            // Box shadows
            boxShadow: {
                sm: 'var(--shd-sm)',
                DEFAULT: 'var(--shd-base)',
                md: 'var(--shd-md)',
                lg: 'var(--shd-lg)',
                xl: 'var(--shd-xl)',
            },

            // Custom breakpoints - Mobile-first responsive design
            screens: {
                xs: '320px',   // Small phones
                sm: '375px',   // Large phones  
                md: '425px',   // Small tablets
                lg: '768px',   // Tablets
                xl: '1024px',  // Small desktops
                '2xl': '1440px', // Large desktops
                '3xl': '2560px', // Ultra-wide displays
            },

            // Animation and transitions
            transitionTimingFunction: {
                'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            transitionDuration: {
                150: '150ms',
                200: '200ms',
                300: '300ms',
            },

            // Custom animations
            keyframes: {
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                fadeIn: {
                    from: {
                        opacity: '0',
                        transform: 'translateY(0.5rem)'
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                },
                slideUp: {
                    from: {
                        opacity: '0',
                        transform: 'translateY(1rem)'
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                },
                scaleIn: {
                    from: {
                        opacity: '0',
                        transform: 'scale(0.95)'
                    },
                    to: {
                        opacity: '1',
                        transform: 'scale(1)'
                    },
                },
            },
            animation: {
                pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.2s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
            },

            // Responsive container utilities
            container: {
                center: true,
                padding: {
                    DEFAULT: 'var(--sp-4)',
                    sm: 'var(--sp-4)',
                    lg: 'var(--sp-6)',
                    xl: 'var(--sp-8)',
                    '2xl': 'var(--sp-8)',
                },
                screens: {
                    xs: '320px',
                    sm: '640px',
                    md: '768px',
                    lg: '1024px',
                    xl: '1280px',
                    '2xl': '1536px',
                },
            },

            // Enhanced grid template columns for responsive layouts
            gridTemplateColumns: {
                'auto-fit-300': 'repeat(auto-fit, minmax(300px, 1fr))',
                'auto-fit-250': 'repeat(auto-fit, minmax(250px, 1fr))',
                'auto-fit-200': 'repeat(auto-fit, minmax(200px, 1fr))',
                'responsive': 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            },

            // Enhanced flexbox utilities
            flex: {
                '2': '2 2 0%',
                '3': '3 3 0%',
            },
        },
    },
    plugins: [],
}
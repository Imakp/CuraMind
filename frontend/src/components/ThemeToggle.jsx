import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle = ({
  className = "",
  variant = "default",
  size = "md",
  showLabel = false,
}) => {
  const { toggleTheme, isDark } = useTheme();

  // Size variants
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Variant styles
  const variantClasses = {
    default: `
      bg-neutral-100 hover:bg-neutral-200 
      dark:bg-neutral-800 dark:hover:bg-neutral-700
      border border-neutral-200 dark:border-neutral-700
      text-neutral-600 dark:text-neutral-400
    `,
    primary: `
      bg-primary-100 hover:bg-primary-200
      dark:bg-primary-900/30 dark:hover:bg-primary-900/50
      border border-primary-200 dark:border-primary-800
      text-primary-600 dark:text-primary-400
    `,
    ghost: `
      bg-transparent hover:bg-neutral-100
      dark:hover:bg-neutral-800
      border border-transparent
      text-neutral-600 dark:text-neutral-400
    `,
    navigation: `
      bg-white/10 hover:bg-white/20
      border border-white/20
      text-white
    `,
  };

  const handleToggle = () => {
    toggleTheme();

    // Announce theme change to screen readers
    const announcement = `Switched to ${isDark ? "light" : "dark"} theme`;
    const announcer = document.createElement("div");
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "sr-only";
    announcer.textContent = announcement;
    document.body.appendChild(announcer);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        relative inline-flex items-center justify-center
        ${sizeClasses[size]} rounded-lg
        ${variantClasses[variant]}
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        focus:ring-offset-neutral-0 dark:focus:ring-offset-neutral-900
        touch-target
        ${className}
      `}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      type="button"
    >
      <div className={`relative ${iconSizes[size]}`}>
        <SunIcon
          className={`
            absolute inset-0 ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${
              isDark
                ? "opacity-0 rotate-90 scale-0"
                : "opacity-100 rotate-0 scale-100"
            }
          `}
          aria-hidden="true"
        />
        <MoonIcon
          className={`
            absolute inset-0 ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${
              isDark
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-0"
            }
          `}
          aria-hidden="true"
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;

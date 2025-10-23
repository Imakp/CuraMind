import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Theme preference detection utility
const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredTheme = () => {
  if (typeof window === "undefined") return null;

  try {
    const savedTheme = localStorage.getItem("medtracker-theme");
    return savedTheme && (savedTheme === "light" || savedTheme === "dark")
      ? savedTheme
      : null;
  } catch (error) {
    console.warn("Failed to read theme from localStorage:", error);
    return null;
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Priority: stored preference > system preference > light default
    return getStoredTheme() || getSystemTheme();
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [isSystemTheme, setIsSystemTheme] = useState(() => !getStoredTheme());

  // Apply theme to document and save to localStorage
  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute("data-theme", theme);

    // Also add class for compatibility with some CSS frameworks
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);

    // Save to localStorage only if user has made an explicit choice
    if (!isSystemTheme) {
      try {
        localStorage.setItem("medtracker-theme", theme);
      } catch (error) {
        console.warn("Failed to save theme to localStorage:", error);
      }
    }

    // Dispatch custom event for other parts of the app to listen to
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { theme, isSystemTheme },
      })
    );
  }, [theme, isSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      setSystemTheme(newSystemTheme);

      // Only update app theme if user is following system preference
      if (isSystemTheme) {
        setTheme(newSystemTheme);
      }
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    // Listen for changes
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [isSystemTheme]);

  // Theme control functions
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setIsSystemTheme(false); // User made explicit choice
  }, [theme]);

  const setLightTheme = useCallback(() => {
    setTheme("light");
    setIsSystemTheme(false);
  }, []);

  const setDarkTheme = useCallback(() => {
    setTheme("dark");
    setIsSystemTheme(false);
  }, []);

  const followSystemTheme = useCallback(() => {
    setIsSystemTheme(true);
    setTheme(systemTheme);

    // Remove stored preference to follow system
    try {
      localStorage.removeItem("medtracker-theme");
    } catch (error) {
      console.warn("Failed to remove theme from localStorage:", error);
    }
  }, [systemTheme]);

  const resetThemePreference = useCallback(() => {
    try {
      localStorage.removeItem("medtracker-theme");
      setIsSystemTheme(true);
      setTheme(systemTheme);
    } catch (error) {
      console.warn("Failed to reset theme preference:", error);
    }
  }, [systemTheme]);

  const value = {
    // Current theme state
    theme,
    systemTheme,
    isSystemTheme,

    // Theme control functions
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    followSystemTheme,
    resetThemePreference,

    // Convenience booleans
    isLight: theme === "light",
    isDark: theme === "dark",
    isSystemLight: systemTheme === "light",
    isSystemDark: systemTheme === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

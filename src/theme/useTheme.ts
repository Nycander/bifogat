import { useEffect } from "react";

/**
 * Automatically applies dark or light theme based on the operating system's color scheme.
 * No manual user overrides or UI toggles; always syncs with system preference.
 */
export function useSystemTheme(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    // Clean up any legacy manual theme overrides
    try {
      localStorage.removeItem("bifogat_theme");
    } catch {
      // Ignore storage errors in restricted iframe contexts
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const isDark = mediaQuery.matches;
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", isDark ? "#151b14" : "#778873");
      }
    };

    updateTheme();

    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);
}

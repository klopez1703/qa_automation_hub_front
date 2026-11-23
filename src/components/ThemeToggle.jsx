import { useEffect, useState } from "react";
import "../styles/ThemeToggle.css";

const STORAGE_KEY = "qa_portal_theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>
      <span>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
    </button>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("fn-theme") as Theme | null;
    const t = stored || "system";
    setThemeState(t);
    applyTheme(t === "system" ? getSystemTheme() : t);
  }, []);

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme(getSystemTheme());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("fn-theme", t);
    applyTheme(t === "system" ? getSystemTheme() : t);
  }, []);

  const toggle = useCallback(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    const next = resolved === "light" ? "dark" : "light";
    setTheme(next);
  }, [theme, setTheme]);

  const resolved = theme === "system" ? getSystemTheme() : theme;

  return { theme, resolved, setTheme, toggle };
}

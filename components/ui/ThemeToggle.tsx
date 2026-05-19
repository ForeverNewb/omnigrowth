"use client";

import { useEffect, useState } from "react";

type Theme = "paper" | "leather";

function readTheme(): Theme {
  if (typeof window === "undefined") return "paper";
  const saved = window.localStorage.getItem("og-theme");
  if (saved === "leather" || saved === "paper") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "leather" : "paper";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-paper", "theme-leather");
  root.classList.add(`theme-${theme}`);
  window.localStorage.setItem("og-theme", theme);
}

export function ThemeToggle({ variant = "ghost" }: { variant?: "ghost" | "icon" }) {
  const [theme, setTheme] = useState<Theme>("paper");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "paper" ? "leather" : "paper";
    setTheme(next);
    applyTheme(next);
  };

  const label = theme === "paper" ? "Switch to dark · Leather" : "Switch to light · Paper";
  const glyph = theme === "paper" ? "☾" : "☼";

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-label={label}
        title={label}
        suppressHydrationWarning
      >
        <span style={{ fontSize: 16, lineHeight: 1 }} suppressHydrationWarning>
          {mounted ? glyph : "☼"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      onClick={toggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      <span aria-hidden suppressHydrationWarning>
        {mounted ? glyph : "☼"}
      </span>
      <span suppressHydrationWarning>
        {mounted ? (theme === "paper" ? "Paper" : "Leather") : "Paper"}
      </span>
    </button>
  );
}

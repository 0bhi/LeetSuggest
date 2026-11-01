"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Fall back to the system preference.
  }
  return systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const color = theme === "dark" ? "#12140f" : "#f3efe5";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", color));
}

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  useLayoutEffect(() => {
    applyTheme(storedTheme());
  }, []);

  function toggle() {
    const next: Theme =
      document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The theme still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition",
        compact
          ? "h-8 w-8 border border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
          : "px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:bg-paper-deep/60 hover:text-ink",
        className
      )}
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <Moon className="h-3.5 w-3.5 dark:hidden" />
      <Sun className="hidden h-3.5 w-3.5 dark:block" />
      {compact ? null : (
        <>
          <span className="dark:hidden">Dark</span>
          <span className="hidden dark:inline">Light</span>
        </>
      )}
    </button>
  );
}

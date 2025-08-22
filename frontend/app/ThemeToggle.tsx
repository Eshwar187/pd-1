"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const key = "theme";
      const stored = localStorage.getItem(key);
      const prefers = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = stored ? stored === "dark" : prefers;
      const html = document.documentElement;
      html.classList.toggle("dark", initial);
      setDark(html.classList.contains("dark"));
    } catch (_) {
      // noop
    }
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const next = !html.classList.contains("dark");
    html.classList.toggle("dark", next);
    html.setAttribute("data-theme", next ? "dark" : "light");
    (html.style as any).colorScheme = next ? "dark" : "light";
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (_) {}
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className="btn btn-ghost hover-shine"
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      <span className="text-sm">{dark ? "🌙" : "☀️"}</span>
    </button>
  );
}

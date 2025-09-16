"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  useEffect(() => {
    try {
      const html = document.documentElement;
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
      (html.style as any).colorScheme = "dark";
      try { localStorage.setItem("theme", "dark"); } catch (_) {}
    } catch (_) {}
  }, []);

  return (
    <div aria-hidden="true" title="Dark mode only">
      <button type="button" className="btn btn-ghost" aria-label="Dark mode enabled">
        <span className="text-sm">🌙</span>
      </button>
    </div>
  );
}

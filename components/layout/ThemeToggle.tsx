"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage không khả dụng — bỏ qua
    }
  }

  return (
    <button type="button" onClick={toggle} className="btn-secondary text-sm">
      {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
    </button>
  );
}

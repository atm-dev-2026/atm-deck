"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export function ThemeSync() {
  // Re-applies the attribute the inline script already set. This is a
  // no-op in production, but React Strict Mode clears attributes it
  // doesn't own on its dev-only remount, so this restores it there.
  useLayoutEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return null;
}

export type Theme = "light" | "dark";

const STORAGE_KEY = "vp.theme";

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  // Sync the `meta[name=theme-color]` so the browser chrome matches.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#1c1e24" : "#FFFFFF";
}

export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore quota errors */
  }
}

/** Run before React mounts to prevent flash-of-wrong-theme. */
export function bootstrapTheme(): Theme {
  const t = getStoredTheme() ?? getSystemTheme();
  applyTheme(t);
  return t;
}

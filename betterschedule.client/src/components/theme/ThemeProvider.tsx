import React from "react";
import type { ThemeChoice, ResolvedTheme } from "./theme-types";

const STORAGE_KEY = "bs-theme";

type ThemeContextValue = {
    /** User's explicit choice: "light" | "dark" | "system". */
    theme: ThemeChoice;
    /** Concrete theme applied to the UI. */
    resolvedTheme: ResolvedTheme;
    /** Update the user's theme choice. */
    setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

/**
 * Returns the current theme context. Throws if used outside ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
    const ctx = React.useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}

/**
 * ThemeProvider
 *
 * Controls dark/light/system theming via a `dark` class on <html>.
 * Persists selection, resolves "system" dynamically, and listens to OS changes.
 */
export function ThemeProvider(props: { children: React.ReactNode }) {
    const [theme, setThemeState] = React.useState<ThemeChoice>(() => {
        const stored = safeGetLocal(STORAGE_KEY);
        return isThemeChoice(stored) ? stored : "system";
    });

    const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() =>
        resolveTheme(theme, getSystemPrefersDark())
    );

    // Apply theme to <html> and persist choice.
    React.useEffect(() => {
        const root = document.documentElement;
        const prefersDark = getSystemPrefersDark();
        const resolved = resolveTheme(theme, prefersDark);
        setResolvedTheme(resolved);

        if (resolved === "dark") root.classList.add("dark"); else root.classList.remove("dark");
        root.setAttribute("data-theme", theme);
        safeSetLocal(STORAGE_KEY, theme);
    }, [theme]);

    // Update resolved theme if OS preference changes while on "system".
    React.useEffect(() => {
        if (theme !== "system" || !window.matchMedia) return;
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            setResolvedTheme(resolveTheme("system", mql.matches));
            const root = document.documentElement;
            if (mql.matches) root.classList.add("dark"); else root.classList.remove("dark");
        };
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = React.useCallback((next: ThemeChoice) => setThemeState(next), []);

    const value: ThemeContextValue = { theme, resolvedTheme, setTheme };
    return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

// ---------------- helpers ----------------

function getSystemPrefersDark(): boolean {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
    if (choice === "light") return "light";
    if (choice === "dark") return "dark";
    return systemPrefersDark ? "dark" : "light";
}

function isThemeChoice(val: unknown): val is ThemeChoice {
    return val === "light" || val === "dark" || val === "system";
}

function safeGetLocal(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetLocal(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* no-op */ }
}

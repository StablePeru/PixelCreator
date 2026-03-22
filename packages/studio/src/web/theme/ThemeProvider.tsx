import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEMES, THEME_LABELS, type ThemeName } from './themes';

interface ThemeState {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function applyTheme(name: ThemeName) {
  const vars = THEMES[name];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('pxc-theme');
    return (stored && stored in THEMES) ? stored as ThemeName : 'dark';
  });

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    localStorage.setItem('pxc-theme', name);
    applyTheme(name);
  }, []);

  useEffect(() => { applyTheme(theme); }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

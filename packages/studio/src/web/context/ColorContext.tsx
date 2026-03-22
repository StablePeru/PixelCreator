import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ColorState {
  foreground: string;
  background: string;
  history: string[];
  setForeground: (hex: string) => void;
  setBackground: (hex: string) => void;
  swap: () => void;
}

const ColorContext = createContext<ColorState | null>(null);

export function ColorProvider({ children }: { children: ReactNode }) {
  const [foreground, setFg] = useState('#000000');
  const [background, setBg] = useState('#ffffff');
  const [history, setHistory] = useState<string[]>([]);

  const addToHistory = useCallback((hex: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== hex);
      return [hex, ...filtered].slice(0, 16);
    });
  }, []);

  const setForeground = useCallback((hex: string) => {
    setFg(hex);
    addToHistory(hex);
  }, [addToHistory]);

  const setBackground = useCallback((hex: string) => {
    setBg(hex);
    addToHistory(hex);
  }, [addToHistory]);

  const swap = useCallback(() => {
    setFg((prev) => {
      setBg(prev);
      return background;
    });
  }, [background]);

  return (
    <ColorContext.Provider value={{ foreground, background, history, setForeground, setBackground, swap }}>
      {children}
    </ColorContext.Provider>
  );
}

export function useColor() {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error('useColor must be used within ColorProvider');
  return ctx;
}

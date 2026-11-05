'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorMode = 'light' | 'dark';

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  setMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wishlist_theme') as ColorMode | null;
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
        if (saved === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setModeState('dark');
        document.documentElement.classList.add('dark');
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('wishlist_theme', newMode);
      if (newMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      /* ignore */
    }
  };

  const toggleColorMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode, setMode }}>
      <div style={{ opacity: mounted ? 1 : 0.95, transition: 'opacity 0.15s ease' }}>
        {children}
      </div>
    </ColorModeContext.Provider>
  );
}

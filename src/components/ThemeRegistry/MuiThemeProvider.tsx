'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? '#6366f1' : '#4f46e5',
          light: '#818cf8',
          dark: '#3730a3',
          contrastText: '#ffffff',
        },
        secondary: {
          main: isDark ? '#f43f5e' : '#e11d48',
          contrastText: '#ffffff',
        },
        background: {
          default: isDark ? '#09090b' : '#f8fafc',
          paper: isDark ? '#141417' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      },
      shape: {
        borderRadius: 14,
      },
      typography: {
        fontFamily: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ].join(','),
        h5: {
          fontWeight: 700,
          letterSpacing: '-0.02em',
        },
        h6: {
          fontWeight: 700,
          letterSpacing: '-0.015em',
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              padding: '8px 18px',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: isDark
                  ? '0 4px 14px rgba(99, 102, 241, 0.25)'
                  : '0 4px 14px rgba(79, 70, 229, 0.25)',
              },
              '&:active': {
                transform: 'scale(0.97)',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 18,
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.07)'
                : '1px solid rgba(0, 0, 0, 0.06)',
              backgroundImage: 'none',
              boxShadow: isDark
                ? '0 4px 20px rgba(0, 0, 0, 0.35)'
                : '0 2px 12px rgba(15, 23, 42, 0.04)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? '0 8px 28px rgba(0, 0, 0, 0.55)'
                  : '0 8px 24px rgba(15, 23, 42, 0.08)',
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 22,
              backgroundImage: 'none',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.08)',
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              fontWeight: 600,
              fontSize: '0.78rem',
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ opacity: mounted ? 1 : 0.95, transition: 'opacity 0.15s ease' }}>
          {children}
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

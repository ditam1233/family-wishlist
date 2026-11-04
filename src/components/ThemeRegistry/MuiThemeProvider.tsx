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
          main: isDark ? '#3b82f6' : '#2563eb', // Apple SF blue
          light: '#60a5fa',
          dark: '#1d4ed8',
          contrastText: '#ffffff',
        },
        secondary: {
          main: isDark ? '#ec4899' : '#db2777',
          contrastText: '#ffffff',
        },
        background: {
          default: 'transparent',
          paper: isDark ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.8)',
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
              borderRadius: 22,
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              backgroundColor: isDark ? 'rgba(17, 24, 39, 0.72)' : 'rgba(255, 255, 255, 0.78)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.12)'
                : '1px solid rgba(255, 255, 255, 0.8)',
              backgroundImage: 'none',
              boxShadow: isDark
                ? '0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 12px 32px -8px rgba(0, 0, 0, 0.5)'
                : '0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 10px 30px -8px rgba(15, 23, 42, 0.08), inset 0 0.5px 0 rgba(255, 255, 255, 1)',
              transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: isDark
                  ? '0 0 0 0.5px rgba(255, 255, 255, 0.12), 0 20px 48px -10px rgba(0, 0, 0, 0.75)'
                  : '0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 20px 40px -10px rgba(15, 23, 42, 0.14), inset 0 0.5px 0 rgba(255, 255, 255, 1)',
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 24,
              backgroundImage: 'none',
              backdropFilter: 'blur(30px) saturate(190%)',
              WebkitBackdropFilter: 'blur(30px) saturate(190%)',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.88)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.14)'
                : '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: isDark
                ? '0 24px 70px rgba(0, 0, 0, 0.8)'
                : '0 24px 60px rgba(15, 23, 42, 0.16), inset 0 0.5px 0 rgba(255, 255, 255, 1)',
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

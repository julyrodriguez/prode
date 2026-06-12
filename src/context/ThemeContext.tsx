'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isLite: boolean;
  toggleLite: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  isLite: false,
  toggleLite: () => {},
});

/** Aplica el tema al DOM inmediatamente (sin esperar al siguiente render) */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme');
  const isChanging = currentTheme && currentTheme !== theme;

  if (isChanging) {
    root.classList.add('theme-transitioning');
    if ((window as any).__themeTransitionTimeout) {
      clearTimeout((window as any).__themeTransitionTimeout);
    }
    (window as any).__themeTransitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 1000);
  }

  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}

/** Aplica el modo LITE al DOM inmediatamente */
function applyLiteMode(isLite: boolean) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('lite-mode', isLite);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLite, setIsLite] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Inicializar en el cliente una sola vez tras montar
  useEffect(() => {
    let storedTheme: Theme | null = null;
    let storedLite = false;
    try {
      storedTheme = localStorage.getItem('theme') as Theme | null;
      storedLite = localStorage.getItem('lite-mode') === 'true';
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    const resolvedTheme = storedTheme
      ? storedTheme
      : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';

    setTheme(resolvedTheme);
    setIsLite(storedLite);
    applyTheme(resolvedTheme);
    applyLiteMode(storedLite);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    applyTheme(theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('lite-mode', String(isLite));
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    applyLiteMode(isLite);
  }, [isLite, mounted]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  const toggleLite = () => {
    setIsLite(prev => {
      const next = !prev;
      applyLiteMode(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLite, toggleLite }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


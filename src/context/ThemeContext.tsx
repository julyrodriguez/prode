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
  const root = document.documentElement;
  root.classList.toggle('lite-mode', isLite);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem('theme') as Theme | null;
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    const resolved = stored
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    // Aplicar sincrónicamente en la primera inicialización
    applyTheme(resolved);
    return resolved;
  });

  const [isLite, setIsLite] = useState<boolean>(() => {
    let stored = false;
    try {
      stored = localStorage.getItem('lite-mode') === 'true';
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    // Aplicar sincrónicamente en la primera inicialización
    applyLiteMode(stored);
    return stored;
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    // applyTheme ya fue llamado en toggleTheme, pero lo hacemos también
    // en el efecto por si el estado cambia desde otro lugar
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('lite-mode', String(isLite));
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    applyLiteMode(isLite);
  }, [isLite]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      // ← Aplicar al DOM ANTES del re-render de React para que
      //   las CSS vars y las clases de Tailwind cambien juntas
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


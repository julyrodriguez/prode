import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
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

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      // ← Aplicar al DOM ANTES del re-render de React para que
      //   las CSS vars y las clases de Tailwind cambien juntas
      applyTheme(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

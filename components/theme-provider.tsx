'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext<{ theme: string; toggle: () => void }>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('bw-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('bw-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() { return useContext(ThemeCtx); }

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <div className="theme-toggle-wrap">
      <button className={`theme-toggle-btn${theme === 'dark' ? ' on' : ''}`} onClick={() => theme !== 'dark' && toggle()}>
        🌙 Noite
      </button>
      <button className={`theme-toggle-btn${theme === 'light' ? ' on' : ''}`} onClick={() => theme !== 'light' && toggle()}>
        🌆 Tarde
      </button>
    </div>
  );
}

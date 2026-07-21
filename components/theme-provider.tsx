'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext<{ theme: string; setTheme: (t: string) => void }>({
  theme: 'dark', setTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    // Lê tema salvo e aplica
    const saved = localStorage.getItem('bw-theme') || 'dark';
    setThemeState(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function setTheme(t: string) {
    setThemeState(t);
    localStorage.setItem('bw-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() { return useContext(ThemeCtx); }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const themes = [
    { key: 'dark',  label: '🌙' },
    { key: 'light', label: '☀️' },
    { key: 'tarde', label: '🌆' },
  ];
  return (
    <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 100, padding: 3 }}>
      {themes.map(t => (
        <button key={t.key} onClick={() => setTheme(t.key)} style={{
          padding: '4px 10px', borderRadius: 100, border: 'none',
          background: theme === t.key ? 'var(--neon)' : 'transparent',
          color: theme === t.key ? 'var(--bg)' : 'var(--sub)',
          fontSize: 13, cursor: 'pointer', transition: 'all .2s',
          fontWeight: theme === t.key ? 800 : 400,
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// Script inline para evitar flash de tema errado no SSR
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var t = localStorage.getItem('bw-theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          })();
        `
      }}
    />
  );
}

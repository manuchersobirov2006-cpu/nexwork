import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Language } from './i18n';
import { setLanguage as setI18nLanguage } from './i18n';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('NexWokr_theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('skillbridge_lang') as Language | null;
    return saved ?? 'ru';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('skillbridge_theme', theme);
  }, [theme]);

  useEffect(() => {
    setI18nLanguage(language);
    localStorage.setItem('skillbridge_lang', language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const setLanguage = (lang: Language) => setLang(lang);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

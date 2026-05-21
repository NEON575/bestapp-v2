import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { settingsClient } from '../api/settings';
import { translate, type AppLanguage } from './translations';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage, options?: { persist?: boolean }) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('az');

  useEffect(() => {
    const stored = localStorage.getItem('bestapp.language');
    if (stored === 'ru' || stored === 'az') {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage, options?: { persist?: boolean }) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('bestapp.language', nextLanguage);
    if (options?.persist === false) {
      return;
    }

    try {
      await settingsClient.updatePreferences({ language: nextLanguage });
    } catch {
      // Keep local preference even if backend persistence fails.
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, fallback) => translate(language, key, fallback)
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

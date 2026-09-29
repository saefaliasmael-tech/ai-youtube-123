import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, TranslationDictionary } from './types';
import { ar } from './ar';
import { en } from './en';
import { engineApi } from '../services/engineApi';

const translations: Record<Language, TranslationDictionary> = {
  ar,
  en,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  strings: TranslationDictionary;
  t: (keyPath: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'ai_youtube_language';

export const LanguageProvider: React.FC<{ children: ReactNode; initialLanguage?: Language }> = ({
  children,
  initialLanguage
}) => {
  // Default on first run is 'ar' as requested
  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage && (initialLanguage === 'ar' || initialLanguage === 'en')) {
      return initialLanguage;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
    return 'ar';
  });

  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';
  const isRtl = language === 'ar';

  const updateLanguage = (newLang: Language) => {
    if (newLang !== 'ar' && newLang !== 'en') return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;

      // Sync with backend config
      engineApi.saveLanguage(newLang).catch(() => {});
    } catch {
      // Ignore in restricted environments
    }
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const strings = translations[language] || translations.ar;

  const t = (keyPath: string, fallback?: string): string => {
    const parts = keyPath.split('.');
    let current: any = strings;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback || keyPath;
      }
    }
    return typeof current === 'string' ? current : fallback || keyPath;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage: updateLanguage,
      dir,
      isRtl,
      strings,
      t,
    }),
    [language, dir, isRtl, strings]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export * from './types';

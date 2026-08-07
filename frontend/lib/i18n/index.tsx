'use client';

// Single i18n provider for the entire app.
// - Only English ('en') and Bahasa Indonesia ('id') are supported.
// - The selected language persists in localStorage and survives refresh,
//   navigation, logout and login.
// - Default language: English.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type TranslationKey } from './en';
import { id } from './id';

export type Language = 'en' | 'id';

export const LANGUAGE_STORAGE_KEY = 'language';
export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGES: ReadonlyArray<{ code: Language; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'id', label: 'Indonesia', native: 'Bahasa Indonesia' },
] as const;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = {
  en,
  id: id as Record<TranslationKey, string>,
};

// Module-level cache of the active language so non-hook consumers
// (format helpers, export service) stay in sync without re-reading storage.
let currentLanguage: Language = DEFAULT_LANGUAGE;

export function getLanguage(): Language {
  return currentLanguage;
}

export function getDictionary(): Record<TranslationKey, string> {
  return DICTIONARIES[currentLanguage];
}

export function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LANGUAGE;
}

export function persistLanguage(language: Language): void {
  currentLanguage = language;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore storage errors
  }
  try {
    document.documentElement.lang = language;
  } catch {
    // ignore
  }
}

export type TranslateVars = Record<string, string | number>;

export function translate(key: string, vars?: TranslateVars): string {
  let template: string = DICTIONARIES[currentLanguage][key as TranslationKey] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      template = template.split(`{${name}}`).join(String(value));
    }
  }
  return template;
}

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: TranslateVars) => string;
  isEnglish: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = readStoredLanguage();
    persistLanguage(stored);
    setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    persistLanguage(next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => translate(key, vars),
    [language] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const value = useMemo<I18nContextType>(
    () => ({
      language,
      setLanguage,
      t,
      isEnglish: language === 'en',
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';

export type WebsiteLanguage = {
  code: string;
  english_name: string;
  native_name: string;
  is_rtl: boolean;
  display_order: number;
};

type TranslationRow = {
  translation_key: string;
  translated_text: string;
  resolved_language_code: string;
  used_fallback: boolean;
};

type TranslationVariables = Record<string, string | number>;

type WebsiteI18nContextValue = {
  language: string;
  languages: WebsiteLanguage[];
  isLoading: boolean;
  setLanguage: (languageCode: string) => void;
  t: (key: string, fallback: string, variables?: TranslationVariables) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const STORAGE_KEY = 'b1m.website.language';
const DEFAULT_LANGUAGE = 'en';

const WebsiteI18nContext = createContext<WebsiteI18nContextValue | null>(null);

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  if (!resolved.ok) throw new Error(await resolved.text());
  return resolved.json() as Promise<T>;
}

function interpolate(template: string, variables?: TranslationVariables) {
  if (!variables) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? match : String(value);
  });
}

function detectPreferredLanguage(languages: WebsiteLanguage[]) {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && languages.some((language) => language.code === stored)) return stored;

  const browserCodes = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const browserCode of browserCodes) {
    const normalized = browserCode.toLowerCase();
    const exact = languages.find((language) => language.code.toLowerCase() === normalized);
    if (exact) return exact.code;
    const base = normalized.split('-')[0];
    const partial = languages.find((language) => language.code.toLowerCase() === base);
    if (partial) return partial.code;
  }

  return DEFAULT_LANGUAGE;
}

export function WebsiteI18nProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<WebsiteLanguage[]>([]);
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    readJson<WebsiteLanguage[]>(supabase.from('site_languages').request({
      query: 'select=code,english_name,native_name,is_rtl,display_order&is_active=eq.true&order=display_order.asc,code.asc',
    }))
      .then((rows) => {
        setLanguages(rows);
        setLanguageState(detectPreferredLanguage(rows));
      })
      .catch(() => {
        setLanguages([{ code: 'en', english_name: 'English', native_name: 'English', is_rtl: false, display_order: 0 }]);
        setLanguageState(DEFAULT_LANGUAGE);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    readJson<TranslationRow[]>(supabase.rpc('get_website_translations', { p_language_code: language }))
      .then((rows) => {
        if (cancelled) return;
        setTranslations(Object.fromEntries(rows.map((row) => [row.translation_key, row.translated_text])));
      })
      .catch(() => {
        if (!cancelled) setTranslations({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const selected = languages.find((item) => item.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = selected?.is_rtl ? 'rtl' : 'ltr';
    window.localStorage.setItem(STORAGE_KEY, language);
    window.dispatchEvent(new CustomEvent('b1m:languagechange', { detail: { language } }));

    return () => { cancelled = true; };
  }, [language, languages]);

  const setLanguage = useCallback((languageCode: string) => {
    if (languages.some((item) => item.code === languageCode)) setLanguageState(languageCode);
  }, [languages]);

  const t = useCallback((key: string, fallback: string, variables?: TranslationVariables) => {
    return interpolate(translations[key] || fallback, variables);
  }, [translations]);

  const locale = language === 'en' ? 'en-GB' : language;
  const formatDate = useCallback((value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, options || { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }, [locale]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  const value = useMemo<WebsiteI18nContextValue>(() => ({
    language,
    languages,
    isLoading,
    setLanguage,
    t,
    formatDate,
    formatNumber,
  }), [formatDate, formatNumber, isLoading, language, languages, setLanguage, t]);

  return <WebsiteI18nContext.Provider value={value}>{children}</WebsiteI18nContext.Provider>;
}

export function useWebsiteI18n() {
  const context = useContext(WebsiteI18nContext);
  if (!context) throw new Error('useWebsiteI18n must be used within WebsiteI18nProvider.');
  return context;
}

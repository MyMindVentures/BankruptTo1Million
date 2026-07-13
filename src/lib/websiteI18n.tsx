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

type TranslationKeyRow = {
  id: string;
  translation_key: string;
  default_text: string;
};

type TranslationValueRow = {
  translation_key_id: string;
  translated_text: string;
};

type TranslationVariables = Record<string, string | number>;

type WebsiteI18nContextValue = {
  language: string;
  languages: WebsiteLanguage[];
  isLoading: boolean;
  setLanguage: (languageCode: string) => void;
  t: (key: string, fallback: string, variables?: TranslationVariables) => string;
  translateText: (fallback: string, variables?: TranslationVariables) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const STORAGE_KEY = 'b1m.website.language';
const DEFAULT_LANGUAGE = 'en';
const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'] as const;
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT']);

const WebsiteI18nContext = createContext<WebsiteI18nContextValue | null>(null);
const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

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

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
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

function resolveEnglishSource(
  current: string,
  sourceTranslations: Map<string, string>,
  translatedToSource: Map<string, string>,
) {
  const normalized = normalizeText(current);
  if (!normalized) return current;
  if (sourceTranslations.has(normalized)) return normalized;
  return translatedToSource.get(normalized) || current;
}

function applyDocumentTranslations(
  language: string,
  sourceTranslations: Map<string, string>,
  translatedToSource: Map<string, string>,
) {
  const root = document.getElementById('root');
  if (!root) return;

  const translateNode = (node: Text) => {
    const parent = node.parentElement;
    if (!parent || SKIPPED_TAGS.has(parent.tagName) || parent.closest('[data-i18n-skip="true"]')) return;

    const current = node.nodeValue || '';
    if (!normalizeText(current)) return;

    const knownOriginal = originalTextNodes.get(node);
    const englishSource = knownOriginal || resolveEnglishSource(current, sourceTranslations, translatedToSource);
    originalTextNodes.set(node, englishSource);

    const normalizedSource = normalizeText(englishSource);
    const next = language === DEFAULT_LANGUAGE
      ? englishSource
      : sourceTranslations.get(normalizedSource) || current;

    const rendered = preserveOuterWhitespace(current, next);
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  };

  const translateElementAttributes = (element: Element) => {
    if (SKIPPED_TAGS.has(element.tagName) || element.closest('[data-i18n-skip="true"]')) return;

    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map<string, string>();
      originalAttributes.set(element, originals);
    }

    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current || !normalizeText(current)) continue;

      const knownOriginal = originals.get(attribute);
      const englishSource = knownOriginal || resolveEnglishSource(current, sourceTranslations, translatedToSource);
      originals.set(attribute, englishSource);

      const next = language === DEFAULT_LANGUAGE
        ? englishSource
        : sourceTranslations.get(normalizeText(englishSource)) || current;

      if (current !== next) element.setAttribute(attribute, next);
    }
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    translateNode(textNode as Text);
    textNode = walker.nextNode();
  }

  root.querySelectorAll('*').forEach(translateElementAttributes);
}

export function WebsiteI18nProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<WebsiteLanguage[]>([]);
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationsBySource, setTranslationsBySource] = useState<Map<string, string>>(new Map());
  const [translatedToSource, setTranslatedToSource] = useState<Map<string, string>>(new Map());
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

    Promise.all([
      readJson<TranslationRow[]>(supabase.rpc('get_website_translations', { p_language_code: language })),
      readJson<TranslationKeyRow[]>(supabase.from('website_translation_keys').request({
        query: 'select=id,translation_key,default_text&order=translation_key.asc',
      })),
      language === DEFAULT_LANGUAGE
        ? Promise.resolve([] as TranslationValueRow[])
        : readJson<TranslationValueRow[]>(supabase.from('website_translations').request({
            query: `select=translation_key_id,translated_text&language_code=eq.${encodeURIComponent(language)}`,
          })),
    ])
      .then(([resolvedRows, keyRows, valueRows]) => {
        if (cancelled) return;

        setTranslations(Object.fromEntries(resolvedRows.map((row) => [row.translation_key, row.translated_text])));

        const valuesByKeyId = new Map(valueRows.map((row) => [row.translation_key_id, row.translated_text]));
        const bySource = new Map<string, string>();
        const reverse = new Map<string, string>();

        for (const keyRow of keyRows) {
          const source = normalizeText(keyRow.default_text || '');
          if (!source) continue;
          const translated = language === DEFAULT_LANGUAGE
            ? keyRow.default_text
            : valuesByKeyId.get(keyRow.id);
          if (!translated) continue;
          bySource.set(source, translated);
          reverse.set(normalizeText(translated), keyRow.default_text);
        }

        setTranslationsBySource(bySource);
        setTranslatedToSource(reverse);
      })
      .catch(() => {
        if (!cancelled) {
          setTranslations({});
          setTranslationsBySource(new Map());
          setTranslatedToSource(new Map());
        }
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

  useEffect(() => {
    let frame = 0;
    const root = document.getElementById('root');
    if (!root) return undefined;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applyDocumentTranslations(language, translationsBySource, translatedToSource);
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language, translatedToSource, translationsBySource]);

  const setLanguage = useCallback((languageCode: string) => {
    if (languages.some((item) => item.code === languageCode)) setLanguageState(languageCode);
  }, [languages]);

  const t = useCallback((key: string, fallback: string, variables?: TranslationVariables) => {
    return interpolate(translations[key] || fallback, variables);
  }, [translations]);

  const translateText = useCallback((fallback: string, variables?: TranslationVariables) => {
    const translated = language === DEFAULT_LANGUAGE
      ? fallback
      : translationsBySource.get(normalizeText(fallback)) || fallback;
    return interpolate(translated, variables);
  }, [language, translationsBySource]);

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
    translateText,
    formatDate,
    formatNumber,
  }), [formatDate, formatNumber, isLoading, language, languages, setLanguage, t, translateText]);

  return <WebsiteI18nContext.Provider value={value}>{children}</WebsiteI18nContext.Provider>;
}

export function useWebsiteI18n() {
  const context = useContext(WebsiteI18nContext);
  if (!context) throw new Error('useWebsiteI18n must be used within WebsiteI18nProvider.');
  return context;
}

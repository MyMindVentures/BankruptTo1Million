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

type TranslationRow = { translation_key: string; translated_text: string };
type TranslationKeyRow = { id: string; translation_key: string; default_text: string };
type TranslationValueRow = { translation_key_id: string; translated_text: string };
type TranslationVariables = Record<string, string | number>;
export type WebsiteTranslate = (key: string, fallback: string, variables?: TranslationVariables) => string;
type TranslationBundle = { byKey: Record<string, string>; bySource: Record<string, string> };

type WebsiteI18nContextValue = {
  language: string;
  languages: WebsiteLanguage[];
  isLoading: boolean;
  setLanguage: (languageCode: string) => void;
  t: WebsiteTranslate;
  translateText: (fallback: string, variables?: TranslationVariables) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const STORAGE_KEY = 'b1m.website.language';
const BUNDLE_CACHE_PREFIX = 'b1m.website.translations.v13.';
const DEFAULT_LANGUAGE = 'en';
const EMPTY_BUNDLE: TranslationBundle = { byKey: {}, bySource: {} };
const PUBLIC_SITE_ROOT_SELECTOR = '#root';
const WebsiteI18nContext = createContext<WebsiteI18nContextValue | null>(null);
const bundleCache = new Map<string, TranslationBundle>();
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let translationKeysPromise: Promise<TranslationKeyRow[]> | null = null;

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

function translatedSource(bundle: TranslationBundle, language: string, source: string) {
  if (language === DEFAULT_LANGUAGE) return source;
  return bundle.bySource[normalizeText(source)] || source;
}

function isIgnored(element: Element | null) {
  return Boolean(element?.closest('[data-i18n-ignore="true"],script,style,noscript,textarea,code,pre'));
}

function translatePublicElement(root: Element, bundle: TranslationBundle, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !isIgnored(parent)) {
      const source = originalText.get(node) ?? node.data;
      if (!originalText.has(node)) originalText.set(node, source);
      const normalized = normalizeText(source);
      if (normalized) {
        const translated = translatedSource(bundle, language, normalized);
        const leading = source.match(/^\s*/)?.[0] || '';
        const trailing = source.match(/\s*$/)?.[0] || '';
        node.data = `${leading}${translated}${trailing}`;
      }
    }
    node = walker.nextNode() as Text | null;
  }

  const attributes = ['aria-label', 'aria-description', 'title', 'placeholder', 'alt'];
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    if (isIgnored(element)) return;
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map<string, string>();
      originalAttributes.set(element, originals);
    }
    attributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      if (!originals!.has(attribute)) originals!.set(attribute, current);
      const source = originals!.get(attribute)!;
      element.setAttribute(attribute, translatedSource(bundle, language, source));
    });
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

function readCachedBundle(language: string): TranslationBundle | null {
  const memory = bundleCache.get(language);
  if (memory) return memory;
  try {
    const raw = window.sessionStorage.getItem(`${BUNDLE_CACHE_PREFIX}${language}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranslationBundle;
    if (!parsed?.byKey || !parsed?.bySource) return null;
    bundleCache.set(language, parsed);
    return parsed;
  } catch { return null; }
}

function cacheBundle(language: string, bundle: TranslationBundle) {
  bundleCache.set(language, bundle);
  try { window.sessionStorage.setItem(`${BUNDLE_CACHE_PREFIX}${language}`, JSON.stringify(bundle)); } catch { /* in-memory cache remains available */ }
}

function getTranslationKeys() {
  if (!translationKeysPromise) {
    translationKeysPromise = readJson<TranslationKeyRow[]>(supabase.from('website_translation_keys').request({ query: 'select=id,translation_key,default_text&order=translation_key.asc' })).catch((error) => {
      translationKeysPromise = null;
      throw error;
    });
  }
  return translationKeysPromise;
}

async function loadBundle(language: string): Promise<TranslationBundle> {
  const cached = readCachedBundle(language);
  if (cached) return cached;
  const [resolvedRows, keyRows, valueRows] = await Promise.all([
    readJson<TranslationRow[]>(supabase.rpc('get_website_translations', { p_language_code: language })),
    getTranslationKeys(),
    language === DEFAULT_LANGUAGE ? Promise.resolve([] as TranslationValueRow[]) : readJson<TranslationValueRow[]>(supabase.from('website_translations').request({ query: `select=translation_key_id,translated_text&language_code=eq.${encodeURIComponent(language)}` })),
  ]);
  const byKey = Object.fromEntries(resolvedRows.map((row) => [row.translation_key, row.translated_text]));
  const valuesByKeyId = new Map(valueRows.map((row) => [row.translation_key_id, row.translated_text]));
  const bySource: Record<string, string> = {};
  for (const keyRow of keyRows) {
    const source = normalizeText(keyRow.default_text || '');
    if (!source) continue;
    const translated = language === DEFAULT_LANGUAGE ? keyRow.default_text : valuesByKeyId.get(keyRow.id);
    if (translated) bySource[source] = translated;
  }
  const bundle = { byKey, bySource };
  cacheBundle(language, bundle);
  return bundle;
}

export function WebsiteI18nProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<WebsiteLanguage[]>([]);
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [bundle, setBundle] = useState<TranslationBundle>(() => readCachedBundle(DEFAULT_LANGUAGE) || EMPTY_BUNDLE);
  const [isLoading, setIsLoading] = useState(() => !readCachedBundle(DEFAULT_LANGUAGE));

  useEffect(() => {
    let cancelled = false;
    readJson<WebsiteLanguage[]>(supabase.from('site_languages').request({ query: 'select=code,english_name,native_name,is_rtl,display_order&is_active=eq.true&order=display_order.asc,code.asc' }))
      .then((rows) => { if (!cancelled) { setLanguages(rows); setLanguageState(detectPreferredLanguage(rows)); } })
      .catch(() => { if (!cancelled) { setLanguages([{ code: 'en', english_name: 'English', native_name: 'English', is_rtl: false, display_order: 0 }]); setLanguageState(DEFAULT_LANGUAGE); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!languages.length || !languages.some((item) => item.code === language)) return;
    let cancelled = false;
    const cached = readCachedBundle(language);
    if (cached) { setBundle(cached); setIsLoading(false); }
    else {
      setIsLoading(true);
      loadBundle(language).then((nextBundle) => { if (!cancelled) setBundle(nextBundle); }).catch(() => { if (!cancelled) setBundle(EMPTY_BUNDLE); }).finally(() => { if (!cancelled) setIsLoading(false); });
    }
    const selected = languages.find((item) => item.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = selected?.is_rtl ? 'rtl' : 'ltr';
    window.localStorage.setItem(STORAGE_KEY, language);
    window.dispatchEvent(new CustomEvent('b1m:languagechange', { detail: { language } }));
    return () => { cancelled = true; };
  }, [language, languages]);

  useEffect(() => {
    const root = document.querySelector(PUBLIC_SITE_ROOT_SELECTOR);
    if (!root) return;
    const apply = () => translatePublicElement(root, bundle, language);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [bundle, language]);

  useEffect(() => {
    if (languages.length < 2) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        for (const item of languages) {
          if (cancelled) return;
          if (item.code !== language && !readCachedBundle(item.code)) await loadBundle(item.code).catch(() => undefined);
        }
      })();
    }, 1000);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [language, languages]);

  const setLanguage = useCallback((languageCode: string) => {
    if (!languages.some((item) => item.code === languageCode)) return;
    window.localStorage.setItem(STORAGE_KEY, languageCode);
    const articleRoute = /^\/journal\/[^/]+/.test(window.location.pathname);
    if (articleRoute) {
      const params = new URLSearchParams(window.location.search);
      params.set('lang', languageCode);
      window.location.assign(`${window.location.pathname}?${params.toString()}${window.location.hash}`);
      return;
    }
    const cached = readCachedBundle(languageCode);
    if (cached) setBundle(cached);
    setLanguageState(languageCode);
  }, [languages]);

  const t = useCallback((key: string, fallback: string, variables?: TranslationVariables) => {
    const translated = language === DEFAULT_LANGUAGE
      ? bundle.byKey[key] || fallback
      : bundle.byKey[key] || bundle.bySource[normalizeText(fallback)] || fallback;
    return interpolate(translated, variables);
  }, [bundle, language]);
  const translateText = useCallback((fallback: string, variables?: TranslationVariables) => {
    const translated = language === DEFAULT_LANGUAGE ? fallback : bundle.bySource[normalizeText(fallback)] || fallback;
    return interpolate(translated, variables);
  }, [bundle, language]);
  const locale = language === 'en' ? 'en-GB' : language;
  const formatDate = useCallback((value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, options || { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }, [locale]);
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value), [locale]);

  const value = useMemo<WebsiteI18nContextValue>(() => ({ language, languages, isLoading, setLanguage, t, translateText, formatDate, formatNumber }), [formatDate, formatNumber, isLoading, language, languages, setLanguage, t, translateText]);
  return <WebsiteI18nContext.Provider value={value}>{children}</WebsiteI18nContext.Provider>;
}

export function useWebsiteI18n() {
  const context = useContext(WebsiteI18nContext);
  if (!context) throw new Error('useWebsiteI18n must be used within WebsiteI18nProvider.');
  return context;
}

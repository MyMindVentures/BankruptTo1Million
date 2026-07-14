import { supabase } from './lib/supabase';

const STORAGE_KEY = 'b1m.website.language';
const ROOT_SELECTOR = '.founder-profile-page';
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let translations = new Map<string, string>();
let loadToken = 0;

function normalize(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function activeLanguage() {
  return window.localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'en';
}

function founderSlug() {
  const match = window.location.pathname.match(/^\/founders\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function translated(value: string) {
  return translations.get(normalize(value)) || value;
}

function applyTranslations() {
  document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const parent = node.parentElement;
      if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) {
        const source = originalText.get(node) ?? node.data;
        if (!originalText.has(node)) originalText.set(node, source);
        const normalized = normalize(source);
        if (normalized) {
          const leading = source.match(/^\s*/)?.[0] || '';
          const trailing = source.match(/\s*$/)?.[0] || '';
          node.data = `${leading}${translated(normalized)}${trailing}`;
        }
      }
      node = walker.nextNode() as Text | null;
    }

    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      let attributes = originalAttributes.get(element);
      if (!attributes) {
        attributes = new Map<string, string>();
        originalAttributes.set(element, attributes);
      }
      ['aria-label', 'title', 'placeholder', 'alt'].forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (!current) return;
        if (!attributes!.has(attribute)) attributes!.set(attribute, current);
        element.setAttribute(attribute, translated(attributes!.get(attribute)!));
      });
    });
  });
}

async function loadTranslations() {
  const slug = founderSlug();
  const language = activeLanguage();
  const token = ++loadToken;
  if (!slug) return;

  if (language === 'en') {
    translations = new Map();
    applyTranslations();
    return;
  }

  try {
    const response = await supabase.rpc('get_founder_profile_translation_map', {
      p_slug: slug,
      p_language: language,
    });
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json() as Record<string, string> | null;
    if (token !== loadToken) return;
    translations = new Map(Object.entries(payload || {}).map(([source, value]) => [normalize(source), value]));
    applyTranslations();
  } catch (error) {
    console.error('[Founders i18n] Failed to load translations', error);
  }
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyTranslations();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('b1m:languagechange', () => void loadTranslations());
window.addEventListener('popstate', () => void loadTranslations());
window.addEventListener('load', () => void loadTranslations(), { once: true });
void loadTranslations();

import { supabase } from './lib/supabase';

type ProfileRow = {
  id: string;
  headline?: string | null;
  role_title?: string | null;
  short_bio?: string | null;
  full_bio?: string | null;
  personal_mission?: string | null;
  founder_story?: string | null;
  contact_cta_label?: string | null;
  partnership_cta_label?: string | null;
};
type ProfileTranslation = Omit<ProfileRow, 'id'> & { founder_profile_id: string; language_code: string; translation_status?: string | null };
type SwatRow = { id: string; title?: string | null; summary?: string | null; evidence?: string | null; practical_impact?: string | null; management_strategy?: string | null };
type SwatTranslation = Omit<SwatRow, 'id'> & { swat_point_id: string; language_code: string; translation_status?: string | null };
type TimelineRow = { id: string; title?: string | null; subtitle?: string | null; description?: string | null; location_name?: string | null; host_thank_you?: string | null };
type TimelineTranslation = Omit<TimelineRow, 'id'> & { timeline_event_id: string; language_code: string; translation_status?: string | null };
type JournalRow = { id: string; title?: string | null; subtitle?: string | null; excerpt?: string | null };
type JournalTranslation = Omit<JournalRow, 'id'> & { journal_post_id: string; language_code: string; translation_status?: string | null };
type ConceptRow = { id: string; title?: string | null; tagline?: string | null; short_description?: string | null };
type ConceptTranslation = Omit<ConceptRow, 'id'> & { concept_id: string; language_code: string; translation_status?: string | null };
type WebsiteKey = { id: string; default_text: string };
type WebsiteValue = { translation_key_id: string; translated_text: string };

const STORAGE_KEY = 'b1m.website.language';
const ROOT_SELECTOR = '.founder-profile-page';
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let translations = new Map<string, string>();
let loadingToken = 0;

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function normalize(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function addPair(map: Map<string, string>, source?: string | null, translated?: string | null) {
  const key = normalize(source);
  const value = normalize(translated);
  if (key && value && key !== value) map.set(key, value);
}

function addObjectPairs(map: Map<string, string>, source: Record<string, unknown>, translated: Record<string, unknown>, fields: string[]) {
  fields.forEach((field) => addPair(map, source[field] as string | null, translated[field] as string | null));
}

function routeSlug() {
  const match = window.location.pathname.match(/^\/founders\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function activeLanguage() {
  return window.localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'en';
}

async function loadTranslations() {
  const slug = routeSlug();
  const language = activeLanguage();
  const token = ++loadingToken;
  if (!slug) return;
  if (language === 'en') {
    translations = new Map();
    applyTranslations();
    return;
  }

  const profileRows = await readJson<ProfileRow[]>(supabase.from('founder_profiles_public').request({
    query: `select=id,headline,role_title,short_bio,full_bio,personal_mission,founder_story,contact_cta_label,partnership_cta_label&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  }));
  const profile = profileRows[0];
  if (!profile) return;

  const [profileTranslations, swatRows, timelineRows, journalRows, journalTranslations, conceptRows, conceptTranslations, websiteKeys, websiteValues] = await Promise.all([
    readJson<ProfileTranslation[]>(supabase.from('founder_profile_translations').request({ query: `select=founder_profile_id,language_code,headline,role_title,short_bio,full_bio,personal_mission,founder_story,contact_cta_label,partnership_cta_label,translation_status&founder_profile_id=eq.${profile.id}&language_code=eq.${encodeURIComponent(language)}` })),
    readJson<SwatRow[]>(supabase.from('founder_swat_public').request({ query: `select=id,title,summary,evidence,practical_impact,management_strategy&founder_slug=eq.${encodeURIComponent(slug)}` })),
    readJson<TimelineRow[]>(supabase.from('founder_timeline_public').request({ query: `select=id,title,subtitle,description,location_name,host_thank_you&founder_slug=eq.${encodeURIComponent(slug)}` })),
    readJson<JournalRow[]>(supabase.from('journal_posts').request({ query: 'select=id,title,subtitle,excerpt&status=eq.published' })),
    readJson<JournalTranslation[]>(supabase.from('journal_translations').request({ query: `select=journal_post_id,language_code,title,subtitle,excerpt,translation_status&language_code=eq.${encodeURIComponent(language)}&translation_status=eq.published` })),
    readJson<ConceptRow[]>(supabase.from('proof_of_mind_concepts').request({ query: 'select=id,title,tagline,short_description&visibility=eq.public' })),
    readJson<ConceptTranslation[]>(supabase.from('proof_of_mind_concept_translations').request({ query: `select=concept_id,language_code,title,tagline,short_description,translation_status&language_code=eq.${encodeURIComponent(language)}&translation_status=eq.published` })),
    readJson<WebsiteKey[]>(supabase.from('website_translation_keys').request({ query: 'select=id,default_text&is_active=eq.true' })),
    readJson<WebsiteValue[]>(supabase.from('website_translations').request({ query: `select=translation_key_id,translated_text&language_code=eq.${encodeURIComponent(language)}&translation_status=eq.published` })),
  ]);

  const swatTranslations = swatRows.length ? await readJson<SwatTranslation[]>(supabase.from('founder_profile_swat_translations').request({ query: `select=swat_point_id,language_code,title,summary,evidence,practical_impact,management_strategy,translation_status&swat_point_id=in.(${swatRows.map((row) => row.id).join(',')})&language_code=eq.${encodeURIComponent(language)}&translation_status=eq.published` })) : [];
  const timelineTranslations = timelineRows.length ? await readJson<TimelineTranslation[]>(supabase.from('founder_timeline_event_translations').request({ query: `select=timeline_event_id,language_code,title,subtitle,description,location_name,host_thank_you,translation_status&timeline_event_id=in.(${timelineRows.map((row) => row.id).join(',')})&language_code=eq.${encodeURIComponent(language)}&translation_status=eq.published` })) : [];

  if (token !== loadingToken) return;
  const map = new Map<string, string>();
  const profileTranslation = profileTranslations.find((row) => !row.translation_status || row.translation_status === 'published');
  if (profileTranslation) addObjectPairs(map, profile as unknown as Record<string, unknown>, profileTranslation as unknown as Record<string, unknown>, ['headline', 'role_title', 'short_bio', 'full_bio', 'personal_mission', 'founder_story', 'contact_cta_label', 'partnership_cta_label']);

  const swatById = new Map(swatRows.map((row) => [row.id, row]));
  swatTranslations.forEach((row) => {
    const source = swatById.get(row.swat_point_id);
    if (source) addObjectPairs(map, source as unknown as Record<string, unknown>, row as unknown as Record<string, unknown>, ['title', 'summary', 'evidence', 'practical_impact', 'management_strategy']);
  });

  const timelineById = new Map(timelineRows.map((row) => [row.id, row]));
  timelineTranslations.forEach((row) => {
    const source = timelineById.get(row.timeline_event_id);
    if (source) addObjectPairs(map, source as unknown as Record<string, unknown>, row as unknown as Record<string, unknown>, ['title', 'subtitle', 'description', 'location_name', 'host_thank_you']);
  });

  const journalById = new Map(journalRows.map((row) => [row.id, row]));
  journalTranslations.forEach((row) => {
    const source = journalById.get(row.journal_post_id);
    if (source) addObjectPairs(map, source as unknown as Record<string, unknown>, row as unknown as Record<string, unknown>, ['title', 'subtitle', 'excerpt']);
  });

  const conceptById = new Map(conceptRows.map((row) => [row.id, row]));
  conceptTranslations.forEach((row) => {
    const source = conceptById.get(row.concept_id);
    if (source) addObjectPairs(map, source as unknown as Record<string, unknown>, row as unknown as Record<string, unknown>, ['title', 'tagline', 'short_description']);
  });

  const keyById = new Map(websiteKeys.map((row) => [row.id, row.default_text]));
  websiteValues.forEach((row) => addPair(map, keyById.get(row.translation_key_id), row.translated_text));
  translations = map;
  applyTranslations();
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
        const original = originalText.get(node) ?? node.data;
        if (!originalText.has(node)) originalText.set(node, original);
        const source = normalize(original);
        if (source) {
          const leading = original.match(/^\s*/)?.[0] || '';
          const trailing = original.match(/\s*$/)?.[0] || '';
          node.data = `${leading}${translated(source)}${trailing}`;
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
        const value = element.getAttribute(attribute);
        if (!value) return;
        if (!attributes!.has(attribute)) attributes!.set(attribute, value);
        element.setAttribute(attribute, translated(attributes!.get(attribute)!));
      });
    });
  });
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

# AGENTS.md — Bankrupt to 1 Million

These instructions are mandatory for every coding agent, AI assistant, contributor and automated refactor working in this repository.

## 1. Non-negotiable product rules

1. The public website is multilingual and must switch immediately through the existing language selector.
2. All 15 active languages come from Supabase `public.site_languages`. Never maintain a second hardcoded language list in the frontend.
3. Public business/content data comes from Supabase. Do not introduce mock arrays, duplicated content objects, hardcoded cards, hardcoded founder data, hardcoded timeline entries, hardcoded offers/needs, hardcoded concepts, or hardcoded media metadata in React components.
4. Visible UI copy must never be added as an untracked literal. Use the existing website i18n system and Supabase translation tables.
5. English is the canonical fallback/source language unless the relevant record declares another `original_language`.
6. A feature is not complete when it works only in English.

## 2. Existing multilingual architecture — reuse it

The repository already contains:

- `src/lib/websiteI18n.tsx`
- `src/components/LanguageSelector.tsx`
- `WebsiteI18nProvider`
- `useWebsiteI18n()`
- `t(key, fallback, variables)` for interface copy
- `translateText(fallback, variables)` only for source-text lookup compatibility
- `formatDate(...)` and `formatNumber(...)`
- Supabase RPC `get_website_translations`
- `public.site_languages`
- `public.website_translation_keys`
- `public.website_translations`
- entity-specific translation tables such as `journal_translations`, `proof_of_mind_concept_translations`, `founder_profile_translations`, `founder_timeline_event_translations`, `platform_update_translations`, `journey_calendar_entry_translations`, `journey_exchange_item_translations`, `offer_translations`, and others.

Do not replace this architecture with another i18n library, JSON locale files, inline language maps, browser-only translation, or per-component translation state unless the repository owner explicitly requests a migration.

## 3. UI copy rules

Every visitor-visible string in React/TSX must be one of the following:

1. A translated UI key:

```tsx
const { t } = useWebsiteI18n();
return <button>{t('offers.card.open', 'View offer')}</button>;
```

2. Localized dynamic content loaded from Supabase using the selected `language`.
3. A non-translatable proper noun, user-generated value, URL, technical identifier, or externally supplied brand name.

This includes:

- headings and paragraphs
- buttons and links
- navigation labels
- badges, statuses and filters
- form labels, placeholders, validation errors and success messages
- empty/loading/error states
- modal and drawer copy
- tooltips
- `title`, `aria-label`, `alt` and other accessibility text
- SEO title/description and social metadata
- date/number labels and pluralized count copy

### Forbidden

```tsx
<button>Read more</button>
const labels = { en: 'Need', es: 'Necesidad' };
const cards = [{ title: 'Our next stop' }];
```

### Required

```tsx
const { language, t, formatDate } = useWebsiteI18n();
```

Use stable semantic keys such as `founder_support.upcoming.title`, never keys derived from full English sentences.

## 4. Adding or changing interface copy

When new interface copy is required:

1. Add or upsert a canonical row in `website_translation_keys`.
2. Add translations in `website_translations` for every active language in `site_languages`, or ensure the established translation-job pipeline creates them.
3. Use `t('namespace.semantic_key', 'English fallback')` in the component.
4. Keep interpolation variables identical across all languages.
5. Record source usage in `website_translation_key_usage` when the existing workflow requires it.
6. Never silently leave a newly introduced key translated only in English.

The fallback argument is resilience, not the content source of truth and not permission to skip database translations.

## 5. Dynamic Supabase content rules

Before adding public content to source code, inspect the Supabase schema and existing data services/hooks.

Use canonical tables and their translation tables. Examples:

- Journal: `journal_posts` + `journal_translations`
- Proof of Mind: `proof_of_mind_concepts` + `proof_of_mind_concept_translations`
- Founders: `founder_profiles` + `founder_profile_translations`
- Timeline: `founder_timeline_events` + `founder_timeline_event_translations`
- Journey calendar: `journey_calendar_entries` + `journey_calendar_entry_translations`
- Needs/offers: `journey_exchange_items` + `journey_exchange_item_translations`, or `offers` + `offer_translations`
- Platform updates: `platform_updates` + `platform_update_translations`
- Media: `media_assets`, relation tables, and `website_media_slots`
- Long-form page content: `website_pages`, `website_page_blocks`, `website_page_block_translations`

For localized entity queries:

1. Read the current language from `useWebsiteI18n()`.
2. Request the selected-language translation.
3. Fall back to the canonical source record only when a published translation is unavailable.
4. Preserve identifiers, slugs, URLs, dates, booleans, ordering and relationships from the canonical record.
5. Do not copy database rows into TypeScript constants.
6. Do not render stale mock data when a Supabase request fails. Show a translated error/empty state.

## 6. Instant language switching

Language changes must update the complete visible page, not only the header.

A component that displays localized data must react to `language` changes. Include `language` in query/cache dependencies and reload or select the matching localized record without requiring a full page refresh, except where the existing journal route intentionally reloads with `?lang=`.

Preserve the existing performance behavior:

- session/memory translation bundle caching
- background preloading of other language bundles
- browser-language detection
- persisted selection in `localStorage`
- `document.documentElement.lang`
- RTL/LTR direction from `site_languages.is_rtl`

Do not regress these mechanisms.

## 7. No hardcoded content or structural duplication

Coding agents must search the codebase and Supabase before creating a new source of truth.

Do not create:

- local `data.ts` files containing public content
- component-level arrays representing database entities
- duplicate language registries
- duplicate founder/profile/timeline/offer/concept/media records
- hardcoded production URLs when an existing config or database relation exists
- embedded base64 production media
- placeholder cards that remain in production paths

Small technical constants are allowed only when they are not editorial/public content, for example query limits, enum keys, animation durations, route patterns and feature flags.

## 8. Accessibility and localization quality

- All accessibility strings must use translated keys or localized database fields.
- Do not concatenate translated fragments into a sentence. Translate the complete message with interpolation variables.
- Use `Intl` through `formatDate` and `formatNumber`; do not manually format dates/numbers for one locale.
- Layouts must tolerate longer translated text and RTL.
- Do not truncate critical CTA or form copy merely because another language is longer.
- Preserve native language names from `site_languages.native_name` in the selector.

## 9. Supabase schema and migration discipline

- Inspect existing tables, columns, foreign keys, RLS policies, RPCs and migrations before proposing schema changes.
- Use migrations for DDL. Never modify production schema through ad-hoc undocumented SQL.
- Reuse translation conventions: `language_code`, translation status/source timestamps, unique entity/language pairing and FK to `site_languages`.
- New public translatable entities require a translation strategy and table/RPC/view before frontend completion.
- Keep RLS enabled and do not weaken policies to make frontend code easier.
- Never expose service-role keys in frontend code.

## 10. Required agent workflow

Before editing:

1. Read this file completely.
2. Inspect `src/lib/websiteI18n.tsx`, the affected components and existing data access patterns.
3. Inspect the relevant Supabase tables and translation tables.
4. Search for an existing translation key before creating another.
5. Identify all visitor-visible strings and dynamic fields touched by the change.

During editing:

1. Reuse `useWebsiteI18n()`.
2. Keep selected language in all localized query dependencies.
3. Connect real Supabase data; do not add mocks.
4. Add loading, empty and error states through translation keys.
5. Preserve responsive behavior, accessibility and RTL.

Before finishing:

1. Search changed files for new visible hardcoded strings.
2. Verify the feature in English plus at least Spanish and one substantially different language; verify RTL when an active RTL language exists.
3. Switch languages while remaining on the same page and confirm all visible UI and dynamic content updates.
4. Confirm missing translation fallback behavior.
5. Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

6. Report which Supabase tables/RPCs and translation keys were used or added.

## 11. Definition of done

A public frontend change is complete only when:

- it uses real Supabase data where content is dynamic;
- every new visible interface string has a canonical translation key;
- all 15 active languages are supported through the established database translation system;
- switching language updates the complete affected experience immediately;
- English fallback is safe but not used as a substitute for missing translation work;
- dates, numbers, accessibility copy, empty states, errors and SEO are localized;
- no hardcoded editorial content, duplicate data source or mock production content was introduced;
- lint, typecheck, tests and build pass.

If any condition is unmet, the agent must state that the task is incomplete rather than claiming completion.

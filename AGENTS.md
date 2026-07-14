# AGENTS.md — Bankrupt to 1 Million

These instructions are mandatory for every coding agent, AI assistant, contributor and automated refactor working in this repository.

## 0. Absolute architecture contract — zero exceptions

This website is **database-driven, backend-first and multilingual by design**. These are not preferences. They are hard requirements.

1. **Supabase is the single source of truth for all production data.**
2. **No production component may contain hardcoded business data, editorial content, entity records, counters, cards, status totals, translations, media metadata, founder data, timeline data, offers, needs, concepts, messages, posts, locations or any other content that belongs in Supabase.**
3. **No temporary hardcoding is allowed.** “Temporary”, “fallback”, “until backend is ready”, “for testing”, “just one card”, or “quick fix” are not valid exceptions.
4. **No mock data may execute in a production route.** Mock fixtures are permitted only inside isolated tests, Storybook-like development tooling, or explicitly non-production fixtures that cannot be imported by production code.
5. **Every new feature and every bug fix must follow this order:**
   1. inspect and verify database data;
   2. inspect or design schema, relationships, constraints and translations;
   3. inspect or implement RLS, RPCs, views, triggers and Edge Functions;
   4. prove the backend query returns the correct live payload;
   5. only then build or change the frontend;
   6. verify the deployed frontend consumes that live payload.
6. **Frontend-first implementation is forbidden.** Do not build UI around assumed fields, guessed response shapes, local arrays or placeholder records.
7. **A successful HTTP response is not proof of correctness.** Agents must inspect the actual returned payload, record count, status distribution and language-specific fields.
8. **Do not claim a bug is fixed until the complete live chain is verified:** Supabase row → backend access/RLS/RPC → API payload → frontend parsing → React state → rendered component → deployed build.
9. **Never hide backend/query failures by returning `[]`, `0`, placeholder content or stale local data.** Surface a translated error state and keep diagnostics actionable.
10. **All count cards, dashboards, summaries and badges must be derived from live Supabase data.** Never hardcode totals and never initialize zeros in a way that can be mistaken for successfully loaded data.
11. **All production entities must remain editable through Supabase-backed admin workflows where applicable.** Public data must not require a code deployment to change.
12. **No component-specific exception is allowed.** These rules apply to public pages, admin pages, modals, cards, dashboards, navigation, SEO, forms, counters, maps, timelines, media views and all future components.

If the required database/backend foundation does not yet exist, the agent must build that foundation first. If it cannot be completed, the task must be reported as incomplete. The agent may not bypass the missing backend with frontend hardcoding.

## 1. Non-negotiable product rules

1. The public website is multilingual and must switch immediately through the existing language selector.
2. All 15 active languages come from Supabase `public.site_languages`. Never maintain a second hardcoded language list in the frontend.
3. Public business/content data comes from Supabase. Do not introduce mock arrays, duplicated content objects, hardcoded cards, hardcoded founder data, hardcoded timeline entries, hardcoded offers/needs, hardcoded concepts, or hardcoded media metadata in React components.
4. Visible UI copy must never be added as an untracked literal. Use the existing website i18n system and Supabase translation tables.
5. English is the canonical fallback/source language unless the relevant record declares another `original_language`.
6. A feature is not complete when it works only in English.
7. The selected language must affect both interface copy and dynamic entity content.
8. A component may not invent its own language behavior, translation map or fallback hierarchy.
9. A language selector that changes only static UI while dynamic data remains in another language is a release-blocking defect.

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

Also forbidden:

```tsx
const approvedCount = 1;
const defaultMessages = [];
const fallbackFounder = { name: 'Kevin' };
const mockTimeline = productionData;
```

A zero, empty array or placeholder object is not an acceptable silent substitute for failed live data loading.

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
7. Verify the query against real production-shaped data before wiring the component.
8. For counters, verify both the row list and aggregate result against the same source of truth.
9. Normalize only transport differences, never invent missing values.
10. Do not swallow parse errors or convert malformed payloads into empty successful states.

## 6. Mandatory database-first and backend-first workflow

For every feature or bug, the implementation sequence is mandatory.

### Phase A — Database inspection

1. Identify the canonical table or tables.
2. Inspect columns, types, defaults, constraints, indexes, foreign keys and existing records.
3. Inspect translation tables and all 15 active languages.
4. Confirm whether the required data already exists.
5. Query the exact expected result directly in Supabase.

### Phase B — Backend and security

1. Inspect RLS policies for `anon`, `authenticated`, admin and service roles.
2. Inspect existing views, RPCs, triggers, queues and Edge Functions.
3. Add migrations before frontend code when schema/backend work is needed.
4. Use `security definer` only where justified and with an explicit `search_path`.
5. Validate the actual API/RPC response using the same role and claims as the real user.
6. Confirm that unauthorized users cannot access restricted data.
7. Confirm that the response contains the expected rows, translations, counts and fields.

### Phase C — Frontend integration

Only after Phase A and B are proven:

1. Add or update the data-access function.
2. Type the real response shape; do not type an assumed shape.
3. Handle loading, error, empty and success as distinct states.
4. Never initialize placeholder zeroes as if data loaded successfully.
5. Bind the React component to live data.
6. Include `language` in all localized query and cache dependencies.
7. Remove any old mock, hardcoded or duplicate source.

### Phase D — End-to-end verification

1. Verify the exact database row.
2. Verify the exact backend payload.
3. Verify the browser request reaches the intended Supabase project.
4. Verify parsing and React state.
5. Verify the rendered value in the deployed application.
6. Verify the deployed commit SHA/status.
7. Verify a language switch updates all affected dynamic and static content.

A task is not done if only the SQL query, local code or deployment status is correct. The live rendered result must also be correct.

## 7. Instant language switching

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

## 8. No hardcoded content or structural duplication

Coding agents must search the codebase and Supabase before creating a new source of truth.

Do not create:

- local `data.ts` files containing public content
- component-level arrays representing database entities
- duplicate language registries
- duplicate founder/profile/timeline/offer/concept/media records
- hardcoded production URLs when an existing config or database relation exists
- embedded base64 production media
- placeholder cards that remain in production paths
- local counters for database entities
- duplicated backend totals in frontend constants
- local translation dictionaries
- hardcoded admin module records
- fake success states after failed requests

Small technical constants are allowed only when they are not editorial/public content, for example query limits, enum keys, animation durations, route patterns and feature flags.

Before adding any constant, ask: “Could an administrator, translator, editor, visitor submission, database migration or Supabase record legitimately change this value?” If yes, it belongs in Supabase, not source code.

## 9. Data loading and error-state guardrails

1. Loading, empty, error and success are four different states.
2. `0` is valid data only after a successful count query.
3. `[]` is valid data only after a successful list query.
4. A failed, malformed or unauthorized request must never be displayed as zero records.
5. Parsing failures must throw or produce a translated visible error.
6. Do not catch an error and silently return an empty array.
7. Do not keep stale production data after a failed refresh unless the UI clearly labels it as stale.
8. Use cache-busting or `no-store` where freshness is required, but do not use caching as an explanation without proving it.
9. The frontend must target the intended Supabase project from environment configuration; project mismatches must be verified, not assumed.
10. Dashboard cards and badges must show a loading skeleton or dash until real data arrives, never misleading zeros.

## 10. Accessibility and localization quality

- All accessibility strings must use translated keys or localized database fields.
- Do not concatenate translated fragments into a sentence. Translate the complete message with interpolation variables.
- Use `Intl` through `formatDate` and `formatNumber`; do not manually format dates/numbers for one locale.
- Layouts must tolerate longer translated text and RTL.
- Do not truncate critical CTA or form copy merely because another language is longer.
- Preserve native language names from `site_languages.native_name` in the selector.

## 11. Supabase schema and migration discipline

- Inspect existing tables, columns, foreign keys, RLS policies, RPCs and migrations before proposing schema changes.
- Use migrations for DDL. Never modify production schema through ad-hoc undocumented SQL.
- Reuse translation conventions: `language_code`, translation status/source timestamps, unique entity/language pairing and FK to `site_languages`.
- New public translatable entities require a translation strategy and table/RPC/view before frontend completion.
- Keep RLS enabled and do not weaken policies to make frontend code easier.
- Never expose service-role keys in frontend code.
- Do not add redundant RPCs merely to work around an unverified frontend bug.
- Prefer the simplest proven data path that preserves security and correctness.
- Every new RPC must have a clear reason, explicit authorization and a tested response shape.
- Every trigger or Edge Function must be verified with a real inserted or updated record.

## 12. Required agent workflow

Before editing:

1. Read this file completely.
2. Inspect `src/lib/websiteI18n.tsx`, the affected components and existing data access patterns.
3. Inspect the relevant Supabase tables and translation tables.
4. Search for an existing translation key before creating another.
5. Identify all visitor-visible strings and dynamic fields touched by the change.
6. Write down the canonical source of truth for every displayed value.
7. Prove the backend result before touching the component.

During editing:

1. Reuse `useWebsiteI18n()`.
2. Keep selected language in all localized query dependencies.
3. Connect real Supabase data; do not add mocks.
4. Add loading, empty and error states through translation keys.
5. Preserve responsive behavior, accessibility and RTL.
6. Delete obsolete mock/hardcoded data in the same change.
7. Do not introduce silent fallback arrays, zeroes or placeholder records.
8. Keep database/backend changes ahead of frontend changes in the implementation history whenever practical.

Before finishing:

1. Search changed files for new visible hardcoded strings.
2. Search changed files for arrays/objects that duplicate Supabase entities.
3. Verify the feature in English plus at least Spanish and one substantially different language; verify RTL when an active RTL language exists.
4. Switch languages while remaining on the same page and confirm all visible UI and dynamic content updates.
5. Confirm missing translation fallback behavior.
6. Verify the exact Supabase row count and returned API payload.
7. Verify the live deployed component displays those same values.
8. Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

9. Report which Supabase tables/RPCs/views/Edge Functions and translation keys were used or added.
10. Report the deployment commit and whether the live result was verified.

## 13. Mandatory prohibited shortcuts

An agent must never:

- build the frontend before checking the database;
- guess column names or response shapes;
- hardcode content because a query is inconvenient;
- add a local language map;
- use static JSON as a production content source;
- return `[]` or `0` after a failed request;
- call a backend correct based only on HTTP 200;
- call a deployment correct based only on CI success;
- weaken RLS to make data appear;
- use a service-role key in browser code;
- create duplicate tables/RPCs without first understanding existing ones;
- claim “fixed” before the live UI proves it;
- introduce an exception for a single component, page or deadline.

## 14. Definition of done

A public or admin frontend change is complete only when:

- it uses real Supabase data for every dynamic value;
- every new visible interface string has a canonical translation key;
- all 15 active languages are supported through the established database translation system;
- switching language updates the complete affected experience immediately;
- English fallback is safe but not used as a substitute for missing translation work;
- dates, numbers, accessibility copy, empty states, errors and SEO are localized;
- no hardcoded editorial content, duplicate data source or mock production content was introduced;
- loading, error, empty and success states are truthfully represented;
- database, backend, API payload, frontend state and deployed rendering have all been verified;
- lint, typecheck, tests and build pass.

If any condition is unmet, the agent must state that the task is incomplete rather than claiming completion.

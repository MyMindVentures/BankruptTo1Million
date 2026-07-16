# Reusable Frontend Component Library

This document defines the reusable frontend components for the Bankrupt to 1 Million website.

The goal is to prevent duplicated UI, duplicated translation logic and inconsistent behavior across pages.

Every visitor-facing component must work with the shared 30-language selector.

---

## Core Rules

1. Static UI text must use stable translation keys through `useWebsiteI18n()`.
2. Database-backed content must use localized database views or translation tables first.
3. `translateText()` may be used as a fallback for database content with source-text translation coverage.
4. Dates must use `formatDate()`.
5. Numbers must use `formatNumber()`.
6. Components must own their own ARIA labels, placeholders, title attributes, alt text and state messages.
7. Brand names, personal names, URLs, identifiers and code must not be automatically translated.
8. Every component must support RTL layouts.
9. Every component must support responsive layouts.
10. Pages should compose reusable components instead of duplicating complete cards, forms, states, metrics or navigation structures.

---

## 1. Global Shell

### `SiteHeader`
Responsibilities:
- Mission logo
- Desktop navigation
- Mobile navigation
- Language selector
- Menu accessibility

### `SiteFooter`
Responsibilities:
- Mission summary
- Sitemap
- Legal links
- Trust indicators
- Back-to-top action

### `PageShell`
Responsibilities:
- Shared page width
- Shared page spacing
- Background and layout structure

### `LanguageSelector`
Responsibilities:
- Display all 30 active languages
- Persist selected language
- Show localized label and ARIA text
- Handle loading and disabled states

### `SeoMetadata`
Responsibilities:
- Localized document title
- Localized meta description
- Social sharing metadata
- Canonical URL where applicable

---

## 2. Page Introductions

### `PageHero`
Supports:
- Eyebrow
- Title
- Description
- Primary and secondary actions
- Optional media or aside slot

### `SectionHeading`
Supports:
- Eyebrow
- Title
- Description
- Alignment
- Optional action

### `EditorialIntro`
Supports:
- Long-form introduction
- Optional image
- Optional quote

### `QuoteCard`
Supports:
- Icon
- Quote
- Supporting copy
- Attribution

---

## 3. Actions and Navigation

### `Button`
Variants:
- Primary
- Secondary
- Ghost
- Danger
- Loading

### `TextLink`
Supports:
- Internal links
- External links
- Icons
- Accessible external-link labels

### `Breadcrumbs`
Responsibilities:
- Localized route hierarchy
- Current page state
- Accessible navigation markup

### `LocalSectionNav`
Use for:
- Founder Profile section navigation
- Long-form legal pages
- Long landing pages

### `FilterTabs`
Supports:
- Localized labels
- Active state
- Item counts
- Keyboard accessibility

### `Pagination`
Supports:
- Previous
- Next
- Page number
- Total pages
- Localized status text

### `BackLink`
Responsibilities:
- Standardized back navigation
- Localized label
- Optional custom destination

---

## 4. Content Cards

### `FounderCard`
Displays:
- Portrait
- Founder badges
- Name
- Role
- Biography
- Tags
- Metrics
- CTA

### `FounderVideoCard`
Displays:
- Embedded video
- Founder identity
- Personal message
- Profile CTA

### `JournalPostCard`
Displays:
- Category
- Title
- Excerpt
- Author
- Publication date
- Reading time
- CTA

### `ConceptCard`
Displays:
- Status
- Category
- Title
- Tagline
- Owner or founder
- CTA

### `OfferCard`
Displays:
- Founder
- Offer type
- Description
- Media
- CTA

### `TimelineCard`
Displays:
- Event type
- Date
- Title
- Description
- Location
- Host
- Connected story

### `PlatformUpdateCard`
Displays:
- Update type
- Title
- Description
- Date
- Related content

### `MediaCard`
Displays:
- Image or video preview
- Media metadata
- Open or play action

### `FoundingHeroCard`
Displays:
- Public recognition profile
- Role
- Biography
- Location
- Public links

### `SupportActionCard`
Displays:
- Need, offer or support action
- Founder or mission target
- Description
- CTA

---

## 5. People and Identity

### `Avatar`
Supports:
- Image
- Initials fallback
- Decorative mode
- Localized alt handling

### `PersonIdentity`
Displays:
- Avatar
- Name
- Role
- Location

### `FounderBadges`
Examples:
- Co-founder
- Building in public
- Open to partnerships

### `SocialLinks`
Supports:
- Website
- GitHub
- LinkedIn
- Instagram
- X

### `HostRecognition`
Displays:
- Host identity
- Location
- Thank-you note
- Optional profile link

---

## 6. Data Display

### `MetricCard`
Displays:
- Localized label
- Localized number
- Optional icon

### `MetricGrid`
Responsibilities:
- Responsive metric layout
- Consistent spacing and semantics

### `TagList`
Responsibilities:
- Translate database tags where supported
- Display empty state
- Support wrapping and truncation

### `DefinitionList`
Use for:
- Founder snapshots
- Offer details
- Legal facts
- Metadata summaries

### `StatusBadge`
Responsibilities:
- Translate canonical enum values
- Apply visual variant

### `DateTime`
Responsibilities:
- Use `formatDate()`
- Render semantic `<time>` markup
- Support date-only and date-time modes

### `ReadingTime`
Responsibilities:
- Localized minute count
- Correct singular and plural forms

### `LocationLabel`
Responsibilities:
- Location icon
- Localized location text
- Optional link

---

## 7. Founder Profile Components

The current `FounderProfilePage.tsx` should be decomposed into these components.

### `FounderProfileHero`
Includes:
- Founder badges
- Founder identity
- Role
- Headline
- Biography
- Location
- Main CTAs
- Portrait
- Metrics

### `FounderSnapshot`
Displays:
- Current role
- Base location
- Main focus
- Public since

### `FounderStorySection`
Displays:
- Full biography
- Founder story
- Personal mission quote

### `FounderSwatSection`
Displays:
- Strengths
- Struggles
- Section explanation

### `SwatPointCard`
Displays:
- Title
- Summary
- Evidence or context
- Practical impact or risk
- Management strategy

### `FounderCapabilitiesSection`
Displays:
- Core strengths
- Expertise
- Responsibilities
- Lived experience

### `FounderTimelineSection`
Displays:
- Timeline filters
- Timeline event list
- Empty states

### `FounderWorkSection`
Displays:
- Founder posts
- Proof of Mind concepts
- Latest publications

### `FounderMissionSection`
Displays:
- Personal mission
- Values

### `FounderFinalCta`
Displays:
- Partnership or support message
- Primary CTA
- Secondary CTA

### `FounderSwitch`
Displays:
- Link to the other co-founder

---

## 8. Forms

### `FormField`
Supports:
- Label
- Hint
- Error
- Required state

### `TextInput`
### `TextArea`
### `SelectField`
### `CheckboxField`
### `RadioGroup`
### `FileUpload`
### `FormActions`
### `FormStatusMessage`
### `SubmitButton`

All form validation, placeholders, help text, success messages and error messages must be translated internally.

---

## 9. Feedback and States

### `LoadingState`
### `EmptyState`
### `ErrorState`
### `SuccessState`
### `InlineNotice`
### `Modal`
### `ConfirmDialog`
### `Toast`
### `SkeletonCard`

Each state component must include:
- Localized title
- Localized description
- Correct ARIA role
- Optional action

---

## 10. Media and Interactive UI

### `ResponsiveImage`
### `VideoEmbed`
### `MediaGallery`
### `MediaLightbox`
### `JourneyMap`
### `Timeline`
### `ShareActions`
### `QrCodeCard`

These components must support localized controls, captions, alt text and accessibility labels.

---

## 11. Legal and Trust

### `LegalSection`
### `OwnershipNotice`
### `PrivacyNotice`
### `TransparencyBadge`
### `ExternalSourceNotice`

---

## 12. Translation Helpers

### `TranslatedText`
Use for explicitly translated database content.

### `TranslatedEnum`
Maps canonical enum values to stable translation keys.

Examples:
- `founder_post`
- `partnership`
- `in_progress`
- `published`

### `LocalizedDate`
Wrapper around `formatDate()`.

### `LocalizedNumber`
Wrapper around `formatNumber()`.

### `LocalizedList`
Formats translated lists with locale-aware separators and conjunctions.

---

## Public component i18n manifest (required)

Every public React surface under `src/components/**`, `src/pages/**` (except admin/private routes), `src/App.tsx`, and the DOM injectors listed in `scripts/public-i18n-surfaces.json` must export a manifest constant:

```tsx
export const EXAMPLE_I18N_MANIFEST = {
  componentKey: 'journal.place_context.section',
  namespace: 'journal.place_context',
  translationKeys: [
    'journal.place_context.section.title',
  ] as const,
  keyPatterns: ['journal.place_context.place_type.*'] as const,
  entityContent: {
    rpc: 'get_localized_journal_place_context',
    tables: ['journal_post_place_context_translations'],
  },
} as const satisfies I18nManifest;
```

Rules:

1. Declare every static UI key used via `t('namespace.key')` in `translationKeys`, or cover dynamic keys with `keyPatterns`.
2. Document editorial/database copy sources in `entityContent` — do not force entity fields into UI key manifests.
3. Add canonical rows to `website_translation_keys` (and all 30 active languages in `website_translations`) through migrations before merge.
4. Register the component in `website_ui_components` and link keys in `website_ui_component_translation_keys` in the same migration when introducing a new surface.
5. Run `npm run verify:i18n` locally; it is wired into `npm test` / `precommit` and fails on missing manifests, undeclared keys, hardcoded visitor-facing UI, and registry drift.

Shared type: `src/lib/i18nManifest.ts` (`I18nManifest`, `manifestCoversKey()`).

Verifier: `scripts/verify-public-i18n.mjs` · allowlist: `scripts/public-i18n-surfaces.json`.

### Generating keys/registry migrations

When adding or changing public UI keys or manifests, use the deterministic generators (review output before merge):

```bash
npm run generate:i18n-keys      # writes supabase/migrations/*_public_i18n_keys_bootstrap.sql
npm run generate:registry-seed  # writes supabase/migrations/*_public_ui_component_registry_seed.sql
```

**`generate:i18n-keys`** scans enforced surfaces in `scripts/public-i18n-surfaces.json`, collects every `t('key', 'fallback')` call, diffs against keys already present in `supabase/migrations/*.sql`, and emits SQL that:

1. Upserts missing rows into `website_translation_keys`
2. Bootstraps `website_translations` for all active `site_languages` (English default text as interim published copy)
3. Enqueues proper translation jobs via `private.enqueue_translation_job_expansion(..., 'public-i18n-registry-v1')`

**`generate:registry-seed`** parses each `*_I18N_MANIFEST` export and emits upserts for `website_ui_components` plus key links in `website_ui_component_translation_keys` (explicit manifest keys plus `t()` keys covered by the manifest).

Workflow:

1. Update component code and manifests first.
2. Run both generators; review the SQL diff (split by namespace if a file is too large to review comfortably).
3. Apply migrations to Supabase (`supabase db push` or project migration pipeline).
4. Run `npm run verify:i18n` (offline migration proof) and `npm run verify:i18n:live` when Supabase env vars are available (`--require-db`).

Shared utilities: `scripts/i18n-script-utils.mjs`.

---

## Component Acceptance Criteria

A reusable component is complete only when:

- All static text uses translation keys.
- All database content uses the correct localization path.
- All dates and numbers are locale-aware.
- All loading, empty, success and error states are translated.
- All ARIA labels, title attributes, placeholders and alt text are translated.
- RTL layout works.
- Mobile and desktop layouts work.
- Keyboard navigation works where applicable.
- The component can be reused without copying its internal markup.

---

## Recommended Implementation Order

1. Shared feedback states
2. Button and link primitives
3. Metric and status components
4. Founder Profile components
5. Journal and Concept cards
6. Form components
7. Media components
8. Timeline and map components
9. Legal and trust components
10. Remaining page-specific composition

# Founders Page Component Audit

Route: `/founders`

This audit covers every frontend component currently rendered on the Founders overview page.

## Component Tree

```text
FoundersOverviewPage
├── Header
│   ├── MissionLogo
│   ├── Desktop navigation
│   ├── LanguageSelector
│   ├── Mobile menu toggle
│   └── Mobile navigation
├── Founders overview hero (inline)
├── Founder directory intro (inline)
├── FounderOverviewCard[]
├── Founder video section intro (inline)
├── FounderVideoCard[]
├── Founders closing section (inline)
└── Footer
```

## Overall Assessment

The page is functional, deployed and connected to Supabase. Static UI copy is linked to the website i18n system and the Founder translation namespaces now have complete 15-language database coverage.

The primary remaining weaknesses are component extraction, media styling, unnecessary data refetching, empty/error recovery and responsive card density.

---

## 1. `FoundersOverviewPage`

File: `src/pages/FoundersOverviewPage.tsx`

### Working correctly

- Uses the shared `Header` and `Footer`.
- Loads public Founder data from `founder_profiles_public`.
- Prevents state updates after unmount with a cancellation flag.
- Provides localized loading, error and empty states.
- Uses semantic `main` and `section` elements.
- Directory and video sections use `aria-labelledby`.
- Founder cards and video cards are separated into reusable components.
- Document title is localized.

### Problems found

#### A. Founder data is refetched on every language change

The loading effect depends on `t`:

```ts
useEffect(() => {
  document.title = t(...);
  // Supabase request
}, [t]);
```

Because `t` changes when the active language or translation bundle changes, the complete Founder query runs again during language switching. The Founder records themselves do not need to be refetched.

### Required correction

Split this into two effects:

```ts
useEffect(() => {
  // Fetch founders once.
}, []);

useEffect(() => {
  document.title = t(...);
}, [t]);
```

#### B. Hero, directory intro, video intro and closing section remain inline

These page sections are still written directly inside the page instead of using reusable building blocks.

Recommended components:

- `FoundersPageHero`
- `FounderDirectoryHeader`
- `FounderVideoSectionHeader`
- `FoundersClosingStatement`

This is not a functional blocker, but it prevents consistent reuse and makes the page harder to test independently.

#### C. Error state has no recovery action

When Supabase fails, the page only displays an error message. It should offer a localized retry button.

Recommended:

- reusable `ErrorState`
- retry callback
- optional link back to Home or Journal

#### D. Loading state has no layout-preserving skeleton

The current text-only loading state causes the page height and card layout to jump after data arrives.

Recommended:

- two `FounderCardSkeleton` components
- `aria-busy` on the directory region

---

## 2. `FounderOverviewCard`

File: `src/components/founders/FounderOverviewCards.tsx`

### Working correctly

- Entire card is keyboard-focusable through one anchor.
- Has a localized accessible link label.
- Founder portrait has localized alt text.
- Decorative cover image correctly uses an empty alt attribute.
- Role, headline, biography, location and expertise use `translateText()`.
- Metrics use `formatNumber()`.
- Metric labels and badges use stable translation keys.
- Uses a stable Founder ID as the React list key in the parent.

### Problems found

#### A. Images are not lazy-loaded

The cover image and portrait can load immediately even when below the fold.

Recommended:

```tsx
<img loading="lazy" decoding="async" ... />
```

The first visible Founder portrait may use eager loading, but later cards should be lazy.

#### B. Metric markup has weak semantics

The metrics are generic nested `div` elements. Screen readers receive the values and labels, but the relationship is not explicit.

Recommended:

- reusable `MetricGrid`
- each metric using `dl`, `dt` and `dd`, or an accessible grouped structure

#### C. Card number is exposed without meaning

The visible `01` and `02` numbers are not marked decorative. A screen reader may announce them without useful context.

Recommended:

```tsx
<span aria-hidden="true">01</span>
```

#### D. No fallback label when biography/headline is missing

Optional fields disappear correctly, but a Founder card can become visually sparse if multiple fields are absent. The component should define a minimum information contract or a deliberate fallback.

#### E. Large clickable card needs visible focus consistency

The CSS includes `:focus-visible`, which is good. Verify the focus outline remains visible in all themes and does not rely only on movement and border color.

---

## 3. `FounderVideoCard`

File: `src/components/founders/FounderOverviewCards.tsx`

### Working correctly

- Supports YouTube, youtu.be and Vimeo URLs.
- Uses YouTube's privacy-enhanced embed domain.
- Has a localized iframe title.
- Provides a native video fallback for non-embed URLs.
- Video fallback text is localized.
- Founder role and message content use the i18n system.
- Profile CTA is localized.

### Critical problem found

#### A. No dedicated CSS exists for the video components

The following classes are rendered but are not defined in `foundersOverview.css` or elsewhere found by repository search:

- `.founders-video-section`
- `.founders-video-grid`
- `.founder-video-card`
- `.founder-video-card__media`
- `.founder-video-card__content`
- `.founder-video-card__identity`
- `.founder-video-card__avatar`

This means the video section depends on browser defaults and generic global styles. It will not match the premium Founder cards and can break iframe sizing.

### Required correction

Add dedicated responsive styling with:

- responsive grid
- consistent card border/background/radius
- fixed media aspect ratio
- `iframe` and `video` set to full width and height
- overflow handling
- mobile stacking
- identity row styling
- CTA alignment

#### B. Embed URL parser is embedded in the card file

`getVideoEmbed()` should move to a reusable media utility or `VideoEmbed` component because other pages will need the same behavior.

#### C. Native video source has no MIME type

Where possible, the source metadata should include a type. This requires the database to expose media MIME type or the component to infer it safely.

#### D. Avatar has empty alt text

This is acceptable because the founder's name appears directly beside it. It should remain deliberately decorative and may be marked with `aria-hidden="true"` on its wrapper for clarity.

---

## 4. Founders Hero

Currently inline in `FoundersOverviewPage.tsx`.

### Working correctly

- One page-level `h1`.
- Localized eyebrow, title, description, quote and note.
- Decorative icon is hidden from assistive technology.
- Responsive two-column layout changes to one column below 1100px.

### Problems found

#### A. Title width is extremely narrow

```css
.founders-overview-hero h1 { max-width: 9ch; }
```

This creates the intentional editorial line breaks visible in English, but longer translated titles can become excessively tall or awkward. German, French, Spanish and other languages may produce poor wrapping.

### Required correction

Use language-resilient sizing:

- wider `max-width` on medium screens
- `text-wrap: balance`
- language-specific override only when truly necessary
- avoid designing line breaks around the English string alone

#### B. Quote width has the same translation risk

```css
max-width: 9ch;
```

The quote card can become much taller in translated languages.

---

## 5. Founder Directory Section

Currently inline in `FoundersOverviewPage.tsx`.

### Working correctly

- Semantic section heading association.
- Localized description.
- Clear loading, error and empty branches.

### Problems found

- No `aria-busy` during loading.
- Grid is rendered even during loading/error, although empty.
- No retry action.
- No skeleton state.
- Intro heading also uses a narrow `10ch` maximum width, which may wrap poorly in translations.

---

## 6. Founder Cards Grid

CSS: `src/styles/foundersOverview.css`

### Working correctly

- Two columns on wide screens.
- One column below 1100px.
- Card internals stack below 760px.
- Metrics progressively collapse from three to two to one column.

### Problems found

#### A. Two complex split-layout cards are dense at desktop/tablet widths

Each Founder card contains its own two-column visual/content split while two cards are displayed beside each other. This produces narrow text columns and tall cards, especially with translated copy.

Recommended options:

1. Keep two Founder cards side by side but make each card vertically stacked.
2. Keep the internal split layout but show one Founder card per row.
3. Use a wider page container and stricter text truncation.

The current combination is visually ambitious but translation-sensitive.

#### B. CSS is stored as one minified line

The entire stylesheet is one line. This makes maintenance, code review and debugging unnecessarily difficult.

Required:

- format the CSS normally
- group rules by component
- add section comments

#### C. No RTL-specific component verification

The global document direction changes, but the card has visual assumptions such as number alignment, CTA arrow direction and image/content order. RTL should be explicitly verified.

Potential adjustments:

- flip directional arrows or use logical icons where appropriate
- use logical properties such as `margin-inline`, `padding-inline`, `inset-inline`
- confirm visual/content ordering

---

## 7. `Header`

File: `src/components/Header.tsx`

### Working correctly

- Desktop and mobile navigation are separate and accessible.
- Menu button has localized labels.
- `aria-controls` and `aria-expanded` are present.
- Language selector is available in both desktop and mobile layouts.
- Menu closes when a navigation item is selected.

### Problems found

#### A. Mobile menu does not close when Escape is pressed

Recommended:

- close on Escape
- optionally restore focus to the menu button

#### B. Mobile menu does not explicitly manage focus

For a full-screen or prominent panel, keyboard focus should be constrained or at minimum moved predictably.

#### C. Active route is not indicated

The Founders page navigation link has no `aria-current="page"` state.

---

## 8. `LanguageSelector`

File: `src/components/LanguageSelector.tsx`

### Working correctly

- Uses the shared website language state.
- Displays native language names.
- Disables itself before languages load.
- Has a localized accessible label.

### Problems found

#### A. The visible title attribute is not localized

```tsx
title={selectedLanguage?.english_name || 'Language'}
```

The fallback `Language` bypasses `t()`, and the selected language title uses the English name rather than the native or localized name.

Recommended:

```tsx
title={selectedLanguage?.native_name || t('header.language_label', 'Language')}
```

#### B. No loading indicator

The selector only becomes disabled. A small localized loading state could improve clarity on slow connections.

---

## 9. `Footer`

The Footer is shared with the rest of the site and already uses explicit translation keys for its visitor-facing labels.

Founders-page-specific concern:

- The Footer appears after long cards and optional videos; verify spacing between the closing statement and Footer on all breakpoints.

---

## 10. Founder Overview Types

File: `src/components/founders/founderOverviewTypes.ts`

### Working correctly

- Keeps the page and cards aligned to one shared data contract.
- Optional database fields are represented as nullable.
- Array fields are typed.

### Improvement

The type duplicates part of `FounderProfile`. Consider defining a shared `FounderSummary` base type and extending it for overview/profile use to prevent drift.

---

## Priority Order

### Priority 1 — Functional/frontend quality

1. Add complete CSS for `FounderVideoCard` and the video section.
2. Stop refetching Founder data on every language change.
3. Correct translation-sensitive hero and quote widths.
4. Localize the `LanguageSelector` title fallback.
5. Add retry behavior to the Founder loading error state.

### Priority 2 — Accessibility and performance

6. Add `loading="lazy"` and `decoding="async"` to non-critical Founder images.
7. Mark decorative card numbers with `aria-hidden`.
8. Add `aria-busy` and loading skeletons.
9. Add `aria-current` to active navigation.
10. Test and correct RTL directionality.

### Priority 3 — Architecture and maintainability

11. Extract inline Founder page sections into reusable components.
12. Move embed parsing into a reusable `VideoEmbed` utility/component.
13. Replace generic metric markup with `MetricGrid`.
14. Format and organize `foundersOverview.css`.
15. Consolidate duplicated Founder TypeScript types.

---

## Acceptance Criteria

The Founders page is frontend-complete when:

- Every rendered component has intentional styling.
- All 30 languages fit without broken or excessive wrapping.
- Changing language does not refetch Founder records.
- Images and videos are responsive and performance-aware.
- Loading, empty and error states are actionable and accessible.
- Keyboard navigation works through Header, selector, cards, videos and Footer.
- RTL languages display in a deliberate layout.
- No page-specific component remains duplicated or monolithic without reason.
- Railway build and deployment complete successfully.

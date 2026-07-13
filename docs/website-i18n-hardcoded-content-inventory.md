# Bankrupt to 1 Million — Hardcoded Website Content Inventory

Status: inventory for migration to the central Supabase website i18n backend.

## Objective

Every visitor-facing string must be resolved through one of two central translation layers:

1. `website_translation_keys` + `website_translations` for short UI strings.
2. `website_pages` + `website_page_blocks` + `website_page_block_translations` for longer static page content.

Domain content that already has dedicated translation tables remains in those domain tables, but all surrounding interface labels must use the central website translation system.

## Translation rules

Translate:

- navigation labels
- headings, eyebrow labels and paragraphs
- button and link labels
- form labels, placeholders, helper text and validation messages
- loading, empty, success and error states
- filters, badges and status labels
- date and count suffixes
- modal copy
- SEO titles and descriptions
- image alt text and ARIA labels
- injected HTML from DOM enhancement modules

Do not translate:

- brand names such as `Bankrupt to 1 Million`, `Proof of Mind`, `MyMindVentures.io` unless a deliberate localized brand label is later approved
- person names
- URLs, route paths, database identifiers and slugs
- user-generated or database-driven content that already comes from a domain translation table
- GitHub usernames, commit hashes, issue numbers and technical identifiers

## Priority 0 — Global shell

### `src/data/siteContent.ts`

Hardcoded groups:

- primary navigation labels
- platform feature titles and descriptions
- roadmap phases, titles and descriptions
- Founding Hero placeholder labels, titles and descriptions
- contributor role titles and descriptions

Proposed namespaces:

- `navigation.*`
- `home.platform.features.*`
- `home.roadmap.*`
- `founding_heroes.placeholders.*`
- `founding_heroes.roles.*`

Migration target:

- navigation and short labels: `website_translation_keys`
- platform, roadmap and Founding Hero descriptions: page blocks

### `src/components/Header.tsx`

Hardcoded groups:

- brand home ARIA label
- primary navigation ARIA label
- mobile navigation ARIA label
- `View Issues`
- open/close navigation labels

Proposed keys:

- `header.brand_home_aria`
- `header.primary_navigation_aria`
- `header.mobile_navigation_aria`
- `header.view_issues`
- `header.open_menu_aria`
- `header.close_menu_aria`

### `src/components/Footer.tsx`

Hardcoded groups:

- footer group titles
- all footer link labels
- mission tagline and description
- trust labels
- CTA labels
- sitemap ARIA label
- ownership/privacy/back-to-top labels
- location label

Proposed namespaces:

- `footer.groups.*`
- `footer.links.*`
- `footer.mission.*`
- `footer.trust.*`
- `footer.actions.*`
- `footer.accessibility.*`

## Priority 1 — Main application pages

### `src/App.tsx`

This is currently the largest hardcoded source and contains multiple complete pages and shared states.

Page/function groups requiring migration:

- Home page
- Founding Heroes page
- Become a Founding Hero page
- Support Mission page
- legacy Impact dashboard components still present in the file
- Issues page
- Issue detail page
- Profile page
- Profile Issues page
- contribution and claim forms
- reusable contributor cards, badges and timeline labels

Hardcoded content categories:

- hero copy
- section headings and explanatory paragraphs
- statistics labels
- contributor labels
- form fields, options, helper text and consent copy
- client-side validation errors
- loading, empty, success and failure states
- button labels and CTA copy
- issue filters, difficulty labels and claim statuses
- date labels and timeline descriptions
- ARIA labels

Proposed namespaces:

- `home.*`
- `founding_heroes.*`
- `apply.*`
- `support.*`
- `issues.*`
- `issue_detail.*`
- `profile.*`
- `contributor.*`
- `forms.*`

Long hero and section copy should become page blocks. Short labels and state messages should become UI keys.

### `src/pages/ImpactResultsPage.tsx`

Hardcoded groups:

- SEO/document title
- hero eyebrow, title, description and actions
- result metric labels and descriptions
- loading and error states
- changelog headings
- labels such as `Why we built this` and `Positive impact`
- contributor labels
- Issues boundary CTA
- date formatting locale currently fixed to English

Proposed namespace:

- `impact.*`

Database-driven platform update titles/descriptions remain in `platform_update_translations`. The surrounding interface belongs in website translations.

### `src/pages/LegalTransparencyPage.tsx`

Hardcoded groups:

- entire legal page shell
- section navigation
- legal headings and paragraphs
- ownership, terms, privacy and mission labels
- SEO title
- ARIA labels

Proposed namespace:

- `legal.*`

Most legal paragraphs should be page blocks to allow controlled review and publication per language.

### `src/pages/FounderProfilePage.tsx`

Hardcoded groups:

- profile page shell labels
- fallback content
- timeline, SWAT and contribution section labels
- loading, error and empty states
- CTA labels
- SEO/document title suffixes
- date and count labels

Proposed namespace:

- `founder_profile.*`

Founder biography and founder-specific narrative remain in `founder_profile_translations`, while all interface framing moves to website translations.

## Priority 2 — Proof of Mind

### `src/pages/ProofOfMindPages.tsx`

This file contains a large number of visitor-facing hardcoded strings around translated concept data.

Archive page groups:

- error and empty states
- SEO fallback description
- date fallback text
- item fallback label
- concept visual alt fallback
- public/protected badges
- score labels
- founder attribution labels
- innovation, problem and capability labels
- share states
- search label and placeholder
- hero and statistics copy
- filter labels
- loading and no-result states

Discovery modal groups:

- modal ARIA labels
- success/error messages
- all form labels
- optional labels
- interest type options
- consent text
- saving state
- submit/cancel/close labels

Detail page groups:

- loading, error and not-found states
- media CTA labels
- hero labels and fallback CTA
- score and statistic labels
- all numbered section eyebrow labels
- all section titles
- audience, market, jobs, pain points and trust labels
- feature architecture labels
- AI/API/mockup labels
- privacy label
- commercial evaluation labels
- partner and collaboration labels
- share bar labels

Proposed namespaces:

- `proof_of_mind.archive.*`
- `proof_of_mind.card.*`
- `proof_of_mind.discovery.*`
- `proof_of_mind.detail.*`
- `proof_of_mind.share.*`
- `proof_of_mind.states.*`

Concept content itself must continue to resolve from `proof_of_mind_concept_translations`.

### `src/lib/platformUpdatesUi.tsx`

Hardcoded injected block copy:

- section eyebrow, title and description
- latest-upgrades count text
- `Why we built this`
- `Positive impact`
- footer mission sentence
- founder CTA
- product/platform fallback label

Proposed namespace:

- `platform_updates_widget.*`

Update records remain in `platform_update_translations`.

### `src/lib/latestThreeUi.ts`

Hardcoded injected HTML:

- shared description
- `Open item` label
- latest section labels and titles for Journal, Proof of Mind and Break the Circle
- fallback category names

Proposed namespace:

- `latest_three.*`

This module builds HTML strings and therefore must receive an already-resolved translation dictionary before rendering.

## Priority 3 — Journal and Break the Circle

### `src/pages/JournalPages.tsx`

Hardcoded groups:

- archive hero and archive framing
- filters, category/tag labels and search states
- loading, empty and error messages
- article metadata labels
- comments and social sharing interface
- submission forms
- form validation and consent copy
- SEO title suffixes and fallback descriptions
- related content headings

Proposed namespace:

- `journal.*`

Journal article content remains in `journal_translations`; category, tag and author content should use their dedicated translation tables.

### `src/lib/journal.ts`

Hardcoded rendering and fallback strings were detected. Audit for:

- title and metadata fallbacks
- article shell headings
- comments and share labels
- formatted date locale

Proposed namespace:

- `journal.rendering.*`

### `src/pages/BreakTheCirclePages.tsx`

Hardcoded groups:

- archive and article hero copy
- filters and states
- article CTA copy
- sharing labels
- helper and fallback messages
- SEO title and fallback description
- any HTML assembled through `innerHTML`

Proposed namespace:

- `break_the_circle.*`

Article content remains in `journal_translations` and `break_the_circle_post_translations`.

## Priority 4 — DOM enhancement modules

The following modules inject visitor-facing HTML or React content after page render and must use the same selected language as the main application.

### `src/lib/founderPostUi.ts`

Audit/migrate:

- founder-post section labels
- expand/collapse labels
- video/transcript labels
- empty/fallback states
- CTA copy

Namespace: `founder_post_widget.*`

### `src/lib/founderPostOpportunitiesUi.ts`

Audit/migrate:

- opportunity headings
- status and role labels
- empty and loading states
- CTA labels

Namespace: `founder_post_opportunities.*`

### `src/lib/conceptMessageUi.ts`

Audit/migrate:

- concept message headings
- outreach/contact labels
- success/error states
- buttons and accessibility labels

Namespace: `concept_message_widget.*`

### `src/lib/conceptOwnershipUi.ts`

Audit/migrate:

- ownership notice labels
- legal explanation and CTA
- accessibility labels

Namespace: `concept_ownership_widget.*`

### `src/lib/journalMetadataUi.ts`

Audit/migrate:

- author, date, category, tag and reading metadata labels
- fallback labels

Namespace: `journal_metadata_widget.*`

### `src/lib/founderPostFixes.ts` or related UI patch modules

Review any visitor-visible injected text and move it to the nearest relevant namespace rather than creating patch-specific translation keys.

## Shared localization concerns

### Date and time formatting

The following patterns are currently fixed to English or `en-GB`:

- publication dates
- impact refresh timestamps
- contributor timeline dates
- Proof of Mind dates
- latest-content timestamps

Required change:

- derive `Intl.DateTimeFormat` locale from the active `site_languages.code`
- retain `Europe/Madrid` only where mission-local time is intentional
- otherwise format in the visitor's locale/time zone

### Humanized enum values

Functions that transform values such as `physical_product` into `Physical Product` are not translations.

Affected concepts include:

- concept types
- statuses
- priorities
- release phases
- issue disciplines
- difficulty levels
- support categories
- contribution types

Required change:

- create explicit translation keys such as `enums.concept_type.physical_product`
- use humanization only as a final developer fallback

### Dynamic counts and interpolation

Do not concatenate translated fragments. Use complete templates with named variables.

Examples:

- `{count} visible concepts`
- `{count} core capabilities`
- `{count} competitors`
- `Created by {name}`
- `Last shipped {date}`
- `Discuss {conceptTitle}`

The frontend translation resolver must support interpolation and plural forms.

### Accessibility

ARIA labels, image alt fallbacks, dialog labels and screen-reader-only content must be included in the same inventory and publication workflow.

### SEO

Each public route needs localized:

- document title
- meta description
- Open Graph title
- Open Graph description
- image alt text where applicable
- future `hreflang` and canonical handling

## Recommended migration sequence

1. Build the frontend translation client and active-language state.
2. Migrate Header, Footer and navigation.
3. Migrate shared states, buttons, forms and enum labels.
4. Migrate Home and static page blocks from `App.tsx`.
5. Migrate Proof of Mind framing while preserving domain translations.
6. Migrate Journal and Break the Circle framing.
7. Migrate Impact, Issues, Support, Profiles and Legal.
8. Migrate every DOM injector.
9. Add localized SEO, RTL layout and language persistence.
10. Run a repository check that blocks newly introduced visitor-facing hardcoded strings.

## Definition of done

The migration is complete only when:

- changing the language updates the header, footer, current page, forms and injected blocks together
- no visitor-facing English string remains directly embedded in React or HTML templates, except approved brand/proper-name constants
- every data-driven record uses its domain translation table with English fallback
- every static block uses website page block translations
- every short UI string uses a website translation key
- dates, enum labels, counts, validation and accessibility content follow the selected language
- missing translations fall back safely to English without blank UI
- Arabic switches the document direction to RTL
- SEO metadata follows the active language

# Journey Map Pin V2 — Design Specification

Status: design only — no production implementation

## Design goal

Create a premium, recognizable journey marker that feels personal and editorial without becoming visually heavy on the map. The pin must stay readable at small sizes, work with one or two founder portraits, clearly distinguish the current location, and open a compact chapter preview.

## Chosen concept: The Journey Medallion

The pin is not a classic teardrop marker. It is a compact circular medallion with a subtle location pointer underneath.

### Default marker

- Total visual size: 42 × 50 px
- Portrait medallion: 38 × 38 px
- Border: 2 px warm champagne gold
- Outer dark ring: 3 px near-black
- Pointer: small centered diamond/triangle, visually connected to the medallion
- Shadow: restrained and soft, never a large glow
- Map anchor: bottom-center at the point of the pointer

The portrait remains the dominant element. The pointer only communicates the exact geographic anchor.

### One-person stop

- One circular founder or guest portrait
- Image uses `object-fit: cover`
- Fallback shows one uppercase initial on a dark background
- Border color can identify the route:
  - Kevin: warm gold
  - Micha: muted blue
  - Other person: neutral stone

### Shared stop

- Keep one circular medallion
- Split the portrait vertically into two equal halves
- Thin divider of 1 px
- Do not display overlapping circles because that becomes unreadable on mobile maps
- Shared border uses a restrained two-tone ring or neutral champagne ring

### Current location

Current location must be visible without making the entire map noisy.

- Same base marker shape and dimensions
- Add one thin animated pulse ring outside the marker
- Add a small `LIVE` capsule above the medallion only at zoom levels where labels are readable
- Pulse animation: 2.4 seconds, low opacity, one ring only
- No permanent oversized glow

### Milestone

- Add a small 14 px star badge at the upper-right edge
- Badge must not resize the marker
- Badge background: champagne gold
- Badge icon: dark near-black

### Active/selected state

- Scale to 1.08
- Move upward by 2 px
- Increase border brightness slightly
- Do not change the marker into another shape

## Interaction model

### First click/tap

1. Select the journey entry in the parent map.
2. Center the map smoothly on the selected marker.
3. Open a compact MapLibre popup directly above the pin.

### Popup, not fullscreen modal

A fullscreen modal is intentionally rejected for the map interaction. It disconnects the visitor from the route and is too heavy for quickly exploring multiple stops.

The popup should be a React child rendered inside the MapLibre popup container.

### Popup content

Maximum width: 280 px desktop, 250 px mobile.

Content order:

1. Founder/people avatar row
2. Eyebrow: `Current location`, person names, or journey type
3. Date
4. Chapter title — maximum 2 lines
5. Location
6. Excerpt — maximum 3 lines
7. Primary action: `Read this chapter`

The complete journal article remains the destination for full content.

### Popup behavior

- Close by clicking elsewhere on the map
- Close via an explicit close button on mobile
- Escape closes on desktop
- Selecting another pin replaces the current popup
- Only one popup may be open at a time

## Visual hierarchy

1. Portrait
2. Current-location state
3. Selected state
4. Milestone badge
5. Route color

Do not use all signals at equal strength.

## Accessibility

- Marker is a real `<button>`
- Minimum touch target wrapper: 44 × 44 px
- Accessible name: `Open {title} — {people}`
- Focus ring independent from active state
- Popup receives focus only on keyboard activation
- Respect `prefers-reduced-motion`

## Responsive behavior

### Desktop/tablet

- 42 × 50 px marker
- Popup appears above marker
- Hover may slightly lift the pin

### Mobile

- Same visual marker size
- Invisible touch wrapper expands to 48 × 48 px
- Popup width stays inside viewport
- No hover-only information
- `LIVE` capsule may be hidden below 420 px viewport width

## Component architecture

```text
PremiumJourneyMap
└── JourneyMapMarkerLayer
    ├── JourneyMapPin
    │   ├── JourneyMapAvatar
    │   ├── JourneyMapSplitAvatar
    │   └── JourneyMapMarkerBadge
    └── JourneyMapPopup
        ├── JourneyMapPeople
        ├── JourneyMapChapterMeta
        └── JourneyMapChapterLink
```

### Responsibilities

`PremiumJourneyMap`
- Owns MapLibre instance, selected point and map movement
- Ensures only one popup is open

`JourneyMapPin`
- Pure visual React component
- Receives point, active state and click handler
- Does not own a fullscreen modal

`JourneyMapPopup`
- Pure React chapter preview
- Receives point and close/select callbacks

`JourneyMapMarkerLayer`
- Adapter between React roots and MapLibre markers/popups
- Mounts, updates and unmounts marker roots safely

## Explicitly rejected designs

- Large teardrop marker with portrait: too tall and obscures nearby route points
- Overlapping avatar circles: becomes visually messy at map scale
- Fullscreen modal on every click: too disruptive
- Strong permanent glow around every marker: destroys map hierarchy
- Different marker shape for every journey type: inconsistent and hard to scan
- CSS redesign directly on `main` without visual approval: not allowed

## Implementation gate

Do not change production code until this design is approved.

Implementation must happen on a separate feature branch and include:

- isolated component CSS
- no reuse of legacy global marker selectors
- screenshot comparison at desktop and mobile width
- test with one person, two people, fallback initial, current location and milestone
- Railway preview deployment before merge to `main`

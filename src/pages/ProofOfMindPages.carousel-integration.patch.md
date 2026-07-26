# Proof of Mind carousel integration

Apply these exact changes to `src/pages/ProofOfMindPages.tsx`:

1. Remove `Image as ImageIcon` from the `lucide-react` import.
2. Add:

```tsx
import { ProofMockupCarousel } from '../components/ProofMockupCarousel';
```

3. Replace the existing conditional inline mockup grid:

```tsx
{concept.mockup_screens.length ? <DetailSection title="Mockups and visual direction"><div className="proof-mockup-grid">{concept.mockup_screens.map((screen) => <article key={screen.screen_key}>{screen.image_url ? <img src={screen.image_url} alt={screen.image_alt || screen.screen_name} /> : <div className="proof-mockup-placeholder"><ImageIcon /><strong>{screen.screen_name}</strong><small>{screen.image_status || 'Visual pending'}</small></div>}<div className="proof-mockup-copy"><span>{screen.primary_user_role}</span><h3>{screen.screen_name}</h3>{renderText(screen.screen_purpose)}<DetailList items={screen.main_components} limit={5} /></div></article>)}</div></DetailSection> : null}
```

with the always-mounted carousel section:

```tsx
<DetailSection title="Mockups and visual direction">
  <ProofMockupCarousel screens={concept.mockup_screens ?? []} />
</DetailSection>
```

Do not alter the route or replace the existing `ProofOfMindDetailPage`.

import { ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProofOfMindMockupScreen } from '../lib/proofOfMind';

type ProofMockupCarouselProps = {
  screens: ProofOfMindMockupScreen[];
};

export function ProofMockupCarousel({ screens }: ProofMockupCarouselProps) {
  const orderedScreens = useMemo(
    () => [...screens].sort((a, b) => a.display_order - b.display_order),
    [screens],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex > orderedScreens.length - 1) setActiveIndex(0);
  }, [activeIndex, orderedScreens.length]);

  if (!orderedScreens.length) return null;

  const hasMultipleScreens = orderedScreens.length > 1;
  const activeScreen = orderedScreens[activeIndex];
  const goTo = (index: number) => {
    const total = orderedScreens.length;
    setActiveIndex((index + total) % total);
  };
  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || !hasMultipleScreens) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40) return;
    goTo(activeIndex + (distance < 0 ? 1 : -1));
  };

  return (
    <div className="proof-mockup-carousel" aria-roledescription="carousel" aria-label="App mockup screens">
      <div className="proof-mockup-carousel__viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="proof-mockup-carousel__track"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {orderedScreens.map((screen, index) => (
            <article
              className="proof-mockup-carousel__slide"
              key={screen.screen_key}
              aria-hidden={index !== activeIndex}
            >
              <div className="proof-mockup-carousel__media">
                {screen.image_url ? (
                  <img src={screen.image_url} alt={screen.image_alt || screen.screen_name} loading="lazy" />
                ) : (
                  <div className="proof-mockup-placeholder">
                    <ImageIcon aria-hidden="true" />
                    <strong>{screen.screen_name}</strong>
                    <small>{screen.image_status || 'Visual pending'}</small>
                  </div>
                )}
              </div>
              <div className="proof-mockup-carousel__copy">
                <span>{screen.primary_user_role}</span>
                <h3>{screen.screen_name}</h3>
                {screen.screen_purpose ? <p>{screen.screen_purpose}</p> : null}
                {screen.main_components.length ? (
                  <ul>
                    {screen.main_components.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="proof-mockup-carousel__controls">
        <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={!hasMultipleScreens} aria-label="Previous mockup">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="proof-mockup-carousel__dots" role="tablist" aria-label="Select mockup">
          {orderedScreens.map((screen, index) => (
            <button
              key={screen.screen_key}
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              aria-label={`Show mockup ${index + 1}: ${screen.screen_name}`}
              aria-selected={index === activeIndex}
              role="tab"
              onClick={() => goTo(index)}
            />
          ))}
        </div>
        <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={!hasMultipleScreens} aria-label="Next mockup">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      <p className="proof-mockup-carousel__status" aria-live="polite">
        {activeScreen.screen_name} · {activeIndex + 1} of {orderedScreens.length}
      </p>
    </div>
  );
}

import { ArrowRight, Gift, HandHeart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './FounderSupportUpcomingTimeline.css';

type TimelineLink = {
  title: string;
  url: string;
};

type UpcomingTimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  needs: TimelineLink[];
  offers: TimelineLink[];
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function safeLinks(value: unknown): TimelineLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TimelineLink => {
    if (!item || typeof item !== 'object') return false;
    const link = item as Record<string, unknown>;
    return typeof link.title === 'string'
      && link.title.trim().length > 0
      && typeof link.url === 'string'
      && link.url.trim().length > 0;
  });
}

export function FounderSupportUpcomingTimeline() {
  const [events, setEvents] = useState<UpcomingTimelineEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    readJson<UpcomingTimelineEvent[]>(supabase.from('founder_timeline_events').request({
      query: 'select=id,title,description,needs,offers&is_public=eq.true&is_upcoming=eq.true&order=occurred_at.desc,created_at.desc&limit=3',
    }))
      .then((rows) => {
        setEvents(rows.map((row) => ({
          ...row,
          needs: safeLinks(row.needs),
          offers: safeLinks(row.offers),
        })));
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') return <div className="impact-state">Loading upcoming timeline…</div>;
  if (status === 'error') return <div className="impact-state impact-state--error">The upcoming timeline is temporarily unavailable.</div>;
  if (!events.length) return null;

  return (
    <div className="founder-upcoming__grid" aria-label="Latest upcoming timeline records">
      {events.map((event) => (
        <article className="founder-upcoming-card" key={event.id}>
          <h3>{event.title}</h3>
          {event.description ? <p className="founder-upcoming-card__description">{event.description}</p> : null}

          {(event.needs.length > 0 || event.offers.length > 0) ? (
            <div className="founder-upcoming-card__links">
              {event.needs.map((need, index) => (
                <a href={need.url} className="founder-upcoming-card__link" key={`need-${event.id}-${index}`}>
                  <HandHeart size={17} aria-hidden="true" />
                  <span><small>What we need</small>{need.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ))}

              {event.offers.map((offer, index) => (
                <a href={offer.url} className="founder-upcoming-card__link founder-upcoming-card__link--offer" key={`offer-${event.id}-${index}`}>
                  <Gift size={17} aria-hidden="true" />
                  <span><small>What we offer</small>{offer.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

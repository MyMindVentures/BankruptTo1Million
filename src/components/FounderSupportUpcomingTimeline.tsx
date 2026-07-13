import { ArrowRight, Gift, HandHeart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './FounderSupportUpcomingTimeline.css';

type UpcomingTimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  need_url: string | null;
  offer_url: string | null;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function FounderSupportUpcomingTimeline() {
  const [events, setEvents] = useState<UpcomingTimelineEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    readJson<UpcomingTimelineEvent[]>(supabase.from('founder_timeline_events').request({
      query: 'select=id,title,description,need_url,offer_url&is_public=eq.true&is_upcoming=eq.true&order=occurred_at.asc,display_order.asc&limit=3',
    }))
      .then((rows) => {
        setEvents(rows);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') return <div className="impact-state">Loading upcoming timeline…</div>;
  if (status === 'error') return <div className="impact-state impact-state--error">The upcoming timeline is temporarily unavailable.</div>;
  if (!events.length) return null;

  return (
    <section className="founder-upcoming" aria-label="Upcoming timeline">
      <div className="founder-upcoming__grid">
        {events.map((event) => (
          <article className="founder-upcoming-card" key={event.id}>
            <h3>{event.title}</h3>
            {event.description ? <p className="founder-upcoming-card__description">{event.description}</p> : null}
            <div className="founder-upcoming-card__links">
              {event.need_url ? (
                <a href={event.need_url} className="founder-upcoming-card__link">
                  <HandHeart size={17} aria-hidden="true" />
                  <span>What we need</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : null}
              {event.offer_url ? (
                <a href={event.offer_url} className="founder-upcoming-card__link founder-upcoming-card__link--offer">
                  <Gift size={17} aria-hidden="true" />
                  <span>What we offer</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

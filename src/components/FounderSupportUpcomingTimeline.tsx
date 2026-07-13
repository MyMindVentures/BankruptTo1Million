import { ArrowRight, CalendarDays, ChevronDown, Gift, HandHeart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './FounderSupportUpcomingTimeline.css';

type CalendarEntry = {
  id: string;
  slug: string;
  title: string;
  public_summary: string | null;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
};

type ExchangeItem = {
  id: string;
  calendar_entry_id: string;
  item_type: 'need' | 'offer' | string;
  title: string;
  slug: string | null;
};

type CalendarFounderRelation = {
  calendar_entry_id: string;
  founder_profile_id: string;
  display_order: number;
};

type FounderProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
};

type UpcomingTimelineEvent = CalendarEntry & {
  needs: ExchangeItem[];
  offers: ExchangeItem[];
  founders: FounderProfile[];
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function itemUrl(item: ExchangeItem) {
  if (item.item_type === 'offer' && item.slug) return `/offers/${item.slug}`;
  return item.item_type === 'need' ? '/journal#what-we-need' : '/journal#what-we-offer';
}

function formatPeriod(startsOn: string, endsOn: string | null) {
  const formatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const start = formatter.format(new Date(`${startsOn}T00:00:00`));
  if (!endsOn || endsOn === startsOn) return start;
  const end = formatter.format(new Date(`${endsOn}T00:00:00`));
  return `${start} — ${end}`;
}

function founderName(founder: FounderProfile) {
  return founder.display_name || founder.full_name || 'Founder';
}

export function FounderSupportUpcomingTimeline() {
  const [events, setEvents] = useState<UpcomingTimelineEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    async function load() {
      try {
        const entries = await readJson<CalendarEntry[]>(supabase.from('journey_calendar_entries').request({
          query: 'select=id,slug,title,public_summary,starts_on,ends_on,created_at&is_public=eq.true&status=eq.planned&order=starts_on.desc,created_at.desc&limit=3',
        }));

        if (!entries.length) {
          setEvents([]);
          setStatus('ready');
          return;
        }

        const entryIds = entries.map((entry) => entry.id).join(',');

        const [items, relations] = await Promise.all([
          readJson<ExchangeItem[]>(supabase.from('journey_exchange_items').request({
            query: `select=id,calendar_entry_id,item_type,title,slug&calendar_entry_id=in.(${entryIds})&is_public=eq.true&status=eq.active&order=display_order.asc,created_at.asc`,
          })),
          readJson<CalendarFounderRelation[]>(supabase.from('journey_calendar_entry_founders').request({
            query: `select=calendar_entry_id,founder_profile_id,display_order&calendar_entry_id=in.(${entryIds})&order=display_order.asc`,
          })),
        ]);

        const founderIds = [...new Set(relations.map((relation) => relation.founder_profile_id))];
        const founders = founderIds.length
          ? await readJson<FounderProfile[]>(supabase.from('founder_profiles_public').request({
              query: `select=id,display_name,full_name,avatar_url,profile_url&id=in.(${founderIds.join(',')})`,
            }))
          : [];

        setEvents(entries.map((entry) => {
          const eventRelations = relations
            .filter((relation) => relation.calendar_entry_id === entry.id)
            .sort((a, b) => a.display_order - b.display_order);

          return {
            ...entry,
            needs: items.filter((item) => item.calendar_entry_id === entry.id && item.item_type === 'need'),
            offers: items.filter((item) => item.calendar_entry_id === entry.id && item.item_type === 'offer'),
            founders: eventRelations
              .map((relation) => founders.find((founder) => founder.id === relation.founder_profile_id))
              .filter((founder): founder is FounderProfile => Boolean(founder)),
          };
        }));
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }

    void load();
  }, []);

  if (status === 'loading') return <div className="impact-state">Loading upcoming timeline…</div>;
  if (status === 'error') return <div className="impact-state impact-state--error">The upcoming timeline is temporarily unavailable.</div>;
  if (!events.length) return <div className="impact-state">No upcoming timeline events are published yet.</div>;

  return (
    <div className="founder-upcoming__grid" aria-label="Latest upcoming timeline records">
      {events.map((event) => (
        <details className="founder-upcoming-card" key={event.id}>
          <summary className="founder-upcoming-card__summary">
            {event.founders.length > 0 ? (
              <span className="founder-upcoming-card__people" aria-label={`People involved: ${event.founders.map(founderName).join(', ')}`}>
                {event.founders.map((founder) => {
                  const avatar = founder.avatar_url ? (
                    <img src={founder.avatar_url} alt={founderName(founder)} loading="lazy" />
                  ) : (
                    <span className="founder-upcoming-card__avatar-fallback" aria-hidden="true">{founderName(founder).charAt(0)}</span>
                  );

                  return founder.profile_url ? (
                    <a
                      href={founder.profile_url}
                      className="founder-upcoming-card__person"
                      key={founder.id}
                      title={founderName(founder)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {avatar}
                    </a>
                  ) : (
                    <span className="founder-upcoming-card__person" key={founder.id} title={founderName(founder)}>
                      {avatar}
                    </span>
                  );
                })}
              </span>
            ) : null}

            <span className="founder-upcoming-card__main">
              <span className="founder-upcoming-card__period">
                <CalendarDays size={16} aria-hidden="true" />
                <time>{formatPeriod(event.starts_on, event.ends_on)}</time>
              </span>
              <span className="founder-upcoming-card__title">{event.title}</span>
              {event.public_summary ? <span className="founder-upcoming-card__description">{event.public_summary}</span> : null}
            </span>
            <span className="founder-upcoming-card__toggle">
              <span>More details</span>
              <ChevronDown size={18} aria-hidden="true" />
            </span>
          </summary>

          <div className="founder-upcoming-card__details">
            {(event.needs.length > 0 || event.offers.length > 0) ? (
              <div className="founder-upcoming-card__links">
                {event.needs.map((need) => (
                  <a href={itemUrl(need)} className="founder-upcoming-card__link" key={need.id}>
                    <HandHeart size={17} aria-hidden="true" />
                    <span><small>What we need</small>{need.title}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                ))}

                {event.offers.map((offer) => (
                  <a href={itemUrl(offer)} className="founder-upcoming-card__link founder-upcoming-card__link--offer" key={offer.id}>
                    <Gift size={17} aria-hidden="true" />
                    <span><small>What we offer</small>{offer.title}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : <p className="founder-upcoming-card__empty">No extra details have been published for this event yet.</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

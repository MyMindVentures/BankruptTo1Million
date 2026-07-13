import { ArrowRight, CalendarDays, Gift, HandHeart, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './FounderSupportUpcomingTimeline.css';

type ExchangeItem = {
  id: string;
  calendar_entry_id: string | null;
  item_type: 'need' | 'offer' | string;
  title: string;
  slug: string | null;
};

type UpcomingEntry = {
  id: string;
  slug: string;
  title: string;
  status: 'planned' | 'confirmed' | 'travelling' | string;
  starts_on: string;
  ends_on: string | null;
  city_name: string | null;
  location_name: string | null;
  public_summary: string | null;
  purpose: string | null;
  exchangeItems: ExchangeItem[];
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function dateValue(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function formatDateRange(startsOn: string, endsOn: string | null) {
  const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = formatter.format(new Date(`${startsOn}T00:00:00`));
  if (!endsOn || endsOn === startsOn) return start;
  return `${start} — ${formatter.format(new Date(`${endsOn}T00:00:00`))}`;
}

function selectUpcoming(entries: Omit<UpcomingEntry, 'exchangeItems'>[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return entries
    .filter((entry) => !entry.ends_on || dateValue(entry.ends_on) >= today.getTime())
    .sort((a, b) => {
      const aUpcoming = a.status === 'planned' || a.status === 'confirmed';
      const bUpcoming = b.status === 'planned' || b.status === 'confirmed';
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      if (aUpcoming) return dateValue(a.starts_on) - dateValue(b.starts_on);
      return dateValue(b.starts_on) - dateValue(a.starts_on);
    })
    .slice(0, 3);
}

export function FounderSupportUpcomingTimeline() {
  const [entries, setEntries] = useState<UpcomingEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    async function loadUpcomingTimeline() {
      try {
        const calendarRows = await readJson<Omit<UpcomingEntry, 'exchangeItems'>[]>(
          supabase.from('journey_calendar_entries').request({
            query: 'select=id,slug,title,status,starts_on,ends_on,city_name,location_name,public_summary,purpose&is_public=eq.true&status=in.(planned,confirmed,travelling)&order=starts_on.asc,display_order.asc',
          }),
        );
        const selected = selectUpcoming(calendarRows);

        if (!selected.length) {
          setEntries([]);
          setStatus('ready');
          return;
        }

        const ids = selected.map((entry) => entry.id).join(',');
        const exchangeRows = await readJson<ExchangeItem[]>(
          supabase.from('journey_exchange_items').request({
            query: `select=id,calendar_entry_id,item_type,title,slug&calendar_entry_id=in.(${ids})&is_public=eq.true&status=eq.active&order=display_order.asc`,
          }),
        );

        setEntries(selected.map((entry) => ({
          ...entry,
          exchangeItems: exchangeRows.filter((item) => item.calendar_entry_id === entry.id),
        })));
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }

    void loadUpcomingTimeline();
  }, []);

  const cards = useMemo(() => entries.map((entry) => ({
    ...entry,
    needs: entry.exchangeItems.filter((item) => item.item_type === 'need'),
    offers: entry.exchangeItems.filter((item) => item.item_type === 'offer'),
  })), [entries]);

  return (
    <section className="founder-upcoming" aria-labelledby="founder-upcoming-title">
      <div className="founder-upcoming__heading">
        <div>
          <p className="eyebrow"><CalendarDays size={17} aria-hidden="true" /> Upcoming timeline</p>
          <h2 id="founder-upcoming-title">See where support can make the next step possible.</h2>
          <p>The three most relevant current and upcoming journey moments, loaded live from our public timeline.</p>
        </div>
        <a className="founder-upcoming__all" href="/journal">Follow the full journey <ArrowRight size={17} /></a>
      </div>

      {status === 'loading' ? <div className="impact-state">Loading upcoming journey moments…</div> : null}
      {status === 'error' ? <div className="impact-state impact-state--error">The upcoming timeline is temporarily unavailable.</div> : null}
      {status === 'ready' && !cards.length ? <div className="impact-state">New upcoming journey moments will appear here as soon as they are published.</div> : null}

      <div className="founder-upcoming__grid">
        {cards.map((entry) => (
          <article className="founder-upcoming-card" key={entry.id}>
            <div className="founder-upcoming-card__meta">
              <span>{entry.status.replaceAll('_', ' ')}</span>
              <time>{formatDateRange(entry.starts_on, entry.ends_on)}</time>
            </div>
            <h3>{entry.title}</h3>
            {entry.location_name || entry.city_name ? (
              <p className="founder-upcoming-card__location"><MapPin size={16} aria-hidden="true" />{entry.location_name || entry.city_name}</p>
            ) : null}
            <p className="founder-upcoming-card__description">{entry.public_summary || entry.purpose || 'Follow this next chapter and discover how you can take part.'}</p>

            <div className="founder-upcoming-card__links">
              <a href="/journal#what-we-need" className="founder-upcoming-card__link">
                <HandHeart size={17} aria-hidden="true" />
                <span><small>What we need</small>{entry.needs[0]?.title || 'See the current needs'}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href={entry.offers[0]?.slug ? `/offers/${entry.offers[0].slug}` : '/journal#what-we-offer'} className="founder-upcoming-card__link founder-upcoming-card__link--offer">
                <Gift size={17} aria-hidden="true" />
                <span><small>What we offer</small>{entry.offers[0]?.title || 'See what we give back'}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

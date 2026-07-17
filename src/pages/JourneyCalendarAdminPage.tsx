import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Filter, LoaderCircle, Mail, MapPin, Plus, RefreshCw, Search, Users, XCircle,
} from 'lucide-react';
import {
  getJourneyCalendarEntry,
  getJourneyCalendarOverview,
  deleteJourneyCalendarEntry,
  listJourneyExchangeItems,
  listJourneyHostOffers,
  requeueJourneyCalendarTranslations,
  setJourneyCalendarFounders,
  slugifyTitle,
  updateJourneyHostOffer,
  upsertJourneyCalendarEntry,
  upsertJourneyExchangeItem,
  type CalendarEntry,
  type CalendarEntryPayload,
  type CalendarEntryStatus,
  type CalendarFounderOption,
  type CalendarOverviewRow,
  type ExchangeItem,
  type ExchangeItemPayload,
  type ExchangeItemStatus,
  type HostOffer,
  type HostOfferStatus,
  type JourneyPerson,
  type TranslationSummary,
} from '../lib/journeyCalendarAdminApi';
import '../styles/journeyCalendarAdmin.css';

type TabKey = 'stops' | 'hosts' | 'exchange';

const entryStatuses: CalendarEntryStatus[] = ['idea', 'planned', 'confirmed', 'travelling', 'completed', 'cancelled'];
const hostStatuses: HostOfferStatus[] = ['new', 'reviewing', 'contacted', 'accepted', 'declined', 'withdrawn'];
const exchangeStatuses: ExchangeItemStatus[] = ['draft', 'active', 'fulfilled', 'paused', 'archived'];
const people: JourneyPerson[] = ['kevin', 'micha', 'together'];

function label(value: string | null | undefined) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function emptyEntryForm(): CalendarEntryPayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: '',
    slug: '',
    journey_person: 'together',
    status: 'planned',
    starts_on: today,
    ends_on: null,
    date_flexibility_days: 0,
    timezone: null,
    country_code: '',
    country_name: '',
    region_name: '',
    city_name: '',
    location_name: '',
    latitude: null,
    longitude: null,
    public_summary: '',
    purpose: '',
    transport_mode: '',
    accommodation_needed: false,
    accommodation_from: null,
    accommodation_until: null,
    guests_count: 1,
    nights_needed: null,
    host_request_message: '',
    host_request_status: 'not_needed',
    is_public: true,
    is_featured: false,
    display_order: 0,
    related_journal_post_id: null,
  };
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function entryToForm(entry: CalendarEntry): CalendarEntryPayload {
  return {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    journey_person: entry.journey_person,
    status: entry.status,
    starts_on: entry.starts_on,
    ends_on: entry.ends_on,
    date_flexibility_days: entry.date_flexibility_days,
    timezone: entry.timezone,
    country_code: entry.country_code,
    country_name: entry.country_name,
    region_name: entry.region_name,
    city_name: entry.city_name,
    location_name: entry.location_name,
    latitude: entry.latitude,
    longitude: entry.longitude,
    public_summary: entry.public_summary,
    purpose: entry.purpose,
    transport_mode: entry.transport_mode,
    accommodation_needed: entry.accommodation_needed,
    accommodation_from: entry.accommodation_from,
    accommodation_until: entry.accommodation_until,
    guests_count: entry.guests_count,
    nights_needed: entry.nights_needed,
    host_request_message: entry.host_request_message,
    host_request_status: entry.host_request_status,
    is_public: entry.is_public,
    is_featured: entry.is_featured,
    display_order: entry.display_order,
    related_journal_post_id: entry.related_journal_post_id,
  };
}

function emptyExchangeForm(calendarEntryId?: string | null): ExchangeItemPayload {
  return {
    calendar_entry_id: calendarEntryId || null,
    title: '',
    item_type: 'need',
    category: 'other',
    description: '',
    priority: 'normal',
    status: 'active',
    journey_person: 'together',
    exchange_type: 'free',
    is_public: true,
    display_order: 0,
  };
}

export function JourneyCalendarAdminPage() {
  const [tab, setTab] = useState<TabKey>('stops');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const [rows, setRows] = useState<CalendarOverviewRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [founders, setFounders] = useState<CalendarFounderOption[]>([]);
  const [hostOffers, setHostOffers] = useState<HostOffer[] | null>(null);
  const [hostCounts, setHostCounts] = useState<Record<string, number> | null>(null);
  const [exchangeRows, setExchangeRows] = useState<ExchangeItem[] | null>(null);
  const [exchangeCounts, setExchangeCounts] = useState<Record<string, number> | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<CalendarEntryPayload>(emptyEntryForm());
  const [selectedFounderIds, setSelectedFounderIds] = useState<string[]>([]);
  const [linkedExchange, setLinkedExchange] = useState<ExchangeItem[]>([]);
  const [translations, setTranslations] = useState<TranslationSummary | null>(null);
  const [exchangeForm, setExchangeForm] = useState<ExchangeItemPayload>(emptyExchangeForm());
  const [showExchangeForm, setShowExchangeForm] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<HostOffer | null>(null);
  const [offerNotes, setOfferNotes] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeItem | null>(null);

  async function loadStops() {
    const overview = await getJourneyCalendarOverview({ status: null, query: null });
    setRows(overview.rows);
    setCounts(overview.counts);
    setFounders(overview.founders);
  }

  async function loadHosts() {
    const result = await listJourneyHostOffers({ status: null, query: null });
    setHostOffers(result.rows);
    setHostCounts(result.counts);
  }

  async function loadExchange() {
    const result = await listJourneyExchangeItems({ status: null, query: null });
    setExchangeRows(result.rows);
    setExchangeCounts(result.counts);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'stops') await loadStops();
      else if (tab === 'hosts') await loadHosts();
      else await loadExchange();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Calendar admin data could not be loaded.');
      if (tab === 'stops') {
        setRows(null);
        setCounts(null);
      }
      if (tab === 'hosts') {
        setHostOffers(null);
        setHostCounts(null);
      }
      if (tab === 'exchange') {
        setExchangeRows(null);
        setExchangeCounts(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tab]);

  const filteredStops = useMemo(() => {
    if (!rows) return [];
    const q = query.toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status;
      const haystack = [row.title, row.slug, row.city_name, row.country_name, row.location_name].join(' ').toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [rows, query, status]);

  const filteredHosts = useMemo(() => {
    if (!hostOffers) return [];
    const q = query.toLowerCase();
    return hostOffers.filter((offer) => {
      const matchesStatus = status === 'all' || offer.status === status;
      const haystack = [
        offer.host_name,
        offer.email,
        offer.message,
        offer.city_name,
        offer.calendar_entry_city,
        offer.calendar_entry_title,
      ].join(' ').toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [hostOffers, query, status]);

  const filteredExchange = useMemo(() => {
    if (!exchangeRows) return [];
    const q = query.toLowerCase();
    return exchangeRows.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const haystack = [item.title, item.category, item.description, item.calendar_entry_title].join(' ').toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [exchangeRows, query, status]);

  async function openCreate() {
    setForm(emptyEntryForm());
    setSelectedFounderIds([]);
    setLinkedExchange([]);
    setTranslations(null);
    setExchangeForm(emptyExchangeForm());
    setShowExchangeForm(false);
    setEditorOpen(true);
  }

  async function openEdit(row: CalendarOverviewRow) {
    setSaving(true);
    setError(null);
    try {
      const detail = await getJourneyCalendarEntry(row.id);
      setForm(entryToForm(detail.entry));
      setSelectedFounderIds(detail.founders.map((item) => item.founder_profile_id));
      setLinkedExchange(detail.exchange_items);
      setTranslations(detail.translations);
      setExchangeForm(emptyExchangeForm(row.id));
      setShowExchangeForm(false);
      setEditorOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open calendar stop.');
    } finally {
      setSaving(false);
    }
  }

  async function saveStop() {
    const hasLatitude = form.latitude != null;
    const hasLongitude = form.longitude != null;
    if (hasLatitude !== hasLongitude) {
      setError('Latitude and longitude must both be set, or both left empty.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: CalendarEntryPayload = {
        ...form,
        slug: form.slug || slugifyTitle(form.title),
        ends_on: form.ends_on || null,
        timezone: form.timezone?.trim() || null,
        related_journal_post_id: form.related_journal_post_id?.trim() || null,
        date_flexibility_days: form.date_flexibility_days ?? 0,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        accommodation_from: form.accommodation_from || null,
        accommodation_until: form.accommodation_until || null,
      };
      const saved = await upsertJourneyCalendarEntry(payload);
      await setJourneyCalendarFounders(saved.id, selectedFounderIds);
      const detail = await getJourneyCalendarEntry(saved.id);
      setForm(entryToForm(detail.entry));
      setSelectedFounderIds(detail.founders.map((item) => item.founder_profile_id));
      setLinkedExchange(detail.exchange_items);
      setTranslations(detail.translations);
      await loadStops();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save calendar stop.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteStop() {
    if (!form.id) return;
    const confirmed = window.confirm(
      `Delete “${form.title || 'this stop'}”? It will be cancelled and removed from the public calendar. Host offers are kept for history.`,
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await deleteJourneyCalendarEntry(form.id);
      setEditorOpen(false);
      setForm(emptyEntryForm());
      setSelectedFounderIds([]);
      setLinkedExchange([]);
      setTranslations(null);
      await loadStops();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete calendar stop.');
    } finally {
      setSaving(false);
    }
  }

  async function saveLinkedExchange() {
    if (!form.id && !exchangeForm.calendar_entry_id) {
      setError('Save the stop first, then add needs/offers.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const entryId = form.id || exchangeForm.calendar_entry_id;
      await upsertJourneyExchangeItem({
        ...exchangeForm,
        calendar_entry_id: entryId,
      });
      if (entryId) {
        const detail = await getJourneyCalendarEntry(entryId);
        setLinkedExchange(detail.exchange_items);
      }
      setExchangeForm(emptyExchangeForm(entryId));
      setShowExchangeForm(false);
      await loadStops();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save exchange item.');
    } finally {
      setSaving(false);
    }
  }

  async function requeueTranslations() {
    if (!form.id) return;
    setSaving(true);
    setError(null);
    try {
      await requeueJourneyCalendarTranslations({ entityType: 'journey_calendar_entry', entityId: form.id });
      const detail = await getJourneyCalendarEntry(form.id);
      setTranslations(detail.translations);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not requeue translations.');
    } finally {
      setSaving(false);
    }
  }

  async function moderateOffer(nextStatus: HostOfferStatus) {
    if (!selectedOffer) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJourneyHostOffer({
        offerId: selectedOffer.id,
        status: nextStatus,
        internalNotes: offerNotes,
      });
      setSelectedOffer({ ...selectedOffer, ...updated });
      await loadHosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update host offer.');
    } finally {
      setSaving(false);
    }
  }

  async function saveExchangeEditor() {
    if (!selectedExchange) return;
    setSaving(true);
    setError(null);
    try {
      await upsertJourneyExchangeItem({
        id: selectedExchange.id,
        calendar_entry_id: selectedExchange.calendar_entry_id,
        title: selectedExchange.title,
        item_type: selectedExchange.item_type,
        category: selectedExchange.category,
        description: selectedExchange.description,
        priority: selectedExchange.priority,
        status: selectedExchange.status,
        journey_person: selectedExchange.journey_person,
        exchange_type: selectedExchange.exchange_type,
        is_public: selectedExchange.is_public,
        display_order: selectedExchange.display_order,
        slug: selectedExchange.slug,
        tagline: selectedExchange.tagline,
        full_description: selectedExchange.full_description,
      });
      setSelectedExchange(null);
      await loadExchange();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save exchange item.');
    } finally {
      setSaving(false);
    }
  }

  function toggleFounder(id: string) {
    setSelectedFounderIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  const statusOptions = tab === 'stops' ? entryStatuses : tab === 'hosts' ? hostStatuses : exchangeStatuses;
  const kpiSource = tab === 'stops' ? counts : tab === 'hosts' ? hostCounts : exchangeCounts;

  return (
    <div className="admin-section-page journey-calendar-admin">
      <div className="admin-section-heading">
        <div>
          <p>CONTENT</p>
          <h1>Journey Calendar</h1>
          <span>Manage public stops, host offers, linked needs/offers and translations.</span>
        </div>
        <div className="journey-calendar-admin__actions">
          {tab === 'stops' && (
            <button type="button" onClick={() => void openCreate()} disabled={loading || saving}>
              <Plus size={16} /> New stop
            </button>
          )}
          <button type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="journey-calendar-admin__tabs" role="tablist">
        {([
          ['stops', 'Stops'],
          ['hosts', 'Host offers'],
          ['exchange', 'Exchange'],
        ] as const).map(([key, title]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'is-active' : ''}
            onClick={() => {
              setTab(key);
              setStatus('all');
              setQuery('');
              setSelectedOffer(null);
              setSelectedExchange(null);
            }}
          >
            {title}
          </button>
        ))}
      </div>

      <section className="admin-kpis">
        {(['all', ...statusOptions] as string[]).map((item) => (
          <article key={item} onClick={() => setStatus(item)} style={{ cursor: 'pointer' }}>
            <div className="admin-kpi-icon"><CalendarDays /></div>
            <p>{label(item)}</p>
            <strong>{loading || !kpiSource ? '—' : (kpiSource[item] ?? 0)}</strong>
            <span>{status === item ? 'Active filter' : 'Click to filter'}</span>
          </article>
        ))}
      </section>

      <div className="admin-section-toolbar">
        <div>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === 'hosts' ? 'Search host, email or message…' : 'Search title, place or slug…'}
          />
        </div>
        <label>
          <Filter size={15} />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>Apply</button>
      </div>

      {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading calendar control…</div>}
      {error && <div className="admin-error">{error}</div>}

      {!loading && !error && tab === 'stops' && (
        <div className="admin-record-grid">
          {filteredStops.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <span>{[row.city_name, row.country_name].filter(Boolean).join(', ') || row.slug}</span>
              </div>
              <div className="admin-record-meta">
                <p><small>Status</small><b>{label(row.status)}</b></p>
                <p><small>Person</small><b>{label(row.journey_person)}</b></p>
                <p><small>Starts</small><b>{row.starts_on}</b></p>
                <p><small>Public</small><b>{row.is_public ? 'Yes' : 'No'}</b></p>
                <p><small>Host offers</small><b>{row.open_host_offers}</b></p>
                <p><small>Exchange</small><b>{row.exchange_item_count}</b></p>
              </div>
              <footer>
                <button type="button" onClick={() => void openEdit(row)}>Edit</button>
                <time>{formatDate(row.updated_at)}</time>
              </footer>
            </article>
          ))}
          {filteredStops.length === 0 && <div className="admin-section-empty">No calendar stops match this filter.</div>}
        </div>
      )}

      {!loading && !error && tab === 'hosts' && (
        <div className="admin-record-grid">
          {filteredHosts.map((offer) => (
            <article key={offer.id}>
              <div>
                <strong>{offer.host_name}</strong>
                <span>{offer.calendar_entry_title || offer.message}</span>
              </div>
              <div className="admin-record-meta">
                <p><small>Status</small><b>{label(offer.status)}</b></p>
                <p><small>Email</small><b>{offer.email}</b></p>
                <p><small>City</small><b>{offer.city_name || offer.calendar_entry_city || '—'}</b></p>
                <p><small>Capacity</small><b>{offer.guests_capacity ?? '—'}</b></p>
              </div>
              <footer>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOffer(offer);
                    setOfferNotes(offer.internal_notes || '');
                  }}
                >
                  Review
                </button>
                <time>{formatDate(offer.created_at)}</time>
              </footer>
            </article>
          ))}
          {filteredHosts.length === 0 && <div className="admin-section-empty">No host offers found.</div>}
        </div>
      )}

      {!loading && !error && tab === 'exchange' && (
        <div className="admin-record-grid">
          {filteredExchange.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.calendar_entry_title || item.category}</span>
              </div>
              <div className="admin-record-meta">
                <p><small>Type</small><b>{label(item.item_type)}</b></p>
                <p><small>Status</small><b>{label(item.status)}</b></p>
                <p><small>Priority</small><b>{label(item.priority)}</b></p>
                <p><small>Public</small><b>{item.is_public ? 'Yes' : 'No'}</b></p>
              </div>
              <footer>
                <button type="button" onClick={() => setSelectedExchange(item)}>Edit</button>
                <time>{formatDate(item.updated_at || item.created_at || null)}</time>
              </footer>
            </article>
          ))}
          {filteredExchange.length === 0 && <div className="admin-section-empty">No exchange items found.</div>}
        </div>
      )}

      {editorOpen && (
        <div className="admin-editor-backdrop">
          <section className="admin-editor journey-calendar-admin__editor">
            <header>
              <div>
                <p>{form.id ? 'EDIT STOP' : 'NEW STOP'}</p>
                <h2>{form.title || 'Calendar stop'}</h2>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)}><XCircle /></button>
            </header>

            <div className="journey-calendar-admin__editor-body">
              <fieldset className="journey-calendar-admin__section">
                <legend>Basics</legend>
                <div className="journey-calendar-admin__fields">
                  <label>
                    <span>Title</span>
                    <input
                      value={form.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setForm((current) => ({
                          ...current,
                          title,
                          slug: current.id ? current.slug : slugifyTitle(title),
                        }));
                      }}
                    />
                  </label>
                  <label>
                    <span>Slug</span>
                    <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CalendarEntryStatus }))}>
                      {entryStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Person</span>
                    <select value={form.journey_person} onChange={(event) => setForm((current) => ({ ...current, journey_person: event.target.value as JourneyPerson }))}>
                      {people.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Display order</span>
                    <input type="number" value={form.display_order ?? 0} onChange={(event) => setForm((current) => ({ ...current, display_order: Number(event.target.value) || 0 }))} />
                  </label>
                  <label>
                    <span>Public</span>
                    <button type="button" className={`admin-toggle ${form.is_public ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, is_public: !current.is_public }))}>
                      <i />{form.is_public ? 'Public' : 'Hidden'}
                    </button>
                  </label>
                  <label>
                    <span>Featured</span>
                    <button type="button" className={`admin-toggle ${form.is_featured ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, is_featured: !current.is_featured }))}>
                      <i />{form.is_featured ? 'Featured' : 'Not featured'}
                    </button>
                  </label>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Schedule</legend>
                <div className="journey-calendar-admin__fields">
                  <label>
                    <span>Starts on</span>
                    <input type="date" value={form.starts_on} onChange={(event) => setForm((current) => ({ ...current, starts_on: event.target.value }))} />
                  </label>
                  <label>
                    <span>Ends on</span>
                    <input type="date" value={form.ends_on || ''} onChange={(event) => setForm((current) => ({ ...current, ends_on: event.target.value || null }))} />
                  </label>
                  <label>
                    <span>Date flexibility (days)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.date_flexibility_days ?? 0}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        date_flexibility_days: Math.max(0, Number(event.target.value) || 0),
                      }))}
                    />
                  </label>
                  <label>
                    <span>Timezone</span>
                    <input
                      value={form.timezone || ''}
                      placeholder="e.g. Europe/Amsterdam"
                      onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value || null }))}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Place</legend>
                <div className="journey-calendar-admin__fields">
                  <label>
                    <span>Country code</span>
                    <input value={form.country_code || ''} onChange={(event) => setForm((current) => ({ ...current, country_code: event.target.value }))} />
                  </label>
                  <label>
                    <span>Country</span>
                    <input value={form.country_name || ''} onChange={(event) => setForm((current) => ({ ...current, country_name: event.target.value }))} />
                  </label>
                  <label>
                    <span>Region</span>
                    <input value={form.region_name || ''} onChange={(event) => setForm((current) => ({ ...current, region_name: event.target.value }))} />
                  </label>
                  <label>
                    <span>City</span>
                    <input value={form.city_name || ''} onChange={(event) => setForm((current) => ({ ...current, city_name: event.target.value }))} />
                  </label>
                  <label className="journey-calendar-admin__span-full">
                    <span>Location</span>
                    <input value={form.location_name || ''} onChange={(event) => setForm((current) => ({ ...current, location_name: event.target.value }))} />
                  </label>
                  <label>
                    <span>Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, latitude: parseOptionalNumber(event.target.value) }))}
                    />
                  </label>
                  <label>
                    <span>Longitude</span>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, longitude: parseOptionalNumber(event.target.value) }))}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Story</legend>
                <div className="journey-calendar-admin__fields">
                  <label className="journey-calendar-admin__span-full">
                    <span>Public summary</span>
                    <textarea rows={3} value={form.public_summary || ''} onChange={(event) => setForm((current) => ({ ...current, public_summary: event.target.value }))} />
                  </label>
                  <label className="journey-calendar-admin__span-full">
                    <span>Purpose</span>
                    <textarea rows={3} value={form.purpose || ''} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} />
                  </label>
                  <label>
                    <span>Transport</span>
                    <input value={form.transport_mode || ''} onChange={(event) => setForm((current) => ({ ...current, transport_mode: event.target.value }))} />
                  </label>
                  <label className="journey-calendar-admin__span-full">
                    <span>Related journal post ID</span>
                    <input
                      value={form.related_journal_post_id || ''}
                      placeholder="UUID"
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        related_journal_post_id: event.target.value.trim() || null,
                      }))}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Hosting</legend>
                <div className="journey-calendar-admin__fields">
                  <label>
                    <span>Accommodation needed</span>
                    <button type="button" className={`admin-toggle ${form.accommodation_needed ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, accommodation_needed: !current.accommodation_needed }))}>
                      <i />{form.accommodation_needed ? 'Needed' : 'Not needed'}
                    </button>
                  </label>
                  <label>
                    <span>Host request status</span>
                    <select value={form.host_request_status || 'not_needed'} onChange={(event) => setForm((current) => ({ ...current, host_request_status: event.target.value as CalendarEntryPayload['host_request_status'] }))}>
                      {['not_needed', 'open', 'offers_received', 'matched', 'closed'].map((item) => <option key={item} value={item}>{label(item)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Guests</span>
                    <input type="number" min={1} value={form.guests_count ?? 1} onChange={(event) => setForm((current) => ({ ...current, guests_count: Number(event.target.value) || 1 }))} />
                  </label>
                  <label>
                    <span>Nights needed</span>
                    <input type="number" min={0} value={form.nights_needed ?? ''} onChange={(event) => setForm((current) => ({ ...current, nights_needed: event.target.value === '' ? null : Number(event.target.value) }))} />
                  </label>
                  <label>
                    <span>Accommodation from</span>
                    <input type="date" value={form.accommodation_from || ''} onChange={(event) => setForm((current) => ({ ...current, accommodation_from: event.target.value || null }))} />
                  </label>
                  <label>
                    <span>Accommodation until</span>
                    <input type="date" value={form.accommodation_until || ''} onChange={(event) => setForm((current) => ({ ...current, accommodation_until: event.target.value || null }))} />
                  </label>
                  <label className="journey-calendar-admin__span-full">
                    <span>Host request message</span>
                    <textarea rows={3} value={form.host_request_message || ''} onChange={(event) => setForm((current) => ({ ...current, host_request_message: event.target.value }))} />
                  </label>
                </div>
              </fieldset>

              <div className="journey-calendar-admin__panel">
                <h3><Users size={16} /> Founders on this stop</h3>
                <div className="journey-calendar-admin__founder-list">
                  {founders.map((founder) => (
                    <label key={founder.id}>
                      <input
                        type="checkbox"
                        checked={selectedFounderIds.includes(founder.id)}
                        onChange={() => toggleFounder(founder.id)}
                      />
                      <span>{founder.display_name}</span>
                    </label>
                  ))}
                  {founders.length === 0 && <p>No founder profiles available.</p>}
                </div>
              </div>

              <div className="journey-calendar-admin__panel">
                <div className="journey-calendar-admin__panel-header">
                  <h3>Linked needs & offers</h3>
                  <button type="button" onClick={() => setShowExchangeForm((value) => !value)} disabled={!form.id && !saving}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {!form.id && <p className="journey-calendar-admin__hint">Save the stop before linking exchange items.</p>}
                <ul className="journey-calendar-admin__list">
                  {linkedExchange.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{label(item.item_type)} · {label(item.status)} · {label(item.priority)}</span>
                    </li>
                  ))}
                  {linkedExchange.length === 0 && <li>No linked exchange items yet.</li>}
                </ul>
                {showExchangeForm && (
                  <div className="journey-calendar-admin__nested-form">
                    <label>
                      <span>Title</span>
                      <input value={exchangeForm.title} onChange={(event) => setExchangeForm((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label>
                      <span>Type</span>
                      <select value={exchangeForm.item_type} onChange={(event) => setExchangeForm((current) => ({ ...current, item_type: event.target.value as ExchangeItem['item_type'] }))}>
                        <option value="need">Need</option>
                        <option value="offer">Offer</option>
                      </select>
                    </label>
                    <label>
                      <span>Category</span>
                      <input value={exchangeForm.category || ''} onChange={(event) => setExchangeForm((current) => ({ ...current, category: event.target.value }))} />
                    </label>
                    <label className="journey-calendar-admin__span-full">
                      <span>Description</span>
                      <textarea rows={3} value={exchangeForm.description || ''} onChange={(event) => setExchangeForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <button type="button" onClick={() => void saveLinkedExchange()} disabled={saving || !exchangeForm.title}>Save exchange item</button>
                  </div>
                )}
              </div>

              <div className="journey-calendar-admin__panel">
                <div className="journey-calendar-admin__panel-header">
                  <h3>Translations</h3>
                  <button type="button" onClick={() => void requeueTranslations()} disabled={!form.id || saving}>Requeue translations</button>
                </div>
                {translations ? (
                  <p>
                    {translations.published} published · {translations.machine} machine · {translations.reviewed} reviewed · {translations.draft} draft
                    {translations.expected_languages ? ` · expected ~${translations.expected_languages}` : ''}
                  </p>
                ) : (
                  <p className="journey-calendar-admin__hint">Save the stop to load translation status.</p>
                )}
              </div>
            </div>

            <footer>
              <button type="button" onClick={() => setEditorOpen(false)} disabled={saving}>Close</button>
              {form.id && form.status !== 'cancelled' ? (
                <button
                  type="button"
                  className="journey-calendar-admin__danger"
                  onClick={() => void deleteStop()}
                  disabled={saving}
                >
                  Delete stop
                </button>
              ) : null}
              <button type="button" onClick={() => void saveStop()} disabled={saving || !form.title || !form.starts_on}>
                {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                Save stop
              </button>
            </footer>
          </section>
        </div>
      )}

      {selectedOffer && (
        <div className="admin-editor-backdrop">
          <section className="admin-editor">
            <header>
              <div>
                <p>REVIEW HOST OFFER</p>
                <h2>{selectedOffer.host_name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedOffer(null)}><XCircle /></button>
            </header>
            <div className="admin-editor-fields">
              <div style={{ gridColumn: '1 / -1' }}>
                <small>Message</small>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedOffer.message}</p>
              </div>
              <label><span><Mail size={14} /> Email</span><input value={selectedOffer.email} readOnly /></label>
              <label><span>Phone</span><input value={selectedOffer.phone || '—'} readOnly /></label>
              <label><span><MapPin size={14} /> City</span><input value={selectedOffer.city_name || '—'} readOnly /></label>
              <label><span>Stop</span><input value={selectedOffer.calendar_entry_title || '—'} readOnly /></label>
              <label><span>Accommodation</span><input value={selectedOffer.accommodation_type || '—'} readOnly /></label>
              <label><span>Capacity</span><input value={selectedOffer.guests_capacity ?? '—'} readOnly /></label>
              <label><span>Available from</span><input value={selectedOffer.available_from || '—'} readOnly /></label>
              <label><span>Available until</span><input value={selectedOffer.available_until || '—'} readOnly /></label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Internal notes</span>
                <textarea rows={4} value={offerNotes} onChange={(event) => setOfferNotes(event.target.value)} />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setSelectedOffer(null)} disabled={saving}>Close</button>
              <button type="button" onClick={() => void moderateOffer('reviewing')} disabled={saving}>Reviewing</button>
              <button type="button" onClick={() => void moderateOffer('contacted')} disabled={saving}>Contacted</button>
              <button type="button" onClick={() => void moderateOffer('declined')} disabled={saving}>Decline</button>
              <button type="button" onClick={() => void moderateOffer('accepted')} disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />} Accept
              </button>
            </footer>
          </section>
        </div>
      )}

      {selectedExchange && (
        <div className="admin-editor-backdrop">
          <section className="admin-editor">
            <header>
              <div>
                <p>EDIT EXCHANGE ITEM</p>
                <h2>{selectedExchange.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedExchange(null)}><XCircle /></button>
            </header>
            <div className="admin-editor-fields">
              <label><span>Title</span><input value={selectedExchange.title} onChange={(event) => setSelectedExchange({ ...selectedExchange, title: event.target.value })} /></label>
              <label>
                <span>Status</span>
                <select value={selectedExchange.status} onChange={(event) => setSelectedExchange({ ...selectedExchange, status: event.target.value as ExchangeItemStatus })}>
                  {exchangeStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                </select>
              </label>
              <label>
                <span>Type</span>
                <select value={selectedExchange.item_type} onChange={(event) => setSelectedExchange({ ...selectedExchange, item_type: event.target.value as ExchangeItem['item_type'] })}>
                  <option value="need">Need</option>
                  <option value="offer">Offer</option>
                </select>
              </label>
              <label><span>Category</span><input value={selectedExchange.category} onChange={(event) => setSelectedExchange({ ...selectedExchange, category: event.target.value })} /></label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Description</span>
                <textarea rows={4} value={selectedExchange.description || ''} onChange={(event) => setSelectedExchange({ ...selectedExchange, description: event.target.value })} />
              </label>
              <label>
                <span>Public</span>
                <button
                  type="button"
                  className={`admin-toggle ${selectedExchange.is_public ? 'on' : ''}`}
                  onClick={() => setSelectedExchange({ ...selectedExchange, is_public: !selectedExchange.is_public })}
                >
                  <i />{selectedExchange.is_public ? 'Public' : 'Hidden'}
                </button>
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setSelectedExchange(null)} disabled={saving}>Close</button>
              <button type="button" onClick={() => void saveExchangeEditor()} disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />} Save
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

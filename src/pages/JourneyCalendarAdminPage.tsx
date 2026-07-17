import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Filter, LoaderCircle, Mail, MapPin, Plus, RefreshCw, Search, Users, XCircle,
} from 'lucide-react';
import {
  getJourneyCalendarEntry,
  getJourneyCalendarOverview,
  deleteJourneyCalendarEntry,
  listJourneyExchangeItems,
  listJourneyHostOffers,
  listJourneyLookupOptions,
  requeueJourneyCalendarTranslations,
  searchJournalPosts,
  setJourneyCalendarExchangeItems,
  setJourneyCalendarFounders,
  slugifyTitle,
  updateJourneyHostOffer,
  upsertJourneyCalendarEntry,
  upsertJourneyExchangeItem,
  upsertJourneyLookupOption,
  type CalendarEntry,
  type CalendarEntryPayload,
  type CalendarEntryStatus,
  type CalendarFounderOption,
  type CalendarOverviewRow,
  type ExchangeItem,
  type ExchangeItemPayload,
  type ExchangeItemStatus,
  type ExchangePriority,
  type ExchangeType,
  type HostOffer,
  type HostOfferStatus,
  type HostRequestStatus,
  type JournalPostSearchResult,
  type JourneyPerson,
  type LookupKind,
  type LookupOption,
  type TranslationSummary,
} from '../lib/journeyCalendarAdminApi';
import {
  AdminField,
  AdminMapPlacePicker,
  DateRangeFields,
  ISO_COUNTRIES,
  NumberStepper,
  SearchableMultiSelect,
  SearchableSelect,
  SegmentedControl,
  countryNameForCode,
} from '../components/admin/pickers';
import '../components/admin/pickers/adminPickers.css';
import '../styles/journeyCalendarAdmin.css';

type TabKey = 'stops' | 'hosts' | 'exchange';
type ToastTone = 'success' | 'error';
type AdminToast = { id: number; tone: ToastTone; message: string };

const TOAST_MS = 3500;
const FLEXIBILITY_PRESETS = [0, 1, 3, 7, 14];

const entryStatuses: CalendarEntryStatus[] = ['idea', 'planned', 'confirmed', 'travelling', 'completed', 'cancelled'];
const hostStatuses: HostOfferStatus[] = ['new', 'reviewing', 'contacted', 'accepted', 'declined', 'withdrawn'];
const exchangeStatuses: ExchangeItemStatus[] = ['draft', 'active', 'fulfilled', 'paused', 'archived'];
const people: JourneyPerson[] = ['kevin', 'micha', 'together'];
const hostRequestStatuses: HostRequestStatus[] = ['not_needed', 'open', 'offers_received', 'matched', 'closed'];
const exchangePriorities: ExchangePriority[] = ['low', 'normal', 'high', 'urgent'];
const exchangeTypes: ExchangeType[] = ['free', 'barter', 'donation', 'paid', 'mixed'];

function allTimezones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone');
    if (supported?.length) return supported;
  } catch {
    /* fallback below */
  }
  return ['UTC', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/London', 'America/New_York'];
}

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
  const [showLinkExchange, setShowLinkExchange] = useState(false);
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>([]);
  const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([]);
  const [allExchangeOptions, setAllExchangeOptions] = useState<ExchangeItem[]>([]);
  const [journalResults, setJournalResults] = useState<JournalPostSearchResult[]>([]);
  const [journalSearch, setJournalSearch] = useState('');
  const [newLookupLabel, setNewLookupLabel] = useState('');
  const [managingLookupKind, setManagingLookupKind] = useState<LookupKind | null>(null);
  const [pickerLoadError, setPickerLoadError] = useState<string | null>(null);
  const [journalSearchDirty, setJournalSearchDirty] = useState(false);
  const [pinnedJournal, setPinnedJournal] = useState<JournalPostSearchResult | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<HostOffer | null>(null);
  const [offerNotes, setOfferNotes] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeItem | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const toastTimers = useRef<Map<number, number>>(new Map());
  const toastIdRef = useRef(0);

  function dismissToast(id: number) {
    const timer = toastTimers.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function pushToast(tone: ToastTone, message: string) {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, tone, message }]);
    const timer = window.setTimeout(() => dismissToast(id), TOAST_MS);
    toastTimers.current.set(id, timer);
  }

  useEffect(() => () => {
    for (const timer of toastTimers.current.values()) window.clearTimeout(timer);
    toastTimers.current.clear();
  }, []);

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

  async function loadEditorLookups() {
    setPickerLoadError(null);
    try {
      const [lookups, exchange] = await Promise.all([
        listJourneyLookupOptions({ includeInactive: false }),
        listJourneyExchangeItems({ status: null, query: null }),
      ]);
      setLookupOptions(lookups);
      setAllExchangeOptions(exchange.rows);
      return { lookups, exchangeCount: exchange.rows.length };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not load picker options from Supabase.';
      setPickerLoadError(message);
      setLookupOptions([]);
      setAllExchangeOptions([]);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }

  async function openCreate() {
    setForm(emptyEntryForm());
    setSelectedFounderIds([]);
    setLinkedExchange([]);
    setSelectedExchangeIds([]);
    setTranslations(null);
    setExchangeForm(emptyExchangeForm());
    setShowExchangeForm(false);
    setShowLinkExchange(false);
    setManagingLookupKind(null);
    setNewLookupLabel('');
    setJournalSearch('');
    setJournalSearchDirty(false);
    setPinnedJournal(null);
    setJournalResults([]);
    setPickerLoadError(null);
    setEditorOpen(true);
    try {
      await loadEditorLookups();
      const posts = await searchJournalPosts({ query: '', limit: 25 });
      setJournalResults(posts);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not load picker options.';
      setPickerLoadError(message);
      pushToast('error', message);
    }
  }

  async function openEdit(row: CalendarOverviewRow) {
    setSaving(true);
    setError(null);
    setPickerLoadError(null);
    try {
      const [detail] = await Promise.all([
        getJourneyCalendarEntry(row.id),
        loadEditorLookups(),
      ]);
      setForm(entryToForm(detail.entry));
      setSelectedFounderIds(detail.founders.map((item) => item.founder_profile_id));
      setLinkedExchange(detail.exchange_items);
      setSelectedExchangeIds(detail.exchange_items.map((item) => item.id));
      setTranslations(detail.translations);
      setExchangeForm(emptyExchangeForm(row.id));
      setShowExchangeForm(false);
      setShowLinkExchange(false);
      setManagingLookupKind(null);
      setNewLookupLabel('');
      setJournalSearch('');
      setJournalSearchDirty(false);
      const relatedId = detail.entry.related_journal_post_id;
      if (relatedId) {
        const posts = await searchJournalPosts({ query: relatedId, limit: 25 });
        setJournalResults(posts);
        setPinnedJournal(posts.find((post) => post.id === relatedId) || {
          id: relatedId,
          title: relatedId,
          slug: '',
          status: 'unknown',
          published_at: null,
          created_at: '',
        });
      } else {
        const posts = await searchJournalPosts({ query: '', limit: 25 });
        setJournalResults(posts);
        setPinnedJournal(null);
      }
      setEditorOpen(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not open calendar stop.';
      setError(message);
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  async function saveStop() {
    const hasLatitude = form.latitude != null;
    const hasLongitude = form.longitude != null;
    if (hasLatitude !== hasLongitude) {
      const message = 'Latitude and longitude must both be set, or both left empty.';
      setError(message);
      pushToast('error', message);
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
        transport_mode: form.transport_mode?.trim() || null,
        country_code: form.country_code?.trim() || null,
        country_name: form.country_name?.trim() || null,
      };
      const saved = await upsertJourneyCalendarEntry(payload);
      await setJourneyCalendarFounders(saved.id, selectedFounderIds);
      const linked = await setJourneyCalendarExchangeItems(saved.id, selectedExchangeIds);
      setLinkedExchange(linked);
      setSelectedExchangeIds(linked.map((item) => item.id));
      const detail = await getJourneyCalendarEntry(saved.id);
      setForm(entryToForm(detail.entry));
      setSelectedFounderIds(detail.founders.map((item) => item.founder_profile_id));
      setLinkedExchange(detail.exchange_items);
      setSelectedExchangeIds(detail.exchange_items.map((item) => item.id));
      setTranslations(detail.translations);
      await loadStops();
      setError(null);
      pushToast('success', 'Stop saved');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not save calendar stop.';
      setError(message);
      pushToast('error', message);
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
      setSelectedExchangeIds([]);
      setTranslations(null);
      await loadStops();
      setError(null);
      pushToast('success', 'Stop deleted');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not delete calendar stop.';
      setError(message);
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  async function saveLinkedExchange() {
    if (!form.id && !exchangeForm.calendar_entry_id) {
      const message = 'Save the stop first, then add needs/offers.';
      setError(message);
      pushToast('error', message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const entryId = form.id || exchangeForm.calendar_entry_id;
      const created = await upsertJourneyExchangeItem({
        ...exchangeForm,
        calendar_entry_id: entryId,
      });
      const nextIds = Array.from(new Set([...selectedExchangeIds, created.id]));
      if (entryId) {
        const linked = await setJourneyCalendarExchangeItems(entryId, nextIds);
        setLinkedExchange(linked);
        setSelectedExchangeIds(linked.map((item) => item.id));
      }
      setExchangeForm(emptyExchangeForm(entryId));
      setShowExchangeForm(false);
      await loadEditorLookups();
      await loadStops();
      setError(null);
      pushToast('success', 'Exchange item saved');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not save exchange item.';
      setError(message);
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  async function requeueTranslations() {
    if (!form.id) return;
    const confirmed = window.confirm('Confirm requeueing translations for this stop?');
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await requeueJourneyCalendarTranslations({ entityType: 'journey_calendar_entry', entityId: form.id });
      const detail = await getJourneyCalendarEntry(form.id);
      setTranslations(detail.translations);
      setError(null);
      pushToast('success', 'Translations requeued');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not requeue translations.';
      setError(message);
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  async function moderateOffer(nextStatus: HostOfferStatus) {
    if (!selectedOffer) return;
    if (nextStatus === 'accepted') {
      const confirmed = window.confirm('Confirm accepting this host offer?');
      if (!confirmed) return;
    }
    if (nextStatus === 'declined') {
      const confirmed = window.confirm('Confirm declining this host offer?');
      if (!confirmed) return;
    }
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
      setError(null);
      pushToast('success', `Host offer marked ${nextStatus}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not update host offer.';
      setError(message);
      pushToast('error', message);
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
      setError(null);
      pushToast('success', 'Exchange item saved');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not save exchange item.';
      setError(message);
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  function toggleFounder(id: string) {
    setSelectedFounderIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  async function addLookupOption(kind: LookupKind) {
    const labelText = newLookupLabel.trim();
    if (!labelText) return;
    setSaving(true);
    try {
      await upsertJourneyLookupOption({
        kind,
        option_key: labelText,
        label: labelText,
        sort_order: 200,
        is_active: true,
      });
      setNewLookupLabel('');
      setLookupOptions(await listJourneyLookupOptions({ includeInactive: false }));
      pushToast('success', 'Option added');
    } catch (reason) {
      pushToast('error', reason instanceof Error ? reason.message : 'Could not add option.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivateLookupOption(option: LookupOption) {
    setSaving(true);
    try {
      await upsertJourneyLookupOption({
        id: option.id,
        kind: option.kind,
        option_key: option.option_key,
        label: option.label,
        sort_order: option.sort_order,
        is_active: false,
      });
      setLookupOptions(await listJourneyLookupOptions({ includeInactive: false }));
      pushToast('success', 'Option removed');
    } catch (reason) {
      pushToast('error', reason instanceof Error ? reason.message : 'Could not remove option.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!editorOpen || !journalSearchDirty) return;
    const handle = window.setTimeout(() => {
      void searchJournalPosts({ query: journalSearch, limit: 25 })
        .then((posts) => {
          setJournalResults(posts);
          if (form.related_journal_post_id) {
            const pinned = posts.find((post) => post.id === form.related_journal_post_id);
            if (pinned) setPinnedJournal(pinned);
          }
        })
        .catch((reason) => {
          pushToast('error', reason instanceof Error ? reason.message : 'Journal search failed.');
        });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [journalSearch, journalSearchDirty, editorOpen, form.related_journal_post_id]);

  const transportOptions = useMemo(() => {
    const rows = lookupOptions.filter((item) => item.kind === 'transport_mode');
    const current = form.transport_mode?.trim();
    if (current && !rows.some((item) => item.option_key === current)) {
      return [
        ...rows,
        {
          id: `pinned-transport-${current}`,
          kind: 'transport_mode' as const,
          option_key: current,
          label: current,
          sort_order: 999,
          is_active: true,
        },
      ];
    }
    return rows;
  }, [lookupOptions, form.transport_mode]);
  const categoryOptions = useMemo(() => {
    const rows = lookupOptions.filter((item) => item.kind === 'exchange_category');
    const current = exchangeForm.category?.trim();
    if (current && !rows.some((item) => item.option_key === current)) {
      return [
        ...rows,
        {
          id: `pinned-category-${current}`,
          kind: 'exchange_category' as const,
          option_key: current,
          label: current,
          sort_order: 999,
          is_active: true,
        },
      ];
    }
    return rows;
  }, [lookupOptions, exchangeForm.category]);
  const timezonePresetKeys = useMemo(
    () => new Set(lookupOptions.filter((item) => item.kind === 'timezone_preset').map((item) => item.option_key)),
    [lookupOptions],
  );
  const timezoneOptions = useMemo(() => {
    const zones = allTimezones();
    const presetFirst = [
      ...lookupOptions.filter((item) => item.kind === 'timezone_preset').map((item) => item.option_key),
      ...zones.filter((zone) => !timezonePresetKeys.has(zone)),
    ];
    if (form.timezone) presetFirst.unshift(form.timezone);
    return Array.from(new Set(presetFirst)).map((zone) => ({ value: zone, label: zone }));
  }, [lookupOptions, timezonePresetKeys, form.timezone]);
  const countryOptions = useMemo(
    () => ISO_COUNTRIES.map((item) => ({ value: item.code, label: `${item.name} (${item.code})` })),
    [],
  );
  const journalOptions = useMemo(() => {
    const byId = new Map(journalResults.map((post) => [post.id, {
      value: post.id,
      label: post.title,
      description: `${post.slug} · ${post.status}`,
    }]));
    if (pinnedJournal) {
      byId.set(pinnedJournal.id, {
        value: pinnedJournal.id,
        label: pinnedJournal.title,
        description: `${pinnedJournal.slug} · ${pinnedJournal.status}`,
      });
    }
    return Array.from(byId.values());
  }, [journalResults, pinnedJournal]);
  const exchangeLinkOptions = useMemo(
    () => allExchangeOptions.map((item) => ({
      value: item.id,
      label: item.title,
      description: `${label(item.item_type)} · ${label(item.category)} · ${label(item.status)}`,
      warning: item.calendar_entry_id && item.calendar_entry_id !== form.id
        ? `Linked to another stop: ${item.calendar_entry_title || item.calendar_entry_id}`
        : undefined,
    })),
    [allExchangeOptions, form.id],
  );
  const displayedLinkedExchange = useMemo(() => {
    const byId = new Map<string, ExchangeItem>();
    for (const item of linkedExchange) byId.set(item.id, item);
    for (const item of allExchangeOptions) byId.set(item.id, item);
    return selectedExchangeIds
      .map((id) => byId.get(id))
      .filter((item): item is ExchangeItem => Boolean(item));
  }, [selectedExchangeIds, linkedExchange, allExchangeOptions]);

  const statusOptions = tab === 'stops' ? entryStatuses : tab === 'hosts' ? hostStatuses : exchangeStatuses;
  const kpiSource = tab === 'stops' ? counts : tab === 'hosts' ? hostCounts : exchangeCounts;

  return (
    <div className="admin-section-page journey-calendar-admin">
      <div className="journey-calendar-admin__toasts" role="status" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`journey-calendar-admin__toast journey-calendar-admin__toast--${toast.tone}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <XCircle size={16} />
            </button>
          </div>
        ))}
      </div>
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
              {pickerLoadError ? (
                <div className="admin-error" style={{ marginBottom: '0.75rem' }}>
                  <p>{pickerLoadError}</p>
                  <button type="button" onClick={() => void loadEditorLookups().catch(() => undefined)} disabled={saving}>
                    Retry loading pickers
                  </button>
                </div>
              ) : null}
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
                  <AdminField label="Status" className="journey-calendar-admin__span-full">
                    <SegmentedControl
                      ariaLabel="Status"
                      value={form.status}
                      options={entryStatuses.map((item) => ({ value: item, label: label(item) }))}
                      onChange={(statusValue) => setForm((current) => ({ ...current, status: statusValue }))}
                    />
                  </AdminField>
                  <AdminField label="Person" className="journey-calendar-admin__span-full">
                    <SegmentedControl
                      ariaLabel="Person"
                      value={form.journey_person}
                      options={people.map((item) => ({ value: item, label: label(item) }))}
                      onChange={(person) => setForm((current) => ({ ...current, journey_person: person }))}
                    />
                  </AdminField>
                  <AdminField label="Display order">
                    <NumberStepper
                      value={form.display_order ?? 0}
                      onChange={(value) => setForm((current) => ({ ...current, display_order: value ?? 0 }))}
                    />
                  </AdminField>
                  <AdminField label="Public">
                    <button type="button" className={`admin-toggle ${form.is_public ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, is_public: !current.is_public }))}>
                      <i />{form.is_public ? 'Public' : 'Hidden'}
                    </button>
                  </AdminField>
                  <AdminField label="Featured">
                    <button type="button" className={`admin-toggle ${form.is_featured ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, is_featured: !current.is_featured }))}>
                      <i />{form.is_featured ? 'Featured' : 'Not featured'}
                    </button>
                  </AdminField>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Schedule</legend>
                <div className="journey-calendar-admin__fields">
                  <DateRangeFields
                    start={form.starts_on}
                    end={form.ends_on || null}
                    onStartChange={(starts_on) => setForm((current) => ({ ...current, starts_on }))}
                    onEndChange={(ends_on) => setForm((current) => ({ ...current, ends_on }))}
                  />
                  <AdminField label="Date flexibility (days)">
                    <div className="admin-picker-flexibility">
                      {FLEXIBILITY_PRESETS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          className={(form.date_flexibility_days ?? 0) === days ? 'is-active' : ''}
                          onClick={() => setForm((current) => ({ ...current, date_flexibility_days: days }))}
                        >
                          {days}
                        </button>
                      ))}
                    </div>
                    <NumberStepper
                      min={0}
                      value={form.date_flexibility_days ?? 0}
                      onChange={(value) => setForm((current) => ({ ...current, date_flexibility_days: Math.max(0, value ?? 0) }))}
                    />
                  </AdminField>
                  <AdminField label="Timezone">
                    <SearchableSelect
                      value={form.timezone || null}
                      options={timezoneOptions}
                      placeholder="Search timezones…"
                      onChange={(timezone) => setForm((current) => ({ ...current, timezone }))}
                    />
                  </AdminField>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Place</legend>
                <div className="journey-calendar-admin__fields">
                  <AdminMapPlacePicker
                    latitude={form.latitude ?? null}
                    longitude={form.longitude ?? null}
                    onChange={(place) => setForm((current) => ({
                      ...current,
                      latitude: place.latitude,
                      longitude: place.longitude,
                      country_code: place.country_code ?? current.country_code,
                      country_name: place.country_name ?? current.country_name,
                      region_name: place.region_name ?? current.region_name,
                      city_name: place.city_name ?? current.city_name,
                      location_name: place.location_name ?? current.location_name,
                    }))}
                  />
                  <AdminField label="Country">
                    <SearchableSelect
                      value={form.country_code || null}
                      options={countryOptions}
                      placeholder="Select country…"
                      onChange={(code) => setForm((current) => ({
                        ...current,
                        country_code: code,
                        country_name: countryNameForCode(code) || current.country_name,
                      }))}
                    />
                  </AdminField>
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
                  <AdminField label="Transport">
                    <SearchableSelect
                      value={form.transport_mode || null}
                      options={transportOptions.map((item) => ({ value: item.option_key, label: item.label }))}
                      placeholder="Select transport…"
                      onChange={(transport_mode) => setForm((current) => ({ ...current, transport_mode: transport_mode || '' }))}
                    />
                    <div className="admin-picker-lookup-manage">
                      <button type="button" onClick={() => setManagingLookupKind(managingLookupKind === 'transport_mode' ? null : 'transport_mode')}>
                        Manage options
                      </button>
                    </div>
                    {managingLookupKind === 'transport_mode' ? (
                      <div className="admin-picker-lookup-manage">
                        <input
                          value={newLookupLabel}
                          placeholder="Add transport…"
                          onChange={(event) => setNewLookupLabel(event.target.value)}
                        />
                        <button type="button" disabled={saving || !newLookupLabel.trim()} onClick={() => void addLookupOption('transport_mode')}>Add</button>
                        {transportOptions.filter((option) => !option.id.startsWith('pinned-')).map((option) => (
                          <button key={option.id} type="button" onClick={() => void deactivateLookupOption(option)}>
                            Remove {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </AdminField>
                  <AdminField label="Related journal post" className="journey-calendar-admin__span-full">
                    <input
                      value={journalSearch}
                      placeholder="Search journal posts…"
                      onChange={(event) => {
                        setJournalSearchDirty(true);
                        setJournalSearch(event.target.value);
                      }}
                      style={{ marginBottom: '0.45rem' }}
                    />
                    <SearchableSelect
                      value={form.related_journal_post_id || null}
                      options={journalOptions}
                      selectedOption={pinnedJournal ? {
                        value: pinnedJournal.id,
                        label: pinnedJournal.title,
                        description: `${pinnedJournal.slug} · ${pinnedJournal.status}`,
                      } : null}
                      placeholder="Select a journal post…"
                      onChange={(related_journal_post_id) => {
                        setForm((current) => ({ ...current, related_journal_post_id }));
                        if (related_journal_post_id) {
                          const match = journalResults.find((post) => post.id === related_journal_post_id) || pinnedJournal;
                          if (match && match.id === related_journal_post_id) setPinnedJournal(match);
                        } else {
                          setPinnedJournal(null);
                        }
                      }}
                    />
                  </AdminField>
                </div>
              </fieldset>

              <fieldset className="journey-calendar-admin__section">
                <legend>Hosting</legend>
                <div className="journey-calendar-admin__fields">
                  <AdminField label="Accommodation needed">
                    <button type="button" className={`admin-toggle ${form.accommodation_needed ? 'on' : ''}`} onClick={() => setForm((current) => ({ ...current, accommodation_needed: !current.accommodation_needed }))}>
                      <i />{form.accommodation_needed ? 'Needed' : 'Not needed'}
                    </button>
                  </AdminField>
                  <AdminField label="Host request status" className="journey-calendar-admin__span-full">
                    <SegmentedControl
                      ariaLabel="Host request status"
                      value={form.host_request_status || 'not_needed'}
                      options={hostRequestStatuses.map((item) => ({ value: item, label: label(item) }))}
                      onChange={(host_request_status) => setForm((current) => ({ ...current, host_request_status }))}
                    />
                  </AdminField>
                  <AdminField label="Guests">
                    <NumberStepper
                      min={1}
                      value={form.guests_count ?? 1}
                      onChange={(value) => setForm((current) => ({ ...current, guests_count: Math.max(1, value ?? 1) }))}
                    />
                  </AdminField>
                  <AdminField label="Nights needed">
                    <NumberStepper
                      min={0}
                      allowNull
                      value={form.nights_needed ?? null}
                      onChange={(value) => setForm((current) => ({ ...current, nights_needed: value }))}
                    />
                  </AdminField>
                  <DateRangeFields
                    start={form.accommodation_from || ''}
                    end={form.accommodation_until || null}
                    startLabel="Accommodation from"
                    endLabel="Accommodation until"
                    onStartChange={(accommodation_from) => setForm((current) => ({ ...current, accommodation_from: accommodation_from || null }))}
                    onEndChange={(accommodation_until) => setForm((current) => ({ ...current, accommodation_until }))}
                  />
                  <label className="journey-calendar-admin__span-full">
                    <span>Host request message</span>
                    <textarea rows={3} value={form.host_request_message || ''} onChange={(event) => setForm((current) => ({ ...current, host_request_message: event.target.value }))} />
                  </label>
                </div>
              </fieldset>

              <div className="journey-calendar-admin__panel">
                <h3><Users size={16} /> Founders on this stop</h3>
                <div className="admin-picker-founder-cards">
                  {founders.map((founder) => {
                    const selected = selectedFounderIds.includes(founder.id);
                    return (
                      <button
                        key={founder.id}
                        type="button"
                        className={selected ? 'is-active' : ''}
                        onClick={() => toggleFounder(founder.id)}
                      >
                        <i>{founder.display_name.slice(0, 1)}</i>
                        <span>{founder.display_name}</span>
                      </button>
                    );
                  })}
                  {founders.length === 0 && <p>No founder profiles available.</p>}
                </div>
              </div>

              <div className="journey-calendar-admin__panel">
                <div className="journey-calendar-admin__panel-header">
                  <h3>Linked needs & offers</h3>
                  <div className="journey-calendar-admin__actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkExchange((value) => !value);
                        setShowExchangeForm(false);
                      }}
                      disabled={saving || Boolean(pickerLoadError)}
                    >
                      <Search size={14} /> {showLinkExchange ? 'Hide catalog' : 'Link existing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExchangeForm((value) => !value);
                        setShowLinkExchange(false);
                      }}
                      disabled={!form.id || saving}
                    >
                      <Plus size={14} /> Create new
                    </button>
                  </div>
                </div>
                <p className="admin-picker-catalog-meta">
                  {pickerLoadError
                    ? 'Exchange catalog failed to load from Supabase.'
                    : `${allExchangeOptions.length} live items loaded · ${selectedExchangeIds.length} linked to this stop`}
                </p>
                {!form.id && <p className="journey-calendar-admin__hint">Linked items apply on Save. Create new requires saving the stop first.</p>}
                <div className="admin-picker-multi__chips" style={{ marginBottom: '0.75rem' }}>
                  {displayedLinkedExchange.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedExchangeIds((current) => current.filter((id) => id !== item.id));
                        setLinkedExchange((current) => current.filter((row) => row.id !== item.id));
                      }}
                    >
                      {item.title}
                      <XCircle size={12} />
                    </button>
                  ))}
                  {displayedLinkedExchange.length === 0 ? (
                    <span className="admin-picker-multi__empty">No linked exchange items yet.</span>
                  ) : null}
                </div>
                {showLinkExchange ? (
                  <SearchableMultiSelect
                    values={selectedExchangeIds}
                    options={exchangeLinkOptions}
                    placeholder="Search needs and offers…"
                    emptyLabel={pickerLoadError || (allExchangeOptions.length === 0 ? 'No exchange items in database' : 'No matches')}
                    onChange={(ids) => {
                      setSelectedExchangeIds(ids);
                      setLinkedExchange(allExchangeOptions.filter((item) => ids.includes(item.id)));
                    }}
                  />
                ) : null}
                {showExchangeForm && (
                  <div className="journey-calendar-admin__nested-form">
                    <label>
                      <span>Title</span>
                      <input value={exchangeForm.title} onChange={(event) => setExchangeForm((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <AdminField label="Type">
                      <SegmentedControl
                        ariaLabel="Exchange type need or offer"
                        value={exchangeForm.item_type}
                        options={[
                          { value: 'need' as const, label: 'Need' },
                          { value: 'offer' as const, label: 'Offer' },
                        ]}
                        onChange={(item_type) => setExchangeForm((current) => ({ ...current, item_type }))}
                      />
                    </AdminField>
                    <AdminField label="Category">
                      <SearchableSelect
                        value={exchangeForm.category || null}
                        options={categoryOptions.map((item) => ({ value: item.option_key, label: item.label }))}
                        placeholder="Select category…"
                        allowClear={false}
                        onChange={(category) => setExchangeForm((current) => ({ ...current, category: category || 'other' }))}
                      />
                      <div className="admin-picker-lookup-manage">
                        <button type="button" onClick={() => setManagingLookupKind(managingLookupKind === 'exchange_category' ? null : 'exchange_category')}>
                          Manage categories
                        </button>
                      </div>
                      {managingLookupKind === 'exchange_category' ? (
                        <div className="admin-picker-lookup-manage">
                          <input
                            value={newLookupLabel}
                            placeholder="Add category…"
                            onChange={(event) => setNewLookupLabel(event.target.value)}
                          />
                          <button type="button" disabled={saving || !newLookupLabel.trim()} onClick={() => void addLookupOption('exchange_category')}>Add</button>
                          {categoryOptions.filter((option) => !option.id.startsWith('pinned-')).map((option) => (
                            <button key={option.id} type="button" onClick={() => void deactivateLookupOption(option)}>
                              Remove {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </AdminField>
                    <AdminField label="Priority">
                      <SegmentedControl
                        ariaLabel="Priority"
                        value={exchangeForm.priority || 'normal'}
                        options={exchangePriorities.map((item) => ({ value: item, label: label(item) }))}
                        onChange={(priority) => setExchangeForm((current) => ({ ...current, priority }))}
                      />
                    </AdminField>
                    <AdminField label="Status">
                      <SegmentedControl
                        ariaLabel="Exchange status"
                        value={exchangeForm.status || 'active'}
                        options={exchangeStatuses.map((item) => ({ value: item, label: label(item) }))}
                        onChange={(statusValue) => setExchangeForm((current) => ({ ...current, status: statusValue }))}
                      />
                    </AdminField>
                    <AdminField label="Person">
                      <SegmentedControl
                        ariaLabel="Exchange person"
                        value={exchangeForm.journey_person || 'together'}
                        options={people.map((item) => ({ value: item, label: label(item) }))}
                        onChange={(journey_person) => setExchangeForm((current) => ({ ...current, journey_person }))}
                      />
                    </AdminField>
                    <AdminField label="Exchange type">
                      <SegmentedControl
                        ariaLabel="Exchange compensation"
                        value={exchangeForm.exchange_type || 'free'}
                        options={exchangeTypes.map((item) => ({ value: item, label: label(item) }))}
                        onChange={(exchange_type) => setExchangeForm((current) => ({ ...current, exchange_type }))}
                      />
                    </AdminField>
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

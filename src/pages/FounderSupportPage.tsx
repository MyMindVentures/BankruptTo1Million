import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Heart, LockKeyhole, MessageCircleHeart, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import {
  addFounderSupportReaction,
  getFounderMappings,
  getFounderProfiles,
  getPublicFounderWins,
  getPublicMissionReminders,
  getPublishedSupportMessages,
  getRecentFounderCheckIns,
  saveFounderCheckIn,
  submitFounderSupportMessage,
} from '../lib/founderSupport';
import type {
  FounderCheckIn,
  FounderMissionReminder,
  FounderProfile,
  FounderSupportMessage,
  FounderWin,
} from '../lib/founderSupport';

const reactionOptions = [
  { value: 'believe_in_you', label: 'I believe in you' },
  { value: 'keep_going', label: 'Keep going' },
  { value: 'inspired_me', label: 'You inspire me' },
  { value: 'not_alone', label: 'You are not alone' },
  { value: 'proud_of_you', label: 'Proud of you' },
  { value: 'thank_you', label: 'Thank you' },
];

const messageTypes = [
  ['encouragement', 'Encouragement'],
  ['gratitude', 'Gratitude'],
  ['personal_story', 'A shared story'],
  ['celebration', 'Celebrate a win'],
  ['practical_support', 'Practical support'],
  ['belief', 'A message of belief'],
];

const initialForm = {
  recipientScope: 'both' as 'founder' | 'both' | 'mission',
  founderProfileId: '',
  senderName: '',
  senderEmail: '',
  senderLocation: '',
  messageType: 'encouragement',
  title: '',
  body: '',
  isAnonymous: false,
  consentToPublish: true,
  consentToContact: false,
};

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

function founderName(profiles: FounderProfile[], id?: string | null) {
  return profiles.find((profile) => profile.id === id)?.display_name || 'the founders';
}

function sessionKey() {
  const key = 'b1m.founder-support.session';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
}

function MessageCard({ message, profiles }: { message: FounderSupportMessage; profiles: FounderProfile[] }) {
  const recipient = message.recipient_scope === 'founder'
    ? founderName(profiles, message.founder_profile_id)
    : message.recipient_scope === 'mission' ? 'the mission' : 'Kevin & Micha';

  return (
    <article className="founder-support-card founder-support-card--message">
      <div className="founder-support-card__meta">
        <span>For {recipient}</span>
        <time>{formatDate(message.published_at || message.created_at)}</time>
      </div>
      {message.title ? <h3>{message.title}</h3> : null}
      <blockquote>{message.body}</blockquote>
      <p className="founder-support-card__author">
        — {message.is_anonymous ? 'Anonymous supporter' : message.sender_name}
        {message.sender_location ? ` · ${message.sender_location}` : ''}
      </p>
    </article>
  );
}

function WinCard({ win, profiles }: { win: FounderWin; profiles: FounderProfile[] }) {
  const recipient = win.recipient_scope === 'founder'
    ? founderName(profiles, win.founder_profile_id)
    : win.recipient_scope === 'mission' ? 'Mission progress' : 'Shared progress';

  return (
    <article className="founder-support-card founder-support-card--win">
      <div className="founder-support-card__icon"><Trophy aria-hidden="true" size={20} /></div>
      <p className="eyebrow">{recipient} · {win.win_type.replaceAll('_', ' ')}</p>
      <h3>{win.title}</h3>
      {win.description ? <p>{win.description}</p> : null}
      <time>{formatDate(win.occurred_at)}</time>
    </article>
  );
}

function ReminderCard({ reminder }: { reminder: FounderMissionReminder }) {
  return (
    <article className="founder-support-reminder">
      <Sparkles aria-hidden="true" size={20} />
      <div>
        <p className="eyebrow">{reminder.reminder_type.replaceAll('_', ' ')}</p>
        <h3>{reminder.title}</h3>
        <p>{reminder.body}</p>
        {reminder.source_label ? <small>{reminder.source_label}</small> : null}
      </div>
    </article>
  );
}

function FounderDashboard({ profiles }: { profiles: FounderProfile[] }) {
  const { t } = useWebsiteI18n();
  const initialSession = supabase.auth.getSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [mapping, setMapping] = useState<{ founder_profile_id: string } | null>(null);
  const [recent, setRecent] = useState<FounderCheckIn[]>([]);
  const [dashboardState, setDashboardState] = useState<'idle' | 'loading' | 'ready' | 'error'>(initialSession ? 'loading' : 'idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [checkIn, setCheckIn] = useState<FounderCheckIn>({
    founder_profile_id: '',
    check_in_date: new Date().toISOString().slice(0, 10),
    energy_level: 5,
    motivation_level: 5,
    stress_level: 5,
    mission_belief_level: 5,
    confidence_level: 5,
    mood_label: '',
    biggest_win: '',
    biggest_challenge: '',
    support_needed: '',
    private_reflection: '',
    gratitude_note: '',
    tomorrow_intention: '',
    needs_human_support: false,
    support_urgency: 'none',
  });

  async function loadDashboard(accessToken: string) {
    setDashboardState('loading');
    try {
      const mappings = await getFounderMappings(accessToken);
      const first = mappings[0];
      if (!first) throw new Error('This account is not linked to a founder profile yet.');
      setMapping(first);
      setCheckIn((current) => ({ ...current, founder_profile_id: first.founder_profile_id }));
      setRecent(await getRecentFounderCheckIns(accessToken, first.founder_profile_id));
      setDashboardState('ready');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not load the founder dashboard.');
      setDashboardState('error');
    }
  }

  useEffect(() => {
    if (initialSession) void loadDashboard(initialSession.access_token);
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setAuthError('');
    try {
      const activeSession = await supabase.auth.signInWithPassword(email, password);
      await loadDashboard(activeSession.access_token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed.');
    }
  }

  async function submitCheckIn(event: FormEvent) {
    event.preventDefault();
    const active = supabase.auth.getSession();
    if (!active || !mapping) return;
    setSaveState('saving');
    try {
      await saveFounderCheckIn(active.access_token, checkIn);
      setRecent(await getRecentFounderCheckIns(active.access_token, mapping.founder_profile_id));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  if (!supabase.auth.getSession() && dashboardState === 'idle') {
    return (
      <div className="founder-private-login">
        <LockKeyhole aria-hidden="true" size={28} />
        <div>
          <p className="eyebrow">{t('founder_support.private.login.eyebrow', 'Private founder space')}</p>
          <h3>{t('founder_support.private.login.title', 'Founder sign-in')}</h3>
          <p>{t('founder_support.private.login.description', 'Private reflections and wellbeing check-ins are protected by Supabase authentication and RLS.')}</p>
        </div>
        <form onSubmit={signIn}>
          <input type="email" placeholder={t('founder_support.private.login.email', 'Email')} value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input type="password" placeholder={t('founder_support.private.login.password', 'Password')} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="button" type="submit">{t('founder_support.private.login.submit', 'Sign in securely')}</button>
          {authError ? <p className="form-error">{authError}</p> : null}
        </form>
      </div>
    );
  }

  if (dashboardState === 'loading') return <div className="impact-state">{t('founder_support.private.dashboard.loading', 'Loading private founder dashboard…')}</div>;
  if (dashboardState === 'error') return <div className="impact-state impact-state--error">{authError}</div>;

  const activeFounder = profiles.find((profile) => profile.id === mapping?.founder_profile_id);
  const ranges = [
    ['energy_level', t('founder_support.private.checkin.energy', 'Energy')],
    ['motivation_level', t('founder_support.private.checkin.motivation', 'Motivation')],
    ['stress_level', t('founder_support.private.checkin.stress', 'Stress')],
    ['mission_belief_level', t('founder_support.private.checkin.mission_belief', 'Mission belief')],
    ['confidence_level', t('founder_support.private.checkin.confidence', 'Confidence')],
  ] as const;

  return (
    <div className="founder-dashboard">
      <div className="founder-dashboard__header">
        <div>
          <p className="eyebrow">{t('founder_support.private.dashboard.eyebrow', 'Private founder dashboard')}</p>
          <h3>{t('founder_support.private.dashboard.title', '{name} check-in', { name: activeFounder?.display_name || t('founder_support.private.dashboard.founder_fallback', 'Founder') })}</h3>
          <p>{t('founder_support.private.dashboard.disclaimer', 'This reflection is private and is not a medical or diagnostic tool.')}</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <form className="founder-checkin-form" onSubmit={submitCheckIn}>
        <div className="founder-range-grid">
          {ranges.map(([key, label]) => (
            <label key={key}>{label}<strong>{checkIn[key] ?? 5}/10</strong>
              <input type="range" min="1" max="10" value={checkIn[key] ?? 5} onChange={(event) => setCheckIn({ ...checkIn, [key]: Number(event.target.value) })} />
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>{t('founder_support.private.checkin.mood', 'Mood')}<input value={checkIn.mood_label || ''} onChange={(event) => setCheckIn({ ...checkIn, mood_label: event.target.value })} placeholder={t('founder_support.private.checkin.mood_placeholder', 'One honest word')} /></label>
          <label>{t('founder_support.private.checkin.win', "Today's win")}<input value={checkIn.biggest_win || ''} onChange={(event) => setCheckIn({ ...checkIn, biggest_win: event.target.value })} placeholder={t('founder_support.private.checkin.win_placeholder', 'Even something small')} /></label>
        </div>
        <label>{t('founder_support.private.checkin.challenge', 'Biggest challenge')}<textarea value={checkIn.biggest_challenge || ''} onChange={(event) => setCheckIn({ ...checkIn, biggest_challenge: event.target.value })} /></label>
        <label>{t('founder_support.private.checkin.support_needed', 'What support would help?')}<textarea value={checkIn.support_needed || ''} onChange={(event) => setCheckIn({ ...checkIn, support_needed: event.target.value })} /></label>
        <label>{t('founder_support.private.checkin.reflection', 'Private reflection')}<textarea value={checkIn.private_reflection || ''} onChange={(event) => setCheckIn({ ...checkIn, private_reflection: event.target.value })} /></label>
        <div className="form-grid">
          <label>{t('founder_support.private.checkin.gratitude', 'Gratitude note')}<input value={checkIn.gratitude_note || ''} onChange={(event) => setCheckIn({ ...checkIn, gratitude_note: event.target.value })} /></label>
          <label>{t('founder_support.private.checkin.intention', "Tomorrow's intention")}<input value={checkIn.tomorrow_intention || ''} onChange={(event) => setCheckIn({ ...checkIn, tomorrow_intention: event.target.value })} /></label>
        </div>
        <label className="founder-checkin-alert"><input type="checkbox" checked={checkIn.needs_human_support || false} onChange={(event) => setCheckIn({ ...checkIn, needs_human_support: event.target.checked, support_urgency: event.target.checked ? 'medium' : 'none' })} /> {t('founder_support.private.checkin.human_support', 'I would benefit from a human check-in.')}</label>
        <button className="button" type="submit" disabled={saveState === 'saving'}>{saveState === 'saving' ? t('founder_support.private.checkin.saving', 'Saving privately…') : t('founder_support.private.checkin.save', 'Save private check-in')}</button>
        {saveState === 'saved' ? <p className="founder-save-success">{t('founder_support.private.checkin.saved', 'Private check-in saved.')}</p> : null}
        {saveState === 'error' ? <p className="form-error">{t('founder_support.private.checkin.save_error', 'The check-in could not be saved.')}</p> : null}
      </form>
      {recent.length ? (
        <div className="founder-recent-checkins">
          <h4>{t('founder_support.private.checkin.recent_title', 'Recent check-ins')}</h4>
          {recent.slice(0, 5).map((row) => (
            <article key={`${row.founder_profile_id}-${row.check_in_date}`}>
              <time>{formatDate(row.check_in_date)}</time>
              <strong>{row.mood_label || t('founder_support.private.checkin.no_mood', 'No mood label')}</strong>
              <span>{t('founder_support.private.checkin.metrics', 'Energy {energy} · Motivation {motivation} · Stress {stress}', { energy: row.energy_level || '—', motivation: row.motivation_level || '—', stress: row.stress_level || '—' })}</span>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const FOUNDER_SUPPORT_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.founder.support.page',
  namespace: 'founder_support',
  translationKeys: [
    'founder_support.closing.description',
    'founder_support.closing.eyebrow',
    'founder_support.closing.title',
    'founder_support.form.message',
    'founder_support.form.message_placeholder',
    'founder_support.form.optional',
    'founder_support.form.title',
    'founder_support.form.title_placeholder',
    'founder_support.messages.description',
    'founder_support.messages.eyebrow',
    'founder_support.messages.title',
    'founder_support.private.checkin.challenge',
    'founder_support.private.checkin.confidence',
    'founder_support.private.checkin.energy',
    'founder_support.private.checkin.gratitude',
    'founder_support.private.checkin.human_support',
    'founder_support.private.checkin.intention',
    'founder_support.private.checkin.metrics',
    'founder_support.private.checkin.mission_belief',
    'founder_support.private.checkin.mood',
    'founder_support.private.checkin.mood_placeholder',
    'founder_support.private.checkin.motivation',
    'founder_support.private.checkin.no_mood',
    'founder_support.private.checkin.recent_title',
    'founder_support.private.checkin.reflection',
    'founder_support.private.checkin.save',
    'founder_support.private.checkin.save_error',
    'founder_support.private.checkin.saved',
    'founder_support.private.checkin.saving',
    'founder_support.private.checkin.stress',
    'founder_support.private.checkin.support_needed',
    'founder_support.private.checkin.win',
    'founder_support.private.checkin.win_placeholder',
    'founder_support.private.dashboard.disclaimer',
    'founder_support.private.dashboard.eyebrow',
    'founder_support.private.dashboard.founder_fallback',
    'founder_support.private.dashboard.loading',
    'founder_support.private.dashboard.title',
    'founder_support.private.login.description',
    'founder_support.private.login.email',
    'founder_support.private.login.eyebrow',
    'founder_support.private.login.password',
    'founder_support.private.login.submit',
    'founder_support.private.login.title',
    'founder_support.private.section.description',
    'founder_support.private.section.eyebrow',
    'founder_support.private.section.title',
    'founder_support.reactions.description',
    'founder_support.reactions.eyebrow',
    'founder_support.reactions.title',
    'founder_support.reminders.description',
    'founder_support.reminders.eyebrow',
    'founder_support.reminders.title',
    'founder_support.wins.description',
    'founder_support.wins.eyebrow',
    'founder_support.wins.title',
  ] as const,
  entityContent: {
    tables: [
      'founder_profiles',
      'founder_profile_translations',
      'founder_support_messages',
      'founder_wins',
      'founder_mission_reminders',
    ],
  },
} as const satisfies I18nManifest;

export function FounderSupportPage() {
  const { t } = useWebsiteI18n();
  const [profiles, setProfiles] = useState<FounderProfile[]>([]);
  const [messages, setMessages] = useState<FounderSupportMessage[]>([]);
  const [wins, setWins] = useState<FounderWin[]>([]);
  const [reminders, setReminders] = useState<FounderMissionReminder[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [form, setForm] = useState(initialForm);
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');
  const [reactionState, setReactionState] = useState('');

  useEffect(() => {
    Promise.allSettled([
      getFounderProfiles(),
      getPublishedSupportMessages(),
      getPublicFounderWins(),
      getPublicMissionReminders(),
    ]).then(([profilesResult, messagesResult, winsResult, remindersResult]) => {
      const profileRows = profilesResult.status === 'fulfilled' ? profilesResult.value : [];
      setProfiles(profileRows);
      setMessages(messagesResult.status === 'fulfilled' ? messagesResult.value : []);
      setWins(winsResult.status === 'fulfilled' ? winsResult.value : []);
      setReminders(remindersResult.status === 'fulfilled' ? remindersResult.value : []);
      setForm((current) => ({ ...current, founderProfileId: profileRows[0]?.id || '' }));
      const failures = [profilesResult, messagesResult, winsResult, remindersResult].filter((result) => result.status === 'rejected');
      setLoadState(failures.length === 4 ? 'error' : 'ready');
    });
  }, []);

  const recipientLabel = useMemo(() => form.recipientScope === 'founder'
    ? founderName(profiles, form.founderProfileId)
    : form.recipientScope === 'mission' ? 'the mission' : 'Kevin & Micha', [form.recipientScope, form.founderProfileId, profiles]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    setFormState('submitting');
    setFormError('');
    if (!form.senderName.trim() || !form.body.trim()) {
      setFormState('error');
      setFormError('Please add your name and message.');
      return;
    }
    try {
      await submitFounderSupportMessage(form);
      setFormState('success');
      setForm({ ...initialForm, founderProfileId: profiles[0]?.id || '' });
    } catch (error) {
      setFormState('error');
      setFormError(error instanceof Error ? error.message : 'Your message could not be submitted.');
    }
  }

  async function react(reactionType: string) {
    setReactionState(reactionType);
    try {
      await addFounderSupportReaction({ recipientScope: 'both', reactionType, sessionKey: sessionKey() });
      setReactionState(`done:${reactionType}`);
    } catch {
      setReactionState('error');
    }
  }

  return (
    <main id="top" className="founder-support-page">
      <section className="hero founder-support-hero section-grid" aria-labelledby="founder-support-title">
        <div className="hero__content">
          <p className="eyebrow">Human support system</p>
          <h1 id="founder-support-title">Help us remember why we started.</h1>
          <p className="hero__lede">A place for encouragement, honest connection and visible progress while Kevin and Micha rebuild from rock bottom in public.</p>
          <div className="hero__actions">
            <a className="button" href="#send-support">Send encouragement <ArrowRight aria-hidden="true" size={18} /></a>
            <a className="button button--ghost" href="#founder-progress">See the progress</a>
          </div>
        </div>
        <aside className="hero-card founder-support-hero__card">
          <MessageCircleHeart aria-hidden="true" />
          <blockquote>No one rebuilds alone.</blockquote>
          <p>Your message does not need to solve everything. Sometimes belief, recognition and one honest sentence are enough to help someone keep moving.</p>
        </aside>
      </section>

      <section className="section founder-reaction-section" aria-labelledby="reaction-title">
        <SectionHeading eyebrow={t('founder_support.reactions.eyebrow', 'A small signal')} title={t('founder_support.reactions.title', 'Send belief in one tap')} titleId="reaction-title">{t('founder_support.reactions.description', 'Anonymous reactions become a quiet signal that people are following, caring and rooting for this mission.')}</SectionHeading>
        <div className="founder-reaction-grid">
          {reactionOptions.map((option) => (
            <button type="button" key={option.value} className={reactionState === `done:${option.value}` ? 'founder-reaction founder-reaction--done' : 'founder-reaction'} onClick={() => void react(option.value)} disabled={reactionState === option.value}>
              <Heart aria-hidden="true" size={17} />{reactionState === `done:${option.value}` ? 'Received' : option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="founder-progress" aria-labelledby="wins-title">
        <SectionHeading eyebrow={t('founder_support.wins.eyebrow', 'Proof of movement')} title={t('founder_support.wins.title', 'Progress worth remembering')} titleId="wins-title">{t('founder_support.wins.description', 'The journey is not only measured in revenue. Courage, consistency, partnerships, shipped concepts and recovery all count.')}</SectionHeading>
        {loadState === 'loading' ? <div className="impact-state">Loading founder progress…</div> : null}
        {loadState === 'error' ? <div className="impact-state impact-state--error">Founder support data is temporarily unavailable.</div> : null}
        {loadState === 'ready' && !wins.length ? <div className="impact-state">The first public wins will appear here after they are published.</div> : null}
        <div className="founder-support-grid">{wins.map((win) => <WinCard key={win.id} win={win} profiles={profiles} />)}</div>
      </section>

      {reminders.length ? (
        <section className="section founder-reminder-section" aria-labelledby="reminders-title">
          <SectionHeading eyebrow={t('founder_support.reminders.eyebrow', 'Mission memory')} title={t('founder_support.reminders.title', 'What we refuse to forget')} titleId="reminders-title">{t('founder_support.reminders.description', 'Words and promises that reconnect hard days to the bigger reason behind this rebuild.')}</SectionHeading>
          <div className="founder-reminder-grid">{reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)}</div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="messages-title">
        <SectionHeading eyebrow={t('founder_support.messages.eyebrow', 'Community voice')} title={t('founder_support.messages.title', 'Messages that carry us forward')} titleId="messages-title">{t('founder_support.messages.description', 'Only moderated messages with explicit permission to publish appear here.')}</SectionHeading>
        {loadState === 'ready' && !messages.length ? <div className="impact-state">No public messages yet. You can be one of the first people to send encouragement below.</div> : null}
        <div className="founder-support-grid">{messages.map((message) => <MessageCard key={message.id} message={message} profiles={profiles} />)}</div>
      </section>

      <section className="section section-grid founder-support-form-section" id="send-support" aria-labelledby="support-form-title">
        <div>
          <p className="eyebrow">Write something real</p>
          <h2 id="support-form-title">Send support to {recipientLabel}</h2>
          <p>Your message enters a private moderation queue first. Nothing is published automatically.</p>
          <div className="founder-support-trust"><ShieldCheck aria-hidden="true" /><div><strong>Privacy before visibility</strong><span>Email addresses and private contact consent are never shown publicly.</span></div></div>
        </div>
        <form className="application-form founder-support-form" onSubmit={submitMessage}>
          <div className="form-grid">
            <label>Your name<input value={form.senderName} onChange={(event) => setForm({ ...form, senderName: event.target.value })} required /></label>
            <label>Email <span className="optional-label">Optional</span><input type="email" value={form.senderEmail} onChange={(event) => setForm({ ...form, senderEmail: event.target.value })} /></label>
          </div>
          <div className="form-grid">
            <label>Who is this for?<select value={form.recipientScope} onChange={(event) => setForm({ ...form, recipientScope: event.target.value as typeof form.recipientScope })}><option value="both">Kevin & Micha</option><option value="founder">One founder</option><option value="mission">The wider mission</option></select></label>
            {form.recipientScope === 'founder' ? <label>Founder<select value={form.founderProfileId} onChange={(event) => setForm({ ...form, founderProfileId: event.target.value })}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.display_name}</option>)}</select></label> : <label>Location <span className="optional-label">Optional</span><input value={form.senderLocation} onChange={(event) => setForm({ ...form, senderLocation: event.target.value })} /></label>}
          </div>
          <label>Message type<select value={form.messageType} onChange={(event) => setForm({ ...form, messageType: event.target.value })}>{messageTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>{t('founder_support.form.title', 'Title')} <span className="optional-label">{t('founder_support.form.optional', 'Optional')}</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('founder_support.form.title_placeholder', 'A few words that frame your message')} /></label>
          <label>{t('founder_support.form.message', 'Your message')}<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required placeholder={t('founder_support.form.message_placeholder', 'Share encouragement, belief, gratitude or a piece of your own story…')} /></label>
          <label><input type="checkbox" checked={form.isAnonymous} onChange={(event) => setForm({ ...form, isAnonymous: event.target.checked })} /> Publish anonymously if approved.</label>
          <label><input type="checkbox" checked={form.consentToPublish} onChange={(event) => setForm({ ...form, consentToPublish: event.target.checked })} /> I allow this message to be considered for public publication.</label>
          <label><input type="checkbox" checked={form.consentToContact} onChange={(event) => setForm({ ...form, consentToContact: event.target.checked })} /> You may contact me privately about this message.</label>
          <button className="button" type="submit" disabled={formState === 'submitting'}>{formState === 'submitting' ? 'Sending securely…' : 'Send encouragement'}</button>
          {formState === 'success' ? <div className="form-status"><strong>Message received.</strong><span>Thank you. It is now waiting for moderation.</span></div> : null}
          {formState === 'error' ? <div className="form-status impact-state--error"><strong>Could not submit.</strong><span>{formError}</span></div> : null}
        </form>
      </section>

      <section className="section founder-private-section" aria-labelledby="private-title">
        <SectionHeading eyebrow={t('founder_support.private.section.eyebrow', 'For the founders')} title={t('founder_support.private.section.title', 'A private place to check in honestly')} titleId="private-title">{t('founder_support.private.section.description', 'Public building should never mean every vulnerable thought becomes public. This protected space belongs to the founders.')}</SectionHeading>
        <FounderDashboard profiles={profiles} />
      </section>

      <section className="section founder-support-closing">
        <Users aria-hidden="true" />
        <div><p className="eyebrow">{t('founder_support.closing.eyebrow', 'The larger truth')}</p><h2>{t('founder_support.closing.title', 'People are part of the infrastructure.')}</h2><p>{t('founder_support.closing.description', 'Technology can organize the mission, but human belief is what keeps it alive when momentum disappears.')}</p></div>
      </section>
    </main>
  );
}

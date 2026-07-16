import { useEffect, useMemo, useState } from 'react';
import { Calendar, ExternalLink, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useWebsiteI18n } from '../lib/websiteI18n';
import {
  getOutreachPage,
  outreachStoragePublicUrl,
  recordOutreachEngagement,
  submitOutreachResponse,
  type OutreachPublicPage,
  type OutreachResponseType,
} from '../lib/outreachPublicApi';
import '../styles/outreachPrivate.css';

type LoadState = 'loading' | 'ready' | 'error' | 'responded';

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return <section className="outreach-private__section"><h2>{title}</h2><p>{body}</p></section>;
}

function mediaUrl(item: OutreachPublicPage['media'][number]) {
  return item.external_url || outreachStoragePublicUrl(item.storage_bucket, item.storage_path);
}

export function OutreachPrivatePage({ slug, token }: { slug: string; token: string }) {
  const { t, setLanguage } = useWebsiteI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorCode, setErrorCode] = useState('outreach.error.load_failed');
  const [page, setPage] = useState<OutreachPublicPage | null>(null);
  const [submitting, setSubmitting] = useState<OutreachResponseType | 'form' | null>(null);
  const [form, setForm] = useState({ visitor_name: '', visitor_email: '', visitor_phone: '', message: '' });

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getOutreachPage(slug, token)
      .then((payload) => {
        if (cancelled) return;
        setPage(payload);
        setLanguage(payload.language_code);
        setState('ready');
      })
      .catch((reason) => {
        if (cancelled) return;
        setPage(null);
        const code = reason instanceof Error ? reason.message : 'outreach_load_failed';
        const key = code.startsWith('outreach_') ? `outreach.error.${code.replace('outreach_', '')}` : 'outreach.error.load_failed';
        setErrorCode(key);
        setState('error');
      });
    return () => { cancelled = true; };
  }, [slug, token, setLanguage]);

  const founderVideoUrl = useMemo(() => {
    if (!page?.founder_video) return '';
    return page.founder_video.external_url || outreachStoragePublicUrl(page.founder_video.storage_bucket, page.founder_video.storage_path);
  }, [page]);

  async function respond(responseType: OutreachResponseType) {
    setSubmitting(responseType);
    try {
      await submitOutreachResponse(slug, token, responseType);
      await recordOutreachEngagement(slug, token, 'cta_clicked', { response_type: responseType });
      setState('responded');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : 'outreach_load_failed';
      const key = code.startsWith('outreach_') ? `outreach.error.${code.replace('outreach_', '')}` : 'outreach.error.load_failed';
      setErrorCode(key);
      setState('error');
    } finally {
      setSubmitting(null);
    }
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting('form');
    try {
      await submitOutreachResponse(slug, token, 'form_message', form);
      setState('responded');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : 'outreach_load_failed';
      const key = code.startsWith('outreach_') ? `outreach.error.${code.replace('outreach_', '')}` : 'outreach.error.load_failed';
      setErrorCode(key);
      setState('error');
    } finally {
      setSubmitting(null);
    }
  }

  if (state === 'loading') {
    return <main className="outreach-private"><div className="outreach-private__shell"><div className="outreach-private__status"><LoaderCircle className="spin" /> {t('outreach.loading', 'Loading your private page…')}</div></div></main>;
  }

  if (state === 'error' || !page) {
    return <main className="outreach-private"><div className="outreach-private__shell"><div className="outreach-private__status outreach-private__status--error">{t(errorCode, 'We could not load this private page.')}</div></div></main>;
  }

  if (state === 'responded') {
    return <main className="outreach-private"><div className="outreach-private__shell"><div className="outreach-private__status outreach-private__status--success">{t('outreach.form.success', 'Thank you. We received your response.')}</div></div></main>;
  }

  return <main className="outreach-private">
    <div className="outreach-private__shell">
      <div className="outreach-private__badge">{t('outreach.badge', 'Bankrupt to 1 Million · Private outreach')}</div>
      <header className="outreach-private__hero">
        <p>{t('outreach.private_notice', 'Hi {first_name}, this private page was created especially for you and the {company} team.', { first_name: page.contact.first_name, company: page.contact.company_name })}</p>
        <h1>{page.contact.company_name}</h1>
        {page.page.personal_intro ? <p>{page.page.personal_intro}</p> : null}
      </header>

      <Section title={t('outreach.section.why_them', 'Why we are reaching out to you')} body={page.page.why_them} />
      <Section title={t('outreach.section.what_we_offer', 'What we can offer')} body={page.page.what_we_offer} />
      <Section title={t('outreach.section.what_we_ask', 'What we are asking')} body={page.page.what_we_ask} />
      <Section title={t('outreach.section.win_win', 'A win-win collaboration')} body={page.page.win_win} />
      {page.page.personal_message ? <Section title={t('outreach.form.title', 'Send us a message')} body={page.page.personal_message} /> : null}

      {page.media.length ? <section className="outreach-private__section">
        <h2>{t('outreach.section.media', 'Media')}</h2>
        <div className="outreach-private__media-grid">
          {page.media.map((item, index) => {
            const url = mediaUrl(item);
            if (!url) return null;
            return <figure className="outreach-private__media-card" key={`${url}-${index}`}>
              {item.asset_type === 'video'
                ? <video controls src={url} onPlay={() => void recordOutreachEngagement(slug, token, 'video_played')} />
                : <img src={url} alt={item.caption || page.contact.company_name} />}
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>;
          })}
        </div>
      </section> : null}

      {founderVideoUrl ? <section className="outreach-private__section">
        <h2>{t('outreach.section.founder_video', 'Founder video')}</h2>
        <video className="outreach-private__media-card" controls poster={page.founder_video?.poster_url || undefined} src={founderVideoUrl} onPlay={() => void recordOutreachEngagement(slug, token, 'video_played', { source: 'founder_video' })} />
      </section> : null}

      <Section title={t('outreach.section.mission', 'The Bankrupt to 1 Million mission')} body={page.page.mission_blurb} />

      <section className="outreach-private__section">
        <div className="outreach-private__links">
          {page.contact.website ? <a href={page.contact.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {t('outreach.link.website', 'Website')}</a> : null}
          {page.contact.instagram ? <a href={page.contact.instagram} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {t('outreach.link.instagram', 'Instagram')}</a> : null}
          {page.contact.linkedin ? <a href={page.contact.linkedin} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {t('outreach.link.linkedin', 'LinkedIn')}</a> : null}
        </div>

        <div className="outreach-private__cta-grid">
          <button className="outreach-private__cta outreach-private__cta--primary" disabled={Boolean(submitting)} onClick={() => void respond('yes_meet')} type="button">{t('outreach.cta.yes_meet', "Yes, let's meet")}</button>
          <button className="outreach-private__cta" disabled={Boolean(submitting)} onClick={() => void respond('interested')} type="button">{t('outreach.cta.interested', 'I may be interested')}</button>
          <button className="outreach-private__cta" disabled={Boolean(submitting)} onClick={() => void respond('tell_more')} type="button">{t('outreach.cta.tell_more', 'Tell me more')}</button>
          <button className="outreach-private__cta" disabled={Boolean(submitting)} onClick={() => void respond('not_now')} type="button">{t('outreach.cta.not_now', 'Not right now')}</button>
        </div>

        <div className="outreach-private__cta-grid">
          {page.page.meeting_url ? <a className="outreach-private__cta outreach-private__cta--primary" href={page.page.meeting_url} onClick={() => void recordOutreachEngagement(slug, token, 'cta_clicked', { action: 'schedule_meeting' })} rel="noopener noreferrer" target="_blank"><Calendar size={16} /> {t('outreach.cta.schedule_meeting', 'Schedule a conversation')}</a> : null}
          {page.page.whatsapp_url ? <a className="outreach-private__cta" href={page.page.whatsapp_url} onClick={() => void recordOutreachEngagement(slug, token, 'cta_clicked', { action: 'whatsapp' })} rel="noopener noreferrer" target="_blank"><MessageCircle size={16} /> {t('outreach.cta.whatsapp', 'Chat on WhatsApp')}</a> : null}
        </div>

        <form className="outreach-private__form" onSubmit={submitForm}>
          <h2>{t('outreach.form.title', 'Send us a message')}</h2>
          <label>{t('outreach.form.name', 'Your name')}<input value={form.visitor_name} onChange={(event) => setForm({ ...form, visitor_name: event.target.value })} /></label>
          <label>{t('outreach.form.email', 'Email')}<input type="email" value={form.visitor_email} onChange={(event) => setForm({ ...form, visitor_email: event.target.value })} /></label>
          <label>{t('outreach.form.phone', 'Phone')}<input value={form.visitor_phone} onChange={(event) => setForm({ ...form, visitor_phone: event.target.value })} /></label>
          <label>{t('outreach.form.message', 'Your message')}<textarea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
          <button className="outreach-private__submit" disabled={submitting === 'form'} type="submit"><Send size={16} /> {submitting === 'form' ? t('outreach.form.sending', 'Sending your response…') : t('outreach.form.submit', 'Send response')}</button>
        </form>
      </section>

      <footer className="outreach-private__footer">{t('outreach.footer', 'Bankrupt to 1 Million · Private outreach page')}</footer>
    </div>
  </main>;
}

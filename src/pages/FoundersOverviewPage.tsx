import { Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { FounderOverviewCard, FounderVideoCard } from '../components/founders/FounderOverviewCards';
import type { FounderOverview } from '../components/founders/founderOverviewTypes';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/foundersOverview.css';

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

export function FoundersOverviewPage() {
  const { t } = useWebsiteI18n();
  const [founders, setFounders] = useState<FounderOverview[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    document.title = t('founders.seo.title', 'Founders | Bankrupt to 1 Million');
    setStatus('loading');

    readJson<FounderOverview[]>(supabase.from('founder_profiles_public').request({
      query: 'select=id,slug,full_name,display_name,headline,role_title,short_bio,personal_mission,core_strengths,expertise,location,avatar_url,cover_image_url,intro_video_url,published_post_count,founder_post_count,concept_count,founder_message_count&order=display_order.asc,full_name.asc',
    }))
      .then((rows) => {
        if (cancelled) return;
        setFounders(rows);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const foundersWithVideo = founders.filter((founder) => Boolean(founder.intro_video_url));

  return (
    <>
      <Header />
      <div className="page-shell">
        <main className="founders-overview-page">
          <section className="founders-overview-hero section">
            <div>
              <p className="eyebrow">{t('founders.hero.eyebrow', 'The people behind the mission')}</p>
              <h1>{t('founders.hero.title', 'Two founders. One honest rebuild.')}</h1>
              <p className="founders-overview-hero__lede">{t('founders.hero.description', 'Kevin and Micha bring different strengths, lived experience and perspectives into one public mission: rebuild from rock bottom, create meaningful ventures and prove that momentum can start again.')}</p>
            </div>
            <aside className="founders-overview-hero__note">
              <Users aria-hidden="true" size={28} />
              <blockquote>{t('founders.hero.quote', 'The mission is shared. The journeys remain personal.')}</blockquote>
              <p>{t('founders.hero.note', 'Explore each founder through a dedicated profile with their story, strengths, struggles, work, timeline and mission.')}</p>
            </aside>
          </section>

          <section className="section founders-overview-directory" aria-labelledby="founders-directory-title">
            <div className="founders-overview-directory__intro">
              <p className="eyebrow">{t('founders.directory.eyebrow', 'Founder directory')}</p>
              <h2 id="founders-directory-title">{t('founders.directory.title', 'Meet Kevin and Micha')}</h2>
              <p>{t('founders.directory.description', 'Choose a founder to open the full profile. The overview stays concise; the deeper story only appears after you select a card.')}</p>
            </div>

            {status === 'loading' ? <div className="impact-state" role="status" aria-live="polite">{t('founders.states.loading', 'Loading founder profiles…')}</div> : null}
            {status === 'error' ? <div className="impact-state impact-state--error" role="alert">{t('founders.states.error', 'Founder profiles could not be loaded.')}</div> : null}
            {status === 'ready' && !founders.length ? <div className="impact-state">{t('founders.states.empty', 'No public founder profiles are available yet.')}</div> : null}

            <div className="founders-overview-grid">
              {founders.map((founder, index) => <FounderOverviewCard founder={founder} index={index} key={founder.id} />)}
            </div>
          </section>

          {foundersWithVideo.length ? (
            <section className="section founders-video-section" aria-labelledby="founder-video-title">
              <div className="founders-overview-directory__intro">
                <p className="eyebrow">{t('founders.video_section.eyebrow', 'In their own words')}</p>
                <h2 id="founder-video-title">{t('founders.video_section.title', 'Founder video messages')}</h2>
                <p>{t('founders.video_section.description', 'Short personal messages from Kevin and Micha can be played directly here before opening their full founder profiles.')}</p>
              </div>
              <div className="founders-video-grid">
                {foundersWithVideo.map((founder) => <FounderVideoCard founder={founder} key={founder.id} />)}
              </div>
            </section>
          ) : null}

          <section className="section founders-overview-closing">
            <Sparkles aria-hidden="true" size={26} />
            <div>
              <p className="eyebrow">{t('founders.closing.eyebrow', 'Shared direction')}</p>
              <h2>{t('founders.closing.title', 'Different minds. One mission.')}</h2>
              <p>{t('founders.closing.description', 'The founder pages document the people behind the work, not just the output they create.')}</p>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}

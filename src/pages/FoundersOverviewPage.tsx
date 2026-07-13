import { ArrowRight, MapPin, Sparkles, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import '../styles/foundersOverview.css';

type FounderOverview = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string;
  headline: string | null;
  role_title: string;
  short_bio: string | null;
  personal_mission: string | null;
  core_strengths: string[];
  expertise: string[];
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  published_post_count: number;
  founder_post_count: number;
  concept_count: number;
  founder_message_count: number;
};

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

function FounderCard({ founder, index }: { founder: FounderOverview; index: number }) {
  const profileHref = `/founders/${encodeURIComponent(founder.slug)}`;
  const highlights = founder.expertise?.slice(0, 3) || [];

  return (
    <a className="founder-overview-card" href={profileHref} aria-label={`View the detailed profile of ${founder.full_name}`}>
      <div className="founder-overview-card__visual">
        {founder.cover_image_url ? <img className="founder-overview-card__cover" src={founder.cover_image_url} alt="" /> : null}
        <div className="founder-overview-card__shade" />
        <span className="founder-overview-card__number">0{index + 1}</span>
        <div className="founder-overview-card__portrait">
          {founder.avatar_url ? <img src={founder.avatar_url} alt={`${founder.full_name} portrait`} /> : <UserRound size={54} aria-hidden="true" />}
        </div>
        <div className="founder-overview-card__badges">
          <span>Co-founder</span>
          <span>Building in public</span>
        </div>
      </div>

      <div className="founder-overview-card__content">
        <div className="founder-overview-card__topline">
          <p className="eyebrow">Founder profile</p>
          {founder.location ? <span><MapPin size={15} aria-hidden="true" />{founder.location}</span> : null}
        </div>

        <h2>{founder.full_name}</h2>
        <p className="founder-overview-card__role">{founder.role_title}</p>
        {founder.headline ? <p className="founder-overview-card__headline">{founder.headline}</p> : null}
        {founder.short_bio ? <p className="founder-overview-card__bio">{founder.short_bio}</p> : null}

        {highlights.length ? (
          <div className="founder-overview-card__tags">
            {highlights.map((item) => <span key={item}>{item}</span>)}
          </div>
        ) : null}

        <div className="founder-overview-card__metrics">
          <div><strong>{founder.concept_count || 0}</strong><span>Concepts</span></div>
          <div><strong>{founder.published_post_count || 0}</strong><span>Posts</span></div>
          <div><strong>{founder.founder_post_count || 0}</strong><span>Founder posts</span></div>
        </div>

        <div className="founder-overview-card__cta">
          <span>Open detailed profile</span>
          <ArrowRight size={19} aria-hidden="true" />
        </div>
      </div>
    </a>
  );
}

export function FoundersOverviewPage() {
  const [founders, setFounders] = useState<FounderOverview[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    document.title = 'Founders | Bankrupt to 1 Million';
    readJson<FounderOverview[]>(supabase.from('founder_profiles_public').request({
      query: 'select=id,slug,full_name,display_name,headline,role_title,short_bio,personal_mission,core_strengths,expertise,location,avatar_url,cover_image_url,published_post_count,founder_post_count,concept_count,founder_message_count&order=display_order.asc,full_name.asc',
    }))
      .then((rows) => {
        setFounders(rows);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <>
      <Header />
      <div className="page-shell">
        <main className="founders-overview-page">
          <section className="founders-overview-hero section">
            <div>
              <p className="eyebrow">The people behind the mission</p>
              <h1>Two founders. One honest rebuild.</h1>
              <p className="founders-overview-hero__lede">Kevin and Micha bring different strengths, lived experience and perspectives into one public mission: rebuild from rock bottom, create meaningful ventures and prove that momentum can start again.</p>
            </div>
            <aside className="founders-overview-hero__note">
              <Users aria-hidden="true" size={28} />
              <blockquote>The mission is shared. The journeys remain personal.</blockquote>
              <p>Explore each founder through a dedicated profile with their story, strengths, struggles, work, timeline and mission.</p>
            </aside>
          </section>

          <section className="section founders-overview-directory" aria-labelledby="founders-directory-title">
            <div className="founders-overview-directory__intro">
              <p className="eyebrow">Founder directory</p>
              <h2 id="founders-directory-title">Meet Kevin and Micha</h2>
              <p>Choose a founder to open the full profile. The overview stays concise; the deeper story only appears after you select a card.</p>
            </div>

            {status === 'loading' ? <div className="impact-state">Loading founder profiles…</div> : null}
            {status === 'error' ? <div className="impact-state impact-state--error">Founder profiles could not be loaded.</div> : null}
            {status === 'ready' && !founders.length ? <div className="impact-state">No public founder profiles are available yet.</div> : null}

            <div className="founders-overview-grid">
              {founders.map((founder, index) => <FounderCard founder={founder} index={index} key={founder.id} />)}
            </div>
          </section>

          <section className="section founders-overview-closing">
            <Sparkles aria-hidden="true" size={26} />
            <div>
              <p className="eyebrow">Shared direction</p>
              <h2>Different minds. One mission.</h2>
              <p>The founder pages document the people behind the work, not just the output they create.</p>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}

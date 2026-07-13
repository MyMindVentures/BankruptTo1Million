import { ArrowLeft, ArrowRight, MapPin, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import '../styles/founderProfiles.css';

type Founder = {
  id: string;
  slug: string;
  display_name: string;
  full_name: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  website_url: string | null;
  github_url: string | null;
  is_founder: boolean;
  is_public: boolean;
};

type FounderPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  reading_time_minutes: number | null;
};

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

function formatTimestamp(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const zone = get('timeZoneName').replace('GMT+2', 'CEST').replace('GMT+1', 'CET');
  return `${get('day')}/${get('month')}/${get('year')} · ${get('hour')}:${get('minute')} ${zone}`;
}

export function FounderProfilePage({ slug }: { slug: string }) {
  const [founder, setFounder] = useState<Founder | null>(null);
  const [posts, setPosts] = useState<FounderPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    Promise.all([
      readJson<Founder[]>(supabase.from('journal_authors').request({ query: `select=id,slug,display_name,full_name,role,bio,location,avatar_url,website_url,github_url,is_founder,is_public&slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&limit=1` })),
      readJson<Array<{ journal_posts: FounderPost | null }>>(supabase.from('journal_post_author_links').request({ query: `select=journal_posts!inner(id,slug,title,excerpt,published_at,reading_time_minutes,status)&journal_authors!inner(slug)&journal_authors.slug=eq.${encodeURIComponent(slug)}&journal_posts.status=eq.published&journal_posts.published_at=not.is.null&order=journal_posts(published_at).desc` })),
    ]).then(([founders, links]) => {
      const row = founders[0] || null;
      setFounder(row);
      setPosts(links.map((link) => link.journal_posts).filter((post): post is FounderPost => Boolean(post)));
      setStatus('ready');
      if (row) document.title = `${row.full_name || row.display_name} | Founder Profile`;
    }).catch(() => setStatus('error'));
  }, [slug]);

  return <><Header /><div className="page-shell"><main className="founder-profile-page">
    {status === 'loading' ? <section className="section"><div className="impact-state">Loading founder profile…</div></section> : null}
    {status === 'error' || (status === 'ready' && !founder) ? <section className="section"><div className="impact-state impact-state--error">Founder profile not found or not public.</div><a className="button" href="/journal"><ArrowLeft size={17}/> Back to The Journal</a></section> : null}
    {founder ? <>
      <section className="hero founder-profile-hero section-grid">
        <div className="hero__content">
          <p className="eyebrow">Bankrupt to 1 Million Founder</p>
          <h1>{founder.full_name || founder.display_name}</h1>
          {founder.role ? <p className="hero__lede">{founder.role}</p> : null}
          {founder.bio ? <p>{founder.bio}</p> : null}
          {founder.location ? <p className="founder-profile-location"><MapPin size={17}/>{founder.location}</p> : null}
          <div className="hero__actions"><a className="button" href="#founder-posts">Read founder posts <ArrowRight size={17}/></a><a className="button button--ghost" href="/journal">Open The Journal</a></div>
        </div>
        <aside className="founder-profile-card">
          {founder.avatar_url ? <img src={founder.avatar_url} alt={`${founder.full_name || founder.display_name} founder portrait`} /> : <div className="founder-profile-avatar"><UserRound size={54}/></div>}
          <strong>{founder.full_name || founder.display_name}</strong>
          <span>{founder.role || 'Founder'}</span>
          <small>Public founder profile</small>
        </aside>
      </section>
      <section className="section" id="founder-posts">
        <p className="eyebrow">Created by {founder.display_name}</p>
        <h2>Founder publications</h2>
        {!posts.length ? <div className="impact-state">No public posts are linked to this founder yet.</div> : <div className="founder-post-grid">{posts.map((post) => <article key={post.id}>
          <time dateTime={post.published_at}>{formatTimestamp(post.published_at)}</time>
          <h3>{post.title}</h3>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
          <div><span>{post.reading_time_minutes || 4} min read</span><a href={`/journal/${post.slug}`}>Read post <ArrowRight size={15}/></a></div>
        </article>)}</div>}
      </section>
    </> : null}
  </main></div><Footer /></>;
}

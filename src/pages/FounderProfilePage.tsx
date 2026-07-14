import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import {
  FounderCapabilitiesSection,
  FounderFinalCta,
  FounderLocalNav,
  FounderMissionSection,
  FounderProfileHero,
  FounderSnapshot,
  FounderStorySection,
  FounderSwatSection,
  FounderSwitch,
  FounderTimelineSection,
  FounderWorkSection,
} from '../components/founders/FounderProfileSections';
import type {
  ConceptLink,
  FounderPost,
  FounderProfile,
  Publication,
  SwatPoint,
  TimelineEvent,
} from '../components/founders/founderProfileTypes';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/founderProfiles.css';

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

export function FounderProfilePage({ slug }: { slug: string }) {
  const { t } = useWebsiteI18n();
  const [founder, setFounder] = useState<FounderProfile | null>(null);
  const [swat, setSwat] = useState<SwatPoint[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [founderPosts, setFounderPosts] = useState<FounderPost[]>([]);
  const [posts, setPosts] = useState<Publication[]>([]);
  const [concepts, setConcepts] = useState<ConceptLink[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setFounder(null);
    setSwat([]);
    setTimeline([]);
    setFounderPosts([]);
    setPosts([]);
    setConcepts([]);

    readJson<FounderProfile[]>(supabase.from('founder_profiles_public').request({
      query: `select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    }))
      .then(async (profiles) => {
        const profile = profiles[0] || null;
        if (!profile) {
          if (!cancelled) setStatus('ready');
          return;
        }

        const requests: Promise<unknown>[] = [
          readJson<SwatPoint[]>(supabase.from('founder_swat_public').request({
            query: `select=*&founder_slug=eq.${encodeURIComponent(slug)}&order=point_type.asc,display_order.asc`,
          })),
          readJson<TimelineEvent[]>(supabase.from('founder_timeline_public').request({
            query: `select=*&founder_slug=eq.${encodeURIComponent(slug)}&order=occurred_at.desc`,
          })),
          readJson<FounderPost[]>(supabase.from('founder_posts_public').request({
            query: `select=founder_post_id,post_slug,post_title,excerpt,published_at,concept_slug,concept_title&founder_slug=eq.${encodeURIComponent(slug)}&order=published_at.desc&limit=3`,
          })),
          readJson<Array<{ journal_posts: Publication | null }>>(supabase.from('journal_post_author_links').request({
            query: `select=journal_posts!inner(id,slug,title,excerpt,published_at,reading_time_minutes,status)&journal_author_id=eq.${profile.journal_author_id}&journal_posts.status=eq.published&journal_posts.published_at=not.is.null&order=journal_posts(published_at).desc&limit=6`,
          })),
        ];

        if (profile.concept_founder_id) {
          requests.push(readJson<ConceptLink[]>(supabase.from('proof_of_mind_concept_founders').request({
            query: `select=founder_role,is_original_creator,proof_of_mind_concepts(id,slug,title,tagline,short_description,category,concept_status,cover_image_url,updated_at)&founder_id=eq.${profile.concept_founder_id}&order=updated_at.desc&limit=6`,
          })));
        } else {
          requests.push(Promise.resolve([] as ConceptLink[]));
        }

        const [swatRows, timelineRows, founderPostRows, postLinks, conceptRows] = await Promise.all(requests) as [
          SwatPoint[],
          TimelineEvent[],
          FounderPost[],
          Array<{ journal_posts: Publication | null }>,
          ConceptLink[],
        ];

        if (cancelled) return;
        setFounder(profile);
        setSwat(swatRows);
        setTimeline(timelineRows);
        setFounderPosts(founderPostRows);
        setPosts(postLinks.map((link) => link.journal_posts).filter((post): post is Publication => Boolean(post)));
        setConcepts(conceptRows.filter((row) => Boolean(row.proof_of_mind_concepts)));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (founder) {
      document.title = t('founder_profile.seo.title', '{name} | Founder Profile', { name: founder.full_name });
    }
  }, [founder, t]);

  const strengths = swat.filter((point) => point.point_type === 'strength');
  const struggles = swat.filter((point) => point.point_type === 'struggle');

  return <>
    <Header />
    <div className="page-shell">
      <main className="founder-profile-page">
        {status === 'loading' ? (
          <section className="section">
            <div className="impact-state" role="status" aria-live="polite">
              {t('founder_profile.states.loading', 'Loading founder profile…')}
            </div>
          </section>
        ) : null}

        {status === 'error' || (status === 'ready' && !founder) ? (
          <section className="section">
            <div className="impact-state impact-state--error" role="alert">
              {t('founder_profile.states.not_found', 'Founder profile not found or not public.')}
            </div>
            <a className="button" href="/journal">
              <ArrowLeft size={17} aria-hidden="true" />
              {t('founder_profile.actions.back_journal', 'Back to The Journal')}
            </a>
          </section>
        ) : null}

        {founder ? <>
          <FounderProfileHero founder={founder} milestoneCount={timeline.length} />
          <FounderLocalNav />
          <FounderSnapshot founder={founder} />
          <FounderStorySection founder={founder} />
          <FounderSwatSection strengths={strengths} struggles={struggles} />
          <FounderCapabilitiesSection founder={founder} />
          <FounderTimelineSection timeline={timeline} />
          <FounderWorkSection founder={founder} founderPosts={founderPosts} concepts={concepts} posts={posts} />
          <FounderMissionSection founder={founder} />
          <FounderFinalCta founder={founder} />
          <FounderSwitch currentSlug={founder.slug} />
        </> : null}
      </main>
    </div>
    <Footer />
  </>;
}

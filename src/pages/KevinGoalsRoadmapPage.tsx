import { ArrowDown, Bot, Brain, BriefcaseBusiness, Compass, HeartHandshake, Laptop, Network, Rocket, Sparkles, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { I18nManifest } from '../lib/i18nManifest';
import { getKevinGoalsRoadmap } from '../lib/kevinGoalsRoadmap';
import type { KevinGoalsRoadmapBlock, KevinGoalsRoadmapData } from '../lib/kevinGoalsRoadmap';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const KEVIN_GOALS_ROADMAP_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.kevin_goals_roadmap',
  namespace: 'kevin_goals_roadmap',
  translationKeys: [
    'kevin_goals_roadmap.states.loading',
    'kevin_goals_roadmap.states.error',
    'kevin_goals_roadmap.states.empty',
  ] as const,
  entityContent: {
    rpc: 'get_localized_website_page',
    tables: ['website_pages', 'website_page_blocks', 'website_page_block_translations'],
  },
} as const satisfies I18nManifest;

const goalIcons: LucideIcon[] = [Rocket, Laptop, Brain, Network, Compass, BriefcaseBusiness, Bot, Sprout, HeartHandshake];

function lines(value?: string | null) {
  return (value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function ensureMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function GoalCard({ block, index }: { block: KevinGoalsRoadmapBlock; index: number }) {
  const Icon = goalIcons[index % goalIcons.length];
  return (
    <article className={`kevin-roadmap-card kevin-roadmap-card--${(index % 3) + 1}`}>
      <div className="kevin-roadmap-card__top">
        <span className="kevin-roadmap-card__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="kevin-roadmap-card__icon" aria-hidden="true"><Icon size={23} /></span>
      </div>
      <div className="kevin-roadmap-card__body">
        {block.eyebrow ? <p className="kevin-roadmap-card__label">{block.eyebrow}</p> : null}
        {block.title ? <h3>{block.title}</h3> : null}
        {block.body ? <p>{block.body}</p> : null}
      </div>
    </article>
  );
}

export function KevinGoalsRoadmapPage() {
  const { language, t } = useWebsiteI18n();
  const [page, setPage] = useState<KevinGoalsRoadmapData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getKevinGoalsRoadmap(language).then((payload) => {
      if (cancelled) return;
      setPage(payload);
      setState(payload?.blocks.length ? 'ready' : 'empty');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [language]);

  const hero = page?.blocks.find((block) => block.block_key === 'hero');
  const mission = page?.blocks.find((block) => block.block_key === 'mission');
  const roadmap = page?.blocks.find((block) => block.block_key === 'roadmap');
  const principle = page?.blocks.find((block) => block.block_key === 'principle');
  const goals = page?.blocks.filter((block) => block.block_key.startsWith('goal-')) || [];
  const canonicalUrl = useMemo(() => `https://www.bankruptto1million.com/kevin-goals-roadmap?lang=${language}`, [language]);

  useEffect(() => {
    if (!hero) return;
    const title = hero.seo_title || hero.title || page?.page_name || '';
    const description = hero.seo_description || hero.subtitle || '';
    document.title = title;
    ensureMeta('meta[name="description"]', 'name', 'description', description);
    ensureMeta('meta[property="og:title"]', 'property', 'og:title', title);
    ensureMeta('meta[property="og:description"]', 'property', 'og:description', description);
    ensureMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  }, [canonicalUrl, hero, page?.page_name]);

  if (state === 'loading') return <main className="section kevin-roadmap-page" id="top"><p>{t('kevin_goals_roadmap.states.loading', 'Loading goals and roadmap…')}</p></main>;
  if (state === 'error') return <main className="section kevin-roadmap-page" id="top"><p role="alert">{t('kevin_goals_roadmap.states.error', 'The goals and roadmap are temporarily unavailable.')}</p></main>;
  if (state === 'empty' || !page || !hero) return <main className="section kevin-roadmap-page" id="top"><p>{t('kevin_goals_roadmap.states.empty', 'No published goals and roadmap are available.')}</p></main>;

  return (
    <main className="kevin-roadmap-page" id="top">
      <section className="kevin-roadmap-hero">
        <div className="kevin-roadmap-hero__glow kevin-roadmap-hero__glow--one" aria-hidden="true" />
        <div className="kevin-roadmap-hero__glow kevin-roadmap-hero__glow--two" aria-hidden="true" />
        <div className="kevin-roadmap-hero__grid" aria-hidden="true" />
        <div className="kevin-roadmap-hero__inner">
          <div className="kevin-roadmap-hero__copy">
            {hero.eyebrow ? <div className="kevin-roadmap-kicker"><Sparkles size={16} aria-hidden="true" /><span>{hero.eyebrow}</span></div> : null}
            <h1>{hero.title}</h1>
            {hero.subtitle ? <p className="kevin-roadmap-hero__lede">{hero.subtitle}</p> : null}
            <div className="kevin-roadmap-hero__actions">
              {hero.body ? <a className="button" href="#roadmap">{hero.body}</a> : null}
              {hero.seo_description ? <a className="kevin-roadmap-scroll-link" href="#mission"><ArrowDown size={18} aria-hidden="true" />{hero.seo_description}</a> : null}
            </div>
          </div>
          {roadmap ? <aside className="kevin-roadmap-hero__panel" aria-label={roadmap.eyebrow || undefined}><span className="kevin-roadmap-hero__panel-label">{roadmap.eyebrow}</span><p>{roadmap.body}</p><div className="kevin-roadmap-hero__panel-meta">{lines(roadmap.subtitle).map((item) => <span key={item}>{item}</span>)}</div></aside> : null}
        </div>
      </section>

      {mission ? <section className="kevin-roadmap-intro section" id="mission" aria-labelledby="kevin-roadmap-mission-title"><div className="kevin-roadmap-intro__heading"><p className="eyebrow">{mission.eyebrow}</p><h2 id="kevin-roadmap-mission-title">{mission.title}</h2></div><div className="kevin-roadmap-intro__copy"><p>{mission.subtitle}</p><div className="kevin-roadmap-pill-list" aria-label={mission.title || undefined}>{lines(mission.body).map((item) => <span key={item}>{item}</span>)}</div></div></section> : null}

      <section className="kevin-roadmap-section section" id="roadmap" aria-labelledby="kevin-roadmap-title">
        {roadmap ? <div className="kevin-roadmap-section__heading"><div><p className="eyebrow">{roadmap.eyebrow}</p><h2 id="kevin-roadmap-title">{roadmap.title}</h2></div><p>{roadmap.seo_description}</p></div> : null}
        <div className="kevin-roadmap-grid">{goals.map((goal, index) => <GoalCard block={goal} index={index} key={goal.id} />)}</div>
      </section>

      {principle ? <section className="kevin-roadmap-principle section" aria-labelledby="kevin-roadmap-principle-title"><div className="kevin-roadmap-principle__orb" aria-hidden="true" /><div className="kevin-roadmap-principle__inner"><p className="eyebrow">{principle.eyebrow}</p><h2 id="kevin-roadmap-principle-title">{principle.title}</h2><div className="kevin-roadmap-principle__lines">{lines(principle.body).map((item, index) => <p key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</p>)}</div></div></section> : null}
    </main>
  );
}

import { Download, Printer, Quote } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ShareActions } from '../components/ShareActions';
import type { I18nManifest } from '../lib/i18nManifest';
import { getMissionStatement } from '../lib/missionStatement';
import type { MissionStatementPageData } from '../lib/missionStatement';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const MISSION_STATEMENT_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.mission_statement',
  namespace: 'mission_statement',
  translationKeys: [
    'mission_statement.actions.download',
    'mission_statement.actions.print',
    'mission_statement.states.loading',
    'mission_statement.states.error',
    'mission_statement.states.empty',
    'mission_statement.accessibility.actions',
  ] as const,
  entityContent: {
    rpc: 'get_localized_website_page',
    tables: ['website_pages', 'website_page_blocks', 'website_page_block_translations'],
  },
} as const satisfies I18nManifest;

function normalizeRichText(value?: string | null) {
  return (value || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

function renderBlockBody(blockKey: string, value?: string | null) {
  const normalized = normalizeRichText(value);
  if (!normalized) return null;

  if (blockKey === 'strategic-priorities') {
    const items = normalized
      .split(/\n+/)
      .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter(Boolean);

    return (
      <ol className="mission-priorities">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    );
  }

  return normalized
    .split(/\n\n+/)
    .map((paragraph) => <p key={paragraph}>{paragraph}</p>);
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

function ensureCanonical(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function downloadText(page: MissionStatementPageData, language: string) {
  const text = page.blocks
    .map((block) => [block.eyebrow, block.title, block.subtitle, normalizeRichText(block.body)].filter(Boolean).join('\n\n'))
    .filter(Boolean)
    .join('\n\n---\n\n');
  const blob = new Blob([`${page.page_name}\nBankrupt to 1 Million\nhttps://www.bankruptto1million.com/mission-statement?lang=${language}\n\n${text}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mission-statement-${language}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MissionStatementPage() {
  const { language, t } = useWebsiteI18n();
  const [page, setPage] = useState<MissionStatementPageData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getMissionStatement(language)
      .then((payload) => {
        if (cancelled) return;
        setPage(payload);
        setState(payload?.blocks.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [language]);

  const hero = page?.blocks.find((block) => block.block_key === 'hero');
  const core = page?.blocks.find((block) => block.block_key === 'core-message');
  const contentBlocks = page?.blocks.filter((block) => !['hero', 'core-message'].includes(block.block_key)) ?? [];
  const canonicalUrl = useMemo(() => `https://www.bankruptto1million.com/mission-statement?lang=${language}`, [language]);

  useEffect(() => {
    if (!hero) return;
    const title = hero.seo_title || hero.title || page?.page_name || 'Mission Statement';
    const description = hero.seo_description || hero.subtitle || '';
    document.title = title;
    ensureMeta('meta[name="description"]', 'name', 'description', description);
    ensureMeta('meta[property="og:title"]', 'property', 'og:title', title);
    ensureMeta('meta[property="og:description"]', 'property', 'og:description', description);
    ensureMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    ensureMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    ensureMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary');
    ensureMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    ensureMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    ensureCanonical(canonicalUrl);
  }, [canonicalUrl, hero, page?.page_name]);

  if (state === 'loading') return <main className="section mission-statement-page" id="top"><p>{t('mission_statement.states.loading', 'Loading mission statement…')}</p></main>;
  if (state === 'error') return <main className="section mission-statement-page" id="top"><p role="alert">{t('mission_statement.states.error', 'The mission statement is temporarily unavailable.')}</p></main>;
  if (state === 'empty' || !page || !hero) return <main className="section mission-statement-page" id="top"><p>{t('mission_statement.states.empty', 'No published mission statement is available.')}</p></main>;

  return (
    <main className="mission-statement-page" id="top">
      <section className="mission-statement-hero">
        <div className="mission-statement-hero__glow" aria-hidden="true" />
        <div className="mission-statement-hero__inner">
          <div className="mission-statement-hero__copy">
            {hero.eyebrow ? <p className="eyebrow">{hero.eyebrow}</p> : null}
            <h1>{hero.title}</h1>
            {hero.subtitle ? <p className="mission-statement-hero__lede">{hero.subtitle}</p> : null}
            <div className="mission-statement-actions" role="group" aria-label={t('mission_statement.accessibility.actions', 'Mission statement actions')}>
              <button className="button" type="button" onClick={() => downloadText(page, language)}>
                <Download aria-hidden="true" size={18} />
                {t('mission_statement.actions.download', 'Download Mission Statement')}
              </button>
              <button className="button button--ghost" type="button" onClick={() => window.print()}>
                <Printer aria-hidden="true" size={18} />
                {t('mission_statement.actions.print', 'Print or save as PDF')}
              </button>
            </div>
          </div>

          {core ? (
            <aside className="mission-statement-hero__manifesto" aria-label={core.title || undefined}>
              <Quote aria-hidden="true" size={34} />
              <p className="mission-statement-hero__manifesto-index">01</p>
              {core.eyebrow ? <p className="eyebrow">{core.eyebrow}</p> : null}
              {core.title ? <h2>{core.title}</h2> : null}
              {core.body ? <p>{normalizeRichText(core.body)}</p> : null}
            </aside>
          ) : null}
        </div>
      </section>

      <section className="mission-statement-share section" aria-label={t('mission_statement.accessibility.actions', 'Mission statement actions')}>
        <ShareActions title={hero.title || page.page_name} url={canonicalUrl} entityType="website_page" entityId={page.id} />
      </section>

      <section className="mission-statement-content section" aria-label={hero.title || page.page_name}>
        <div className="mission-statement-content__rail" aria-hidden="true" />
        <div className="mission-statement-content__list">
          {contentBlocks.map((block, index) => (
            <article className={`mission-statement-block mission-statement-block--${block.block_key}`} key={block.id}>
              <div className="mission-statement-block__number" aria-hidden="true">{String(index + 2).padStart(2, '0')}</div>
              <div className="mission-statement-block__content">
                {block.eyebrow ? <p className="eyebrow">{block.eyebrow}</p> : null}
                {block.title ? <h2>{block.title}</h2> : null}
                {block.subtitle ? <p className="mission-statement-block__subtitle">{block.subtitle}</p> : null}
                {renderBlockBody(block.block_key, block.body)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

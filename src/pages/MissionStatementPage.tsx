import { Download, Printer } from 'lucide-react';
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

function downloadText(page: MissionStatementPageData, language: string) {
  const text = page.blocks
    .map((block) => [block.eyebrow, block.title, block.subtitle, block.body].filter(Boolean).join('\n\n'))
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
  const contentBlocks = page?.blocks.filter((block) => block.block_key !== 'hero') ?? [];
  const canonicalUrl = useMemo(() => `https://www.bankruptto1million.com/mission-statement?lang=${language}`, [language]);

  useEffect(() => {
    if (!hero) return;
    document.title = hero.seo_title || hero.title || page?.page_name || 'Mission Statement';
    const description = hero.seo_description || hero.subtitle || '';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [hero, page?.page_name]);

  if (state === 'loading') return <main className="section mission-statement-page" id="top"><p>{t('mission_statement.states.loading', 'Loading mission statement…')}</p></main>;
  if (state === 'error') return <main className="section mission-statement-page" id="top"><p role="alert">{t('mission_statement.states.error', 'The mission statement is temporarily unavailable.')}</p></main>;
  if (state === 'empty' || !page || !hero) return <main className="section mission-statement-page" id="top"><p>{t('mission_statement.states.empty', 'No published mission statement is available.')}</p></main>;

  return (
    <main className="mission-statement-page" id="top">
      <section className="section mission-statement-hero">
        <div className="section-heading">
          {hero.eyebrow ? <p className="eyebrow">{hero.eyebrow}</p> : null}
          <h1>{hero.title}</h1>
          {hero.subtitle ? <p>{hero.subtitle}</p> : null}
        </div>
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
        <ShareActions title={hero.title || page.page_name} url={canonicalUrl} entityType="website_page" entityId={page.id} />
      </section>

      <section className="section mission-statement-content" aria-label={hero.title || page.page_name}>
        {contentBlocks.map((block) => (
          <article className={`mission-statement-block mission-statement-block--${block.block_type}`} key={block.id}>
            {block.eyebrow ? <p className="eyebrow">{block.eyebrow}</p> : null}
            {block.title ? <h2>{block.title}</h2> : null}
            {block.subtitle ? <p className="mission-statement-block__subtitle">{block.subtitle}</p> : null}
            {block.body ? block.body.split(/\n\n+/).map((paragraph) => <p key={paragraph}>{paragraph}</p>) : null}
          </article>
        ))}
      </section>
    </main>
  );
}

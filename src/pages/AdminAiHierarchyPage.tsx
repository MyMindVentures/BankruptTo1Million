import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, LoaderCircle, Network, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { getAdminAiHierarchy, type AdminAiHierarchyRow } from '../lib/adminHierarchyApi';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const ADMIN_AI_HIERARCHY_PAGE_I18N_MANIFEST = {
  componentKey: 'admin.ai_hierarchy.page',
  namespace: 'admin.ai_hierarchy',
  translationKeys: [
    'admin.ai_hierarchy.eyebrow', 'admin.ai_hierarchy.title', 'admin.ai_hierarchy.description',
    'admin.ai_hierarchy.loading', 'admin.ai_hierarchy.error', 'admin.ai_hierarchy.empty',
    'admin.ai_hierarchy.refresh', 'admin.ai_hierarchy.graph_label', 'admin.ai_hierarchy.diagnostics',
    'admin.ai_hierarchy.cycles', 'admin.ai_hierarchy.orphans', 'admin.ai_hierarchy.team',
    'admin.ai_hierarchy.controls', 'admin.ai_hierarchy.zoom_in', 'admin.ai_hierarchy.zoom_out',
    'admin.ai_hierarchy.reset', 'admin.ai_hierarchy.expand_all', 'admin.ai_hierarchy.collapse_all', 'admin.ai_hierarchy.teams',
  ] as const,
  entityContent: { rpc: 'admin_get_ai_hierarchy', tables: ['ai_agents', 'ai_teams'] },
} as const satisfies I18nManifest;

type MermaidApi = { initialize: (options: Record<string, unknown>) => void; render: (id: string, definition: string) => Promise<{ svg: string }> };

declare global { interface Window { mermaid?: MermaidApi } }

function nodeId(id: string) { return `agent_${id.replaceAll('-', '_')}`; }
function label(value: string) { return value.replaceAll('"', "'").replaceAll('[', '(').replaceAll(']', ')').replaceAll('\n', ' '); }

function analyse(rows: AdminAiHierarchyRow[]) {
  const ids = new Set(rows.map((row) => row.agent_id));
  const orphans = rows.filter((row) => row.reports_to_agent_id && !ids.has(row.reports_to_agent_id));
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();
  for (const row of rows) {
    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: string | null = row.agent_id;
    while (current) {
      if (positions.has(current)) {
        const cycle = path.slice(positions.get(current));
        const key = [...cycle].sort().join('|');
        if (!seenCycles.has(key)) { seenCycles.add(key); cycles.push(cycle); }
        break;
      }
      positions.set(current, path.length);
      path.push(current);
      current = rows.find((candidate) => candidate.agent_id === current)?.reports_to_agent_id || null;
      if (current && !ids.has(current)) break;
    }
  }
  return { orphans, cycles };
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.2;
type TeamState = Record<string, boolean>;

function graphDefinition(rows: AdminAiHierarchyRow[], expandedTeams: TeamState) {
  const visible = rows.filter((row) => expandedTeams[row.team_id] !== false);
  const visibleTeams = new Set(visible.map((row) => row.team_id));
  const lines = ['flowchart TD'];
  for (const row of rows.filter((candidate) => !visibleTeams.has(candidate.team_id))) lines.push(`  team_${nodeId(row.team_id)}["${label(row.team_name)}"]`);
  for (const row of visible) lines.push(`  ${nodeId(row.agent_id)}["${label(row.agent_name)}<br/><small>${label(row.agent_title)}</small>"]`);
  for (const row of visible) if (row.reports_to_agent_id && visible.some((candidate) => candidate.agent_id === row.reports_to_agent_id)) lines.push(`  ${nodeId(row.reports_to_agent_id)} --> ${nodeId(row.agent_id)}`);
  return lines.join('\n');
}

async function loadMermaid(): Promise<MermaidApi> {
  if (window.mermaid) return window.mermaid;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-admin-mermaid]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Mermaid library could not be loaded.')), { once: true }); return; }
    const script = document.createElement('script'); script.dataset.adminMermaid = 'true'; script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.min.js'; script.onload = () => resolve(); script.onerror = () => reject(new Error('Mermaid library could not be loaded.')); document.head.appendChild(script);
  });
  if (!window.mermaid) throw new Error('Mermaid library is unavailable.');
  return window.mermaid;
}

export function AdminAiHierarchyPage() {
  const { t } = useWebsiteI18n();
  const [rows, setRows] = useState<AdminAiHierarchyRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [expandedTeams, setExpandedTeams] = useState<TeamState>({});
  const graphRef = useRef<HTMLDivElement>(null);
  const diagnostics = useMemo(() => (rows ? analyse(rows) : null), [rows]);
  const teams = useMemo(() => rows ? [...new Map(rows.map((row) => [row.team_id, { id: row.team_id, name: row.team_name, count: rows.filter((item) => item.team_id === row.team_id).length }])).values()] : [], [rows]);
  function changeZoom(delta: number) { setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))))); }
  function resetView() { setZoom(1); setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, true]))); }
  async function load() { setLoading(true); setError(null); try { setRows(await getAdminAiHierarchy()); } catch (reason) { setRows(null); setError(reason instanceof Error ? reason.message : t('admin.ai_hierarchy.error', 'The AI hierarchy could not be loaded.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [t]);
  useEffect(() => { setExpandedTeams(Object.fromEntries((rows || []).map((row) => [row.team_id, true]))); setZoom(1); }, [rows]);
  useEffect(() => { if (!rows?.length || !graphRef.current) return; let cancelled = false; void loadMermaid().then((mermaid) => { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' }); return mermaid.render('admin-ai-hierarchy-graph', graphDefinition(rows, expandedTeams)); }).then(({ svg }) => { if (!cancelled && graphRef.current) graphRef.current.innerHTML = svg; }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Mermaid render failed.'); }); return () => { cancelled = true; }; }, [rows, expandedTeams]);
  return <section className="admin-ai-hierarchy" aria-labelledby="admin-ai-hierarchy-title">
    <header className="admin-section-heading"><div><p>{t('admin.ai_hierarchy.eyebrow', 'AI GOVERNANCE')}</p><h1 id="admin-ai-hierarchy-title">{t('admin.ai_hierarchy.title', 'Live AI hierarchy')}</h1><span>{t('admin.ai_hierarchy.description', 'Read-only view of agents, teams and reporting relationships from Supabase.')}</span></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{t('admin.ai_hierarchy.refresh', 'Refresh')}</button></header>
    {loading && <div className="admin-loading"><LoaderCircle className="spin" />{t('admin.ai_hierarchy.loading', 'Loading the live AI hierarchy…')}</div>}
    {error && <div className="admin-error" role="alert"><AlertTriangle size={18} /><span>{error}</span></div>}
    {!loading && !error && rows && rows.length === 0 && <div className="admin-empty">{t('admin.ai_hierarchy.empty', 'No AI agents are available.')}</div>}
    {!loading && !error && rows && rows.length > 0 && <><div className="admin-ai-hierarchy__meta"><Network size={17} /><span>{rows.length} agents · {new Set(rows.map((row) => row.team_id)).size} teams</span></div>{diagnostics && (diagnostics.cycles.length > 0 || diagnostics.orphans.length > 0) && <aside className="admin-ai-hierarchy__diagnostics" aria-label={t('admin.ai_hierarchy.diagnostics', 'Hierarchy diagnostics')}><strong>{t('admin.ai_hierarchy.diagnostics', 'Hierarchy diagnostics')}</strong>{diagnostics.cycles.length > 0 && <span>{t('admin.ai_hierarchy.cycles', 'Cycles detected')}: {diagnostics.cycles.length}</span>}{diagnostics.orphans.length > 0 && <span>{t('admin.ai_hierarchy.orphans', 'Orphaned agents')}: {diagnostics.orphans.length}</span>}</aside>}<div className="admin-ai-hierarchy__controls" aria-label={t('admin.ai_hierarchy.controls', 'Hierarchy controls')}><button type="button" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label={t('admin.ai_hierarchy.zoom_in', 'Zoom in')}><ZoomIn size={16} />+</button><button type="button" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label={t('admin.ai_hierarchy.zoom_out', 'Zoom out')}><ZoomOut size={16} />−</button><button type="button" onClick={resetView}>{t('admin.ai_hierarchy.reset', 'Reset')} · {Math.round(zoom * 100)}%</button><button type="button" onClick={() => setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, true])))}>{t('admin.ai_hierarchy.expand_all', 'Expand all')}</button><button type="button" onClick={() => setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, false])))}>{t('admin.ai_hierarchy.collapse_all', 'Collapse all')}</button></div><div className="admin-ai-hierarchy__teams" aria-label={t('admin.ai_hierarchy.teams', 'Teams')}>{teams.map((team) => { const expanded = expandedTeams[team.id] !== false; return <button type="button" key={team.id} onClick={() => setExpandedTeams((current) => ({ ...current, [team.id]: !expanded }))} aria-expanded={expanded}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<span>{team.name}</span><small>{expanded ? '' : `${team.count} hidden`}</small></button>; })}</div><div className="admin-panel admin-ai-hierarchy__graph" ref={graphRef} role="img" aria-label={t('admin.ai_hierarchy.graph_label', 'Mermaid diagram of the live AI hierarchy')} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} /></>}
  </section>;
}

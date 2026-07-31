import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, LoaderCircle, Maximize2, Minimize2, Network, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
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
    'admin.ai_hierarchy.reset', 'admin.ai_hierarchy.expand_all', 'admin.ai_hierarchy.collapse_all',
    'admin.ai_hierarchy.teams', 'admin.ai_hierarchy.fullscreen', 'admin.ai_hierarchy.exit_fullscreen',
  ] as const,
  entityContent: { rpc: 'admin_get_ai_hierarchy', tables: ['ai_agents', 'ai_teams'] },
} as const satisfies I18nManifest;

type MermaidApi = { initialize: (options: Record<string, unknown>) => void; render: (id: string, definition: string) => Promise<{ svg: string }> };
type Point = { x: number; y: number };
type TeamState = Record<string, boolean>;

declare global { interface Window { mermaid?: MermaidApi } }

function nodeId(id: string) { return `agent_${id.replaceAll('-', '_')}`; }
function label(value: string) { return value.replaceAll('"', "'").replaceAll('[', '(').replaceAll(']', ')').replaceAll('\n', ' '); }
function nodeClass(row: AdminAiHierarchyRow) {
  if (row.agent_name.startsWith('AGENT —')) return 'agentNode';
  if (row.agent_title === 'Orchestrator') return 'rootNode';
  if (row.agent_title === 'Domain') return 'domainNode';
  if (row.agent_title === 'Team') return 'teamNode';
  return 'hierarchyNode';
}
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function midpoint(a: Point, b: Point): Point { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

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

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

function graphDefinition(rows: AdminAiHierarchyRow[], expandedTeams: TeamState) {
  const visible = rows.filter((row) => expandedTeams[row.team_id] !== false);
  const visibleTeams = new Set(visible.map((row) => row.team_id));
  const lines = [
    'flowchart TD',
    '  classDef rootNode fill:#312e81,stroke:#a5b4fc,color:#ffffff,stroke-width:2.5px,font-weight:700',
    '  classDef domainNode fill:#0f3d46,stroke:#5eead4,color:#ecfeff,stroke-width:2px,font-weight:700',
    '  classDef hierarchyNode fill:#172554,stroke:#60a5fa,color:#eff6ff,stroke-width:1.8px,font-weight:700',
    '  classDef teamNode fill:#3f2a12,stroke:#fbbf24,color:#fffbeb,stroke-width:2px,font-weight:700',
    '  classDef agentNode fill:#20242d,stroke:#94a3b8,color:#f8fafc,stroke-width:1.4px',
    '  linkStyle default stroke:#64748b,stroke-width:1.5px'
  ];
  for (const row of rows.filter((candidate) => !visibleTeams.has(candidate.team_id))) lines.push(`  team_${nodeId(row.team_id)}("${label(row.team_name)}"):::teamNode`);
  for (const row of visible) lines.push(`  ${nodeId(row.agent_id)}("${label(row.agent_name)}<br/><small>${label(row.agent_title)}</small>"):::${nodeClass(row)}`);
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
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<TeamState>({});
  const graphRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<{ center: Point | null; distance: number | null }>({ center: null, distance: null });
  const zoomRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const diagnostics = useMemo(() => (rows ? analyse(rows) : null), [rows]);
  const teams = useMemo(() => rows ? [...new Map(rows.map((row) => [row.team_id, { id: row.team_id, name: row.team_name, count: rows.filter((item) => item.team_id === row.team_id).length }])).values()] : [], [rows]);

  function setZoomSafe(value: number) {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    zoomRef.current = next;
    setZoom(next);
  }
  function setPanSafe(value: Point) { panRef.current = value; setPan(value); }
  function changeZoom(delta: number) { setZoomSafe(Number((zoomRef.current + delta).toFixed(2))); }
  function resetView() {
    setZoomSafe(1);
    setPanSafe({ x: 0, y: 0 });
    setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, true])));
  }
  async function toggleFullscreen() {
    if (!viewportRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewportRef.current.requestFullscreen();
  }
  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoomSafe(zoomRef.current * Math.exp(-event.deltaY * 0.0015));
  }
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    gestureRef.current.center = points.length === 1 ? points[0] : midpoint(points[0], points[1]);
    gestureRef.current.distance = points.length >= 2 ? distance(points[0], points[1]) : null;
    setIsPanning(true);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1 && gestureRef.current.center) {
      const current = points[0];
      setPanSafe({ x: panRef.current.x + current.x - gestureRef.current.center.x, y: panRef.current.y + current.y - gestureRef.current.center.y });
      gestureRef.current.center = current;
      return;
    }
    if (points.length >= 2) {
      const currentCenter = midpoint(points[0], points[1]);
      const currentDistance = distance(points[0], points[1]);
      if (gestureRef.current.center) setPanSafe({ x: panRef.current.x + currentCenter.x - gestureRef.current.center.x, y: panRef.current.y + currentCenter.y - gestureRef.current.center.y });
      if (gestureRef.current.distance) setZoomSafe(zoomRef.current * (currentDistance / gestureRef.current.distance));
      gestureRef.current.center = currentCenter;
      gestureRef.current.distance = currentDistance;
    }
  }
  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    const points = [...pointersRef.current.values()];
    gestureRef.current.center = points[0] || null;
    gestureRef.current.distance = points.length >= 2 ? distance(points[0], points[1]) : null;
    if (points.length === 0) setIsPanning(false);
  }
  async function load() { setLoading(true); setError(null); try { setRows(await getAdminAiHierarchy()); } catch (reason) { setRows(null); setError(reason instanceof Error ? reason.message : t('admin.ai_hierarchy.error', 'The AI hierarchy could not be loaded.')); } finally { setLoading(false); } }

  useEffect(() => { void load(); }, [t]);
  useEffect(() => { setExpandedTeams(Object.fromEntries((rows || []).map((row) => [row.team_id, true]))); setZoomSafe(1); setPanSafe({ x: 0, y: 0 }); }, [rows]);
  useEffect(() => { const listener = () => setIsFullscreen(document.fullscreenElement === viewportRef.current); document.addEventListener('fullscreenchange', listener); return () => document.removeEventListener('fullscreenchange', listener); }, []);
  useEffect(() => { if (!rows?.length || !graphRef.current) return; let cancelled = false; void loadMermaid().then((mermaid) => { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', flowchart: { curve: 'basis', nodeSpacing: 40, rankSpacing: 55 }, themeVariables: { background: '#0b1120', lineColor: '#64748b', fontFamily: 'Inter, ui-sans-serif, system-ui' } }); return mermaid.render('admin-ai-hierarchy-graph', graphDefinition(rows, expandedTeams)); }).then(({ svg }) => { if (!cancelled && graphRef.current) graphRef.current.innerHTML = svg; }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Mermaid render failed.'); }); return () => { cancelled = true; }; }, [rows, expandedTeams]);

  return <section className="admin-ai-hierarchy" aria-labelledby="admin-ai-hierarchy-title">
    <header className="admin-section-heading"><div><p>{t('admin.ai_hierarchy.eyebrow', 'AI GOVERNANCE')}</p><h1 id="admin-ai-hierarchy-title">{t('admin.ai_hierarchy.title', 'Live AI hierarchy')}</h1><span>{t('admin.ai_hierarchy.description', 'Read-only view of agents, teams and reporting relationships from Supabase.')}</span></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{t('admin.ai_hierarchy.refresh', 'Refresh')}</button></header>
    {loading && <div className="admin-loading"><LoaderCircle className="spin" />{t('admin.ai_hierarchy.loading', 'Loading the live AI hierarchy…')}</div>}
    {error && <div className="admin-error" role="alert"><AlertTriangle size={18} /><span>{error}</span></div>}
    {!loading && !error && rows && rows.length === 0 && <div className="admin-empty">{t('admin.ai_hierarchy.empty', 'No AI agents are available.')}</div>}
    {!loading && !error && rows && rows.length > 0 && <>
      <div className="admin-ai-hierarchy__meta"><Network size={17} /><span>{rows.length} agents · {new Set(rows.map((row) => row.team_id)).size} teams</span></div>
      {diagnostics && (diagnostics.cycles.length > 0 || diagnostics.orphans.length > 0) && <aside className="admin-ai-hierarchy__diagnostics" aria-label={t('admin.ai_hierarchy.diagnostics', 'Hierarchy diagnostics')}><strong>{t('admin.ai_hierarchy.diagnostics', 'Hierarchy diagnostics')}</strong>{diagnostics.cycles.length > 0 && <span>{t('admin.ai_hierarchy.cycles', 'Cycles detected')}: {diagnostics.cycles.length}</span>}{diagnostics.orphans.length > 0 && <span>{t('admin.ai_hierarchy.orphans', 'Orphaned agents')}: {diagnostics.orphans.length}</span>}</aside>}
      <div className="admin-ai-hierarchy__controls" aria-label={t('admin.ai_hierarchy.controls', 'Hierarchy controls')}>
        <button type="button" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label={t('admin.ai_hierarchy.zoom_in', 'Zoom in')}><ZoomIn size={16} />+</button>
        <button type="button" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label={t('admin.ai_hierarchy.zoom_out', 'Zoom out')}><ZoomOut size={16} />−</button>
        <button type="button" onClick={resetView}>{t('admin.ai_hierarchy.reset', 'Reset')} · {Math.round(zoom * 100)}%</button>
        <button type="button" onClick={() => void toggleFullscreen()}>{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{isFullscreen ? t('admin.ai_hierarchy.exit_fullscreen', 'Exit fullscreen') : t('admin.ai_hierarchy.fullscreen', 'Fullscreen')}</button>
        <button type="button" onClick={() => setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, true])))}>{t('admin.ai_hierarchy.expand_all', 'Expand all')}</button>
        <button type="button" onClick={() => setExpandedTeams(Object.fromEntries(teams.map((team) => [team.id, false])))}>{t('admin.ai_hierarchy.collapse_all', 'Collapse all')}</button>
      </div>
      <div className="admin-ai-hierarchy__teams" aria-label={t('admin.ai_hierarchy.teams', 'Teams')}>{teams.map((team) => { const expanded = expandedTeams[team.id] !== false; return <button type="button" key={team.id} onClick={() => setExpandedTeams((current) => ({ ...current, [team.id]: !expanded }))} aria-expanded={expanded}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<span>{team.name}</span><small>{expanded ? '' : `${team.count} hidden`}</small></button>; })}</div>
      <div ref={viewportRef} className="admin-panel admin-ai-hierarchy__viewport" role="img" aria-label={t('admin.ai_hierarchy.graph_label', 'Mermaid diagram of the live AI hierarchy')} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} onDoubleClick={resetView} style={{ overflow: 'hidden', minHeight: isFullscreen ? '100vh' : 620, width: '100%', background: '#0b1120', touchAction: 'none', cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}>
        <div className="admin-ai-hierarchy__graph" ref={graphRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', width: 'max-content', minWidth: '100%', willChange: 'transform' }} />
      </div>
    </>}
  </section>;
}

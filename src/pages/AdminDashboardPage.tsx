import { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, ChevronRight, CircleAlert, Database, FileText, FolderKanban, Gauge, Image, LayoutDashboard, ListChecks, LoaderCircle, Map as MapIcon, Menu, Search, Settings, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAdminDashboardData, type AdminModule, type AdminNotification, type AdminTask, type AuditEntry } from '../lib/adminApi';
import { AdminSectionPage } from './AdminSectionPage';
import { JournalAdminPage } from './JournalAdminPage';

const iconMap: Record<string, LucideIcon> = {
  activity: Activity, award: Sparkles, bookopentext: FileText, circledotdashed: Sparkles, database: Database,
  folder: FolderKanban, folderkanban: FolderKanban, funnel: Gauge, github: Database, image: Image, inbox: Bell,
  layoutdashboard: LayoutDashboard, lightbulb: Sparkles, map: MapIcon, mappinned: MapIcon, messagesquaretext: Bell,
  scrolltext: Activity, settings: Settings, shieldcheck: ShieldCheck, sparkles: Sparkles, users: Users,
};

function humanize(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function ModuleIcon({ module }: { module: AdminModule }) {
  const key = (module.icon || '').toLowerCase().replace(/[^a-z]/g, '');
  const Icon = iconMap[key] || FolderKanban;
  return <Icon size={18} strokeWidth={1.8} />;
}

function Sidebar({ modules, open, close }: { modules: AdminModule[]; open: boolean; close: () => void }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, AdminModule[]>();
    modules.forEach((module) => {
      const group = module.group_key || 'other';
      grouped.set(group, [...(grouped.get(group) || []), module]);
    });
    return [...grouped.entries()];
  }, [modules]);

  return <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
    <div className="admin-brand"><div className="admin-brand-mark"><Sparkles size={20} /></div><div><strong>Bankrupt to 1M</strong><span>Mission Control</span></div><button className="admin-icon-button admin-close" onClick={close}><X size={20} /></button></div>
    <nav className="admin-nav">
      {groups.map(([group, items]) => <section key={group} className="admin-nav-group"><p>{humanize(group)}</p>{items.map((module) => <a key={module.key} href={module.route} className={window.location.pathname === module.route ? 'active' : ''}><ModuleIcon module={module} /><span>{module.label}</span><ChevronRight size={14} className="admin-nav-arrow" /></a>)}</section>)}
    </nav>
    <div className="admin-sidebar-footer"><ShieldCheck size={18} /><div><strong>Protected workspace</strong><span>Role-based admin access</span></div></div>
  </aside>;
}

function TaskList({ tasks }: { tasks: AdminTask[] }) {
  if (!tasks.length) return <div className="admin-empty">Geen open taken.</div>;
  return <div className="admin-list">{tasks.map((task) => <div className="admin-list-row" key={task.id}><div className={`admin-status-dot ${task.priority || 'normal'}`} /><div><strong>{task.title}</strong><span>{task.status || 'Open'}{task.due_at ? ` · ${new Date(task.due_at).toLocaleDateString()}` : ''}</span></div><ChevronRight size={16} /></div>)}</div>;
}

function Notifications({ notifications }: { notifications: AdminNotification[] }) {
  if (!notifications.length) return <div className="admin-empty">Geen notificaties.</div>;
  return <div className="admin-list">{notifications.map((item) => <div className="admin-list-row" key={item.id}><div className={`admin-notification-icon ${item.severity || 'info'}`}><Bell size={16} /></div><div><strong>{item.title}</strong><span>{item.message || new Date(item.created_at).toLocaleString()}</span></div></div>)}</div>;
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <div className="admin-empty">Nog geen recente wijzigingen.</div>;
  return <div className="admin-audit">{entries.map((entry) => <div key={entry.id}><Activity size={15} /><p><strong>{humanize(entry.action)}</strong><span>{entry.table_name ? humanize(entry.table_name) : 'System'} · {entry.actor_email || 'System'}</span></p><time>{new Date(entry.occurred_at).toLocaleString()}</time></div>)}</div>;
}

export function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboardData>> | null>(null);
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const isOverview = path === '/admin';

  useEffect(() => {
    getAdminDashboardData().then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Admin data kon niet worden geladen.')).finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => [
    ['Journal posts', data?.overview.content?.journal_total ?? 0],
    ['Proof of Mind', data?.overview.ventures?.concepts ?? 0],
    ['Media assets', data?.overview.media?.assets ?? 0],
    ['Open GitHub issues', data?.overview.delivery?.open_issues ?? 0],
  ] as const, [data]);

  return <div className="admin-root">
    <Sidebar modules={data?.modules || []} open={sidebarOpen} close={() => setSidebarOpen(false)} />
    {sidebarOpen && <button className="admin-backdrop" onClick={() => setSidebarOpen(false)} />}
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-icon-button admin-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="admin-search"><Search size={18} /><input placeholder="Search content, people, media..." /></div><div className="admin-topbar-actions"><button className="admin-icon-button"><Bell size={20} /></button><div className="admin-avatar">KD</div></div></header>
      <div className="admin-content">
        {path === '/admin/journal' ? <JournalAdminPage /> : !isOverview ? <AdminSectionPage path={path} /> : <>
          <section className="admin-heading"><div><p>MISSION CONTROL</p><h1>Admin overview</h1><span>Live operational view of the Bankrupt to 1 Million platform.</span></div><div className="admin-health"><span /><strong>{error ? 'Connection issue' : 'Platform connected'}</strong></div></section>
          {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading dashboard data…</div>}
          {error && <div className="admin-error"><CircleAlert size={20} /><div><strong>Live data unavailable</strong><span>{error}</span></div></div>}
          <section className="admin-kpis">{kpis.map(([label, value], index) => <article key={label}><div className="admin-kpi-icon">{index === 0 ? <FileText /> : index === 1 ? <Sparkles /> : index === 2 ? <Image /> : <Database />}</div><p>{label}</p><strong>{loading ? '—' : value.toLocaleString()}</strong><span>Live from Supabase</span></article>)}</section>
          <section className="admin-grid admin-grid-primary"><article className="admin-panel admin-panel-wide"><div className="admin-panel-header"><div><p>Operations</p><h2>Open tasks</h2></div><ListChecks size={20} /></div><TaskList tasks={data?.tasks || []} /></article><article className="admin-panel"><div className="admin-panel-header"><div><p>Inbox</p><h2>Notifications</h2></div><Bell size={20} /></div><Notifications notifications={data?.notifications || []} /></article></section>
          <section className="admin-grid"><article className="admin-panel admin-panel-wide"><div className="admin-panel-header"><div><p>Traceability</p><h2>Recent activity</h2></div><Activity size={20} /></div><AuditLog entries={data?.audit || []} /></article><article className="admin-panel admin-quick-actions"><div className="admin-panel-header"><div><p>Shortcuts</p><h2>Quick actions</h2></div><Gauge size={20} /></div><button onClick={() => window.location.assign('/admin/journal')}><FileText size={18} /><span><strong>Manage journal</strong><small>Create and publish stories</small></span><ChevronRight /></button><button onClick={() => window.location.assign('/admin/media')}><Image size={18} /><span><strong>Manage media</strong><small>Review Media Vault assets</small></span><ChevronRight /></button><button onClick={() => window.location.assign('/admin/journey')}><MapIcon size={18} /><span><strong>Manage journey</strong><small>Map and timeline entries</small></span><ChevronRight /></button><button onClick={() => window.location.assign('/admin/people')}><Users size={18} /><span><strong>Manage people</strong><small>Hosts and community</small></span><ChevronRight /></button></article></section>
        </>}
      </div>
    </main>
  </div>;
}

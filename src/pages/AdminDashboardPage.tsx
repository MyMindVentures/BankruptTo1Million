import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  CircleAlert,
  Database,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Image,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  getAdminDashboardData,
  type AdminModule,
  type AdminNotification,
  type AdminTask,
  type AuditEntry,
} from '../lib/adminApi';

const iconMap: Record<string, LucideIcon> = {
  activity: Activity,
  bot: Bot,
  database: Database,
  file: FileText,
  'file-text': FileText,
  folder: FolderKanban,
  gauge: Gauge,
  globe: Globe2,
  image: Image,
  layout: LayoutDashboard,
  map: MapIcon,
  message: MessageSquare,
  settings: Settings,
  shield: ShieldCheck,
  sparkles: Sparkles,
  users: Users,
};

const fallbackGroups = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Content', icon: FileText },
  { name: 'Journey', icon: MapIcon },
  { name: 'Proof of Mind', icon: Sparkles },
  { name: 'Media', icon: Image },
  { name: 'Community', icon: Users },
  { name: 'System', icon: Settings },
];

const fallbackKpis = [
  ['Journal posts', 45],
  ['Proof of Mind', 34],
  ['Media assets', 6],
  ['Translation jobs', 869],
];

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ModuleIcon({ module }: { module: AdminModule }) {
  const key = (module.icon || '').toLowerCase();
  const Icon = iconMap[key] || iconMap[key.replace(/^lucide-/, '')] || FolderKanban;
  return <Icon size={18} strokeWidth={1.8} />;
}

function Sidebar({ modules, open, close }: { modules: AdminModule[]; open: boolean; close: () => void }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, AdminModule[]>();
    modules.forEach((module) => {
      const group = module.group_name || 'Other';
      grouped.set(group, [...(grouped.get(group) || []), module]);
    });
    return [...grouped.entries()];
  }, [modules]);

  return (
    <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
      <div className="admin-brand">
        <div className="admin-brand-mark"><Sparkles size={20} /></div>
        <div><strong>Bankrupt to 1M</strong><span>Mission Control</span></div>
        <button className="admin-icon-button admin-close" onClick={close} aria-label="Close menu"><X size={20} /></button>
      </div>

      <nav className="admin-nav" aria-label="Admin navigation">
        {groups.length > 0 ? groups.map(([group, items]) => (
          <section key={group} className="admin-nav-group">
            <p>{group}</p>
            {items.map((module, index) => (
              <a key={module.id} href={module.route || '#'} className={index === 0 && group.toLowerCase() === 'overview' ? 'active' : ''}>
                <ModuleIcon module={module} />
                <span>{module.name}</span>
                <ChevronRight size={14} className="admin-nav-arrow" />
              </a>
            ))}
          </section>
        )) : fallbackGroups.map(({ name, icon: Icon }, index) => (
          <a key={name} href="#" className={index === 0 ? 'active' : ''}><Icon size={18} /><span>{name}</span></a>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <ShieldCheck size={18} />
        <div><strong>Protected workspace</strong><span>Role-based admin access</span></div>
      </div>
    </aside>
  );
}

function TaskList({ tasks }: { tasks: AdminTask[] }) {
  if (!tasks.length) return <div className="admin-empty">Geen open taken.</div>;
  return <div className="admin-list">{tasks.map((task) => (
    <div className="admin-list-row" key={task.id}>
      <div className={`admin-status-dot ${task.priority || 'normal'}`} />
      <div><strong>{task.title}</strong><span>{task.status || 'Open'}{task.due_at ? ` · ${new Date(task.due_at).toLocaleDateString()}` : ''}</span></div>
      <ChevronRight size={16} />
    </div>
  ))}</div>;
}

function Notifications({ notifications }: { notifications: AdminNotification[] }) {
  if (!notifications.length) return <div className="admin-empty">Geen notificaties.</div>;
  return <div className="admin-list">{notifications.map((item) => (
    <div className="admin-list-row" key={item.id}>
      <div className={`admin-notification-icon ${item.severity || 'info'}`}><Bell size={16} /></div>
      <div><strong>{item.title}</strong><span>{item.body || new Date(item.created_at).toLocaleString()}</span></div>
    </div>
  ))}</div>;
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <div className="admin-empty">Nog geen recente wijzigingen.</div>;
  return <div className="admin-audit">{entries.map((entry) => (
    <div key={entry.id}>
      <Activity size={15} />
      <p><strong>{humanize(entry.action)}</strong><span>{entry.entity_type ? humanize(entry.entity_type) : 'System'} · {entry.actor_email || 'System'}</span></p>
      <time>{new Date(entry.created_at).toLocaleString()}</time>
    </div>
  ))}</div>;
}

export function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboardData>> | null>(null);

  useEffect(() => {
    getAdminDashboardData()
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Admin data kon niet worden geladen.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    if (!data?.overview) return fallbackKpis;
    const entries = Object.entries(data.overview)
      .map(([key, value]) => [humanize(key), toNumber(value)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null)
      .slice(0, 4);
    return entries.length ? entries : fallbackKpis;
  }, [data]);

  return (
    <div className="admin-root">
      <Sidebar modules={data?.modules || []} open={sidebarOpen} close={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="admin-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-icon-button admin-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="admin-search"><Search size={18} /><input aria-label="Search admin" placeholder="Search content, people, media..." /></div>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" aria-label="Notifications"><Bell size={20} /></button>
            <div className="admin-avatar">KD</div>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-heading">
            <div><p>MISSION CONTROL</p><h1>Admin overview</h1><span>Live operational view of the Bankrupt to 1 Million platform.</span></div>
            <div className="admin-health"><span /><strong>Platform connected</strong></div>
          </section>

          {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading dashboard data…</div>}
          {error && <div className="admin-error"><CircleAlert size={20} /><div><strong>Live data unavailable</strong><span>{error}</span></div></div>}

          <section className="admin-kpis">
            {kpis.map(([label, value], index) => (
              <article key={label}>
                <div className="admin-kpi-icon">{index === 0 ? <FileText /> : index === 1 ? <Sparkles /> : index === 2 ? <Image /> : <Globe2 />}</div>
                <p>{label}</p><strong>{value.toLocaleString()}</strong><span>Live from Supabase</span>
              </article>
            ))}
          </section>

          <section className="admin-grid admin-grid-primary">
            <article className="admin-panel admin-panel-wide">
              <div className="admin-panel-header"><div><p>Operations</p><h2>Open tasks</h2></div><ListChecks size={20} /></div>
              <TaskList tasks={data?.tasks || []} />
            </article>
            <article className="admin-panel">
              <div className="admin-panel-header"><div><p>Inbox</p><h2>Notifications</h2></div><Bell size={20} /></div>
              <Notifications notifications={data?.notifications || []} />
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-panel admin-panel-wide">
              <div className="admin-panel-header"><div><p>Traceability</p><h2>Recent activity</h2></div><Activity size={20} /></div>
              <AuditLog entries={data?.audit || []} />
            </article>
            <article className="admin-panel admin-quick-actions">
              <div className="admin-panel-header"><div><p>Shortcuts</p><h2>Quick actions</h2></div><Gauge size={20} /></div>
              <button><FileText size={18} /><span><strong>Create journal post</strong><small>Start a new story</small></span><ChevronRight /></button>
              <button><Image size={18} /><span><strong>Upload media</strong><small>Add to Media Vault</small></span><ChevronRight /></button>
              <button><MapIcon size={18} /><span><strong>Add journey point</strong><small>Update map and timeline</small></span><ChevronRight /></button>
              <button><Users size={18} /><span><strong>Review community</strong><small>Messages and offers</small></span><ChevronRight /></button>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

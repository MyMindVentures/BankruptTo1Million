import { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CalendarDays, ChevronRight, CircleAlert, Database, FileText, FolderKanban, Gauge, Image, LayoutDashboard, ListChecks, LoaderCircle, Map as MapIcon, Menu, PanelLeft, PanelLeftClose, Search, Settings, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAdminDashboardData, type AdminModule, type AdminNotification, type AdminTask, type AuditEntry } from '../lib/adminApi';
import { getAdminDashboardKpis, resolveOverviewValue, type AdminDashboardKpi } from '../lib/adminDashboardApi';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { AdminAiControlCenterPage } from './AdminAiControlCenterPage';
import { AdminMediaVaultPage } from './AdminMediaVaultPage';
import { AdminSectionPage } from './AdminSectionPage';
import { FounderSupportAdminPage } from './FounderSupportAdminPage';
import { JournalAdminPage } from './JournalAdminPage';
import { JourneyCalendarAdminPage } from './JourneyCalendarAdminPage';
import { OutreachAdminPage } from './OutreachAdminPage';
import { ProofOfMindAdminPage } from './ProofOfMindAdminPage';
import '../styles/outreachAdmin.css';

const SIDEBAR_COLLAPSED_KEY = 'admin.sidebar.collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}

const iconMap: Record<string, LucideIcon> = {
  activity: Activity, award: Sparkles, bookopentext: FileText, bot: Sparkles, calendardays: CalendarDays, circledotdashed: Sparkles, database: Database,
  folder: FolderKanban, folderkanban: FolderKanban, funnel: Gauge, github: Database, image: Image, inbox: Bell,
  layoutdashboard: LayoutDashboard, lightbulb: Sparkles, map: MapIcon, mappinned: MapIcon, messagesquaretext: Bell,
  scrolltext: Activity, settings: Settings, shieldcheck: ShieldCheck, sparkles: Sparkles, users: Users,
};

function humanize(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function iconFor(value?: string | null) { return iconMap[(value || '').toLowerCase().replace(/[^a-z]/g, '')] || FolderKanban; }

function ModuleIcon({ module }: { module: AdminModule }) {
  const Icon = iconFor(module.icon);
  return <Icon size={18} strokeWidth={1.8} />;
}

function Sidebar({
  modules,
  open,
  collapsed,
  close,
  onToggleCollapsed,
}: {
  modules: AdminModule[];
  open: boolean;
  collapsed: boolean;
  close: () => void;
  onToggleCollapsed: () => void;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<string, AdminModule[]>();
    modules.forEach((module) => {
      const group = module.group_key || 'other';
      grouped.set(group, [...(grouped.get(group) || []), module]);
    });
    return [...grouped.entries()];
  }, [modules]);

  const CollapseIcon = collapsed ? PanelLeft : PanelLeftClose;

  return <aside className={`admin-sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
    <div className="admin-brand">
      <div className="admin-brand-mark"><Sparkles size={20} /></div>
      <div className="admin-brand-copy"><strong>Bankrupt to 1M</strong><span>Mission Control</span></div>
      <button
        type="button"
        className="admin-icon-button admin-collapse"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <CollapseIcon size={20} />
      </button>
      <button type="button" className="admin-icon-button admin-close" onClick={close} aria-label="Close navigation"><X size={20} /></button>
    </div>
    <nav className="admin-nav">
      {groups.map(([group, items]) => (
        <section key={group} className="admin-nav-group">
          <p>{humanize(group)}</p>
          {items.map((module) => (
            <a
              key={module.key}
              href={module.route}
              className={window.location.pathname === module.route ? 'active' : ''}
              title={module.label}
            >
              <ModuleIcon module={module} />
              <span>{module.label}</span>
              <ChevronRight size={14} className="admin-nav-arrow" />
            </a>
          ))}
        </section>
      ))}
    </nav>
    <div className="admin-sidebar-footer" title="Protected workspace">
      <ShieldCheck size={18} />
      <div className="admin-sidebar-footer-copy"><strong>Protected workspace</strong><span>Role-based admin access</span></div>
    </div>
  </aside>;
}

function TaskList({ tasks, failed }: { tasks: AdminTask[]; failed: boolean }) {
  if (failed) return <div className="admin-empty">Task query failed.</div>;
  if (!tasks.length) return <div className="admin-empty">Geen open taken.</div>;
  return <div className="admin-list">{tasks.map((task) => <div className="admin-list-row" key={task.id}><div className={`admin-status-dot ${task.priority || 'normal'}`} /><div><strong>{task.title}</strong><span>{task.status || 'Open'}{task.due_at ? ` · ${new Date(task.due_at).toLocaleDateString()}` : ''}</span></div><ChevronRight size={16} /></div>)}</div>;
}

function Notifications({ notifications, failed }: { notifications: AdminNotification[]; failed: boolean }) {
  if (failed) return <div className="admin-empty">Notification query failed.</div>;
  if (!notifications.length) return <div className="admin-empty">Geen notificaties.</div>;
  return <div className="admin-list">{notifications.map((item) => <div className="admin-list-row" key={item.id}><div className={`admin-notification-icon ${item.severity || 'info'}`}><Bell size={16} /></div><div><strong>{item.title}</strong><span>{item.message || new Date(item.created_at).toLocaleString()}</span></div></div>)}</div>;
}

function AuditLog({ entries, failed }: { entries: AuditEntry[]; failed: boolean }) {
  if (failed) return <div className="admin-empty">Audit query failed.</div>;
  if (!entries.length) return <div className="admin-empty">Nog geen recente wijzigingen.</div>;
  return <div className="admin-audit">{entries.map((entry) => <div key={entry.id}><Activity size={15} /><p><strong>{humanize(entry.action)}</strong><span>{entry.table_name ? humanize(entry.table_name) : 'System'} · {entry.actor_email || 'System'}</span></p><time>{new Date(entry.occurred_at).toLocaleString()}</time></div>)}</div>;
}

export function AdminDashboardPage() {
  const { t } = useWebsiteI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboardData>> | null>(null);
  const [kpis, setKpis] = useState<AdminDashboardKpi[] | null>(null);
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const isOverview = path === '/admin';

  useEffect(() => {
    Promise.allSettled([getAdminDashboardData(), getAdminDashboardKpis()]).then(([dashboardResult, kpiResult]) => {
      const errors: string[] = [];
      if (dashboardResult.status === 'fulfilled') {
        setData(dashboardResult.value);
        errors.push(...Object.entries(dashboardResult.value.errors).map(([source, message]) => `${source}: ${message}`));
      } else errors.push(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : 'Admin dashboard query failed.');
      if (kpiResult.status === 'fulfilled') setKpis(kpiResult.value);
      else errors.push(kpiResult.reason instanceof Error ? kpiResult.reason.message : 'Dashboard KPI metadata query failed.');
      setError(errors.length ? errors.join(' | ') : null);
    }).finally(() => setLoading(false));
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  const quickActions = useMemo(() => (data?.modules || []).filter((module) => module.route !== '/admin').slice(0, 6), [data]);

  return <div className={`admin-root ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
    <Sidebar
      modules={data?.modules || []}
      open={sidebarOpen}
      collapsed={sidebarCollapsed}
      close={() => setSidebarOpen(false)}
      onToggleCollapsed={toggleSidebarCollapsed}
    />
    {sidebarOpen && <button className="admin-backdrop" onClick={() => setSidebarOpen(false)} />}
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-icon-button admin-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="admin-search"><Search size={18} /><input placeholder={t('admin.search.global', 'Search content, people, media...')} /></div><div className="admin-topbar-actions"><button className="admin-icon-button"><Bell size={20} /></button><div className="admin-avatar">KD</div></div></header>
      <div className="admin-content">
        {path === '/admin/outreach' ? <OutreachAdminPage /> : path === '/admin/journal' ? <JournalAdminPage /> : path === '/admin/calendar' ? <JourneyCalendarAdminPage /> : path === '/admin/media' ? <AdminMediaVaultPage /> : path === '/admin/ai' ? <AdminAiControlCenterPage /> : path === '/admin/support-messages' ? <FounderSupportAdminPage /> : path === '/admin/proof-of-mind' ? <ProofOfMindAdminPage /> : !isOverview ? <AdminSectionPage path={path} /> : <>
          <section className="admin-heading"><div><p>{t('admin.dashboard.eyebrow', 'MISSION CONTROL')}</p><h1>{t('admin.dashboard.title', 'Admin overview')}</h1><span>{t('admin.dashboard.description', 'Live operational view of the Bankrupt to 1 Million platform.')}</span></div><div className="admin-health"><span /><strong>{error ? t('admin.connection.issue', 'Connection issue') : t('admin.connection.ok', 'Platform connected')}</strong></div></section>
          {loading && <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.dashboard.loading', 'Loading dashboard data…')}</div>}
          {error && <div className="admin-error"><CircleAlert size={20} /><div><strong>{t('admin.dashboard.partial_error', 'One or more live queries failed')}</strong><span>{error}</span></div></div>}
          <section className="admin-kpis">{(kpis || []).map((kpi) => { const Icon = iconFor(kpi.icon); const value = resolveOverviewValue(data?.overview, kpi.overview_path); return <article key={kpi.kpi_key}><div className="admin-kpi-icon"><Icon /></div><p>{t(kpi.label_key, kpi.label_fallback)}</p><strong>{loading || value === null ? '—' : value.toLocaleString()}</strong><span>{t('admin.live_from_supabase', 'Live from Supabase')}</span></article>; })}</section>
          <section className="admin-grid admin-grid-primary"><article className="admin-panel admin-panel-wide"><div className="admin-panel-header"><div><p>{t('admin.operations', 'Operations')}</p><h2>{t('admin.tasks.open', 'Open tasks')}</h2></div><ListChecks size={20} /></div><TaskList tasks={data?.tasks || []} failed={Boolean(data?.errors.tasks)} /></article><article className="admin-panel"><div className="admin-panel-header"><div><p>{t('admin.inbox', 'Inbox')}</p><h2>{t('admin.notifications', 'Notifications')}</h2></div><Bell size={20} /></div><Notifications notifications={data?.notifications || []} failed={Boolean(data?.errors.notifications)} /></article></section>
          <section className="admin-grid"><article className="admin-panel admin-panel-wide"><div className="admin-panel-header"><div><p>{t('admin.traceability', 'Traceability')}</p><h2>{t('admin.activity.recent', 'Recent activity')}</h2></div><Activity size={20} /></div><AuditLog entries={data?.audit || []} failed={Boolean(data?.errors.audit)} /></article><article className="admin-panel admin-quick-actions"><div className="admin-panel-header"><div><p>{t('admin.shortcuts', 'Shortcuts')}</p><h2>{t('admin.quick_actions', 'Quick actions')}</h2></div><Gauge size={20} /></div>{quickActions.map((module) => { const Icon = iconFor(module.icon); return <button key={module.key} onClick={() => window.location.assign(module.route)}><Icon size={18} /><span><strong>{module.label}</strong><small>{humanize(module.group_key || 'admin')}</small></span><ChevronRight /></button>; })}</article></section>
        </>}
      </div>
    </main>
  </div>;
}

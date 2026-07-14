create table if not exists public.admin_dashboard_kpis (
  id uuid primary key default gen_random_uuid(),
  kpi_key text not null unique,
  label_key text not null,
  label_fallback text not null,
  overview_path text[] not null,
  icon text,
  display_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_dashboard_kpis enable row level security;

drop policy if exists "active admins read dashboard kpis" on public.admin_dashboard_kpis;
create policy "active admins read dashboard kpis"
on public.admin_dashboard_kpis for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "active admins manage dashboard kpis" on public.admin_dashboard_kpis;
create policy "active admins manage dashboard kpis"
on public.admin_dashboard_kpis for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

insert into public.admin_dashboard_kpis(kpi_key,label_key,label_fallback,overview_path,icon,display_order)
values
('journal_total','admin.dashboard.kpi.journal','Journal posts',array['content','journal_total'],'filetext',10),
('concepts','admin.dashboard.kpi.concepts','Proof of Mind',array['ventures','concepts'],'sparkles',20),
('media_assets','admin.dashboard.kpi.media','Media assets',array['media','assets'],'image',30),
('open_issues','admin.dashboard.kpi.issues','Open GitHub issues',array['delivery','open_issues'],'database',40)
on conflict(kpi_key) do update set
 label_key=excluded.label_key,
 label_fallback=excluded.label_fallback,
 overview_path=excluded.overview_path,
 icon=excluded.icon,
 display_order=excluded.display_order,
 updated_at=now();

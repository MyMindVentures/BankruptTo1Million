-- Allow allowlisted admins full media_assets access.
-- Admin gate uses admin_allowlist via has_active_admin_access(); media_assets
-- previously only granted full access through is_media_manager() (JWT app_metadata.role).

drop policy if exists "active admins read all media assets" on public.media_assets;
create policy "active admins read all media assets"
on public.media_assets for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "active admins insert media assets" on public.media_assets;
create policy "active admins insert media assets"
on public.media_assets for insert to authenticated
with check (public.has_active_admin_access());

drop policy if exists "active admins update media assets" on public.media_assets;
create policy "active admins update media assets"
on public.media_assets for update to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

-- Align Media Vault status filter options with live status values.
update public.admin_section_fields f
set options = '["published","ready","uploading","processing","failed","archived"]'::jsonb,
    updated_at = now()
from public.admin_sections s
where f.section_id = s.id
  and s.route = '/admin/media'
  and f.field_name = 'status';

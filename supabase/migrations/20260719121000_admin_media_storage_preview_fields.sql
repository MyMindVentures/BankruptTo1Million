-- Admin Media Vault previews need storage_bucket/storage_path when thumbnail_url is null.

with media_section as (
  select id from public.admin_sections where route = '/admin/media' and is_enabled = true
),
field_seed(field_name, label_fallback, display_order, show_in_list, show_in_editor, is_readonly, input_type) as (
  values
    ('storage_bucket', 'Storage bucket', 95, false, true, true, 'text'),
    ('storage_path', 'Storage path', 96, false, true, true, 'text')
)
insert into public.admin_section_fields(
  section_id, field_name, label_key, label_fallback, display_order,
  show_in_list, show_in_editor, is_readonly, is_required, input_type, options
)
select
  s.id,
  f.field_name,
  'admin.field.' || replace(f.field_name, '_', '.'),
  f.label_fallback,
  f.display_order,
  f.show_in_list,
  f.show_in_editor,
  f.is_readonly,
  false,
  f.input_type,
  '[]'::jsonb
from field_seed f
cross join media_section s
on conflict (section_id, field_name) do update set
  label_key = excluded.label_key,
  label_fallback = excluded.label_fallback,
  display_order = excluded.display_order,
  show_in_list = excluded.show_in_list,
  show_in_editor = excluded.show_in_editor,
  is_readonly = excluded.is_readonly,
  input_type = excluded.input_type,
  options = excluded.options,
  updated_at = now();

-- Keep metadata aligned with fields already used by the previous production query contract.
update public.admin_sections
set image_field = null, updated_at = now()
where route = '/admin/people';

delete from public.admin_section_fields f
using public.admin_sections s
where f.section_id = s.id
  and s.route = '/admin/people'
  and f.field_name = 'avatar_url';

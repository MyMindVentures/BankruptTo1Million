-- Issue #246: atomic Media Vault editor and controlled multi-value usage taxonomy.
create table if not exists public.media_usage_types (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  display_name text not null,
  description text,
  controlled_tag text not null unique,
  requires_relation text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_asset_usage_types (
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  usage_type_key text not null references public.media_usage_types(key) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (media_asset_id, usage_type_key)
);

insert into public.media_usage_types(key, display_name, controlled_tag, requires_relation, display_order) values
  ('logo','Logo','usage:logo',null,10),
  ('mockup_screen','Mockup screen','usage:mockup-screen','proof_of_mind_mockup_screens',20),
  ('hero_image','Hero image','usage:hero-image',null,30),
  ('gallery','Gallery','usage:gallery',null,40),
  ('social_asset','Social asset','usage:social-asset',null,50),
  ('founder_portrait','Founder portrait','usage:founder-portrait',null,60),
  ('website_asset','Website asset','usage:website-asset',null,70),
  ('event_footage','Event footage','usage:event-footage',null,80),
  ('journal_media','Journal media','usage:journal-media',null,90),
  ('qr_code','QR code','usage:qr-code',null,100),
  ('other','Other','usage:other',null,110)
on conflict (key) do update set
  display_name=excluded.display_name, controlled_tag=excluded.controlled_tag,
  requires_relation=excluded.requires_relation, display_order=excluded.display_order,
  updated_at=now();

insert into public.website_ui_components(component_key,source_path,export_name,surface_type,namespace,is_public,entity_content,coverage_status)
values ('admin.media_vault.page','src/pages/AdminMediaVaultOffersPage.tsx','AdminMediaVaultOffersPage','page','admin.media',false,
  '{"rpc":"admin_get_media_asset_editor","tables":["media_assets","media_usage_types","media_asset_usage_types","proof_of_mind_concept_media","proof_of_mind_mockup_screens"]}'::jsonb,'connected')
on conflict (component_key) do update set source_path=excluded.source_path,export_name=excluded.export_name,namespace=excluded.namespace,
  is_public=excluded.is_public,entity_content=excluded.entity_content,coverage_status=excluded.coverage_status,updated_at=now();

alter table public.media_usage_types enable row level security;
alter table public.media_asset_usage_types enable row level security;
drop policy if exists "admins read media usage types" on public.media_usage_types;
create policy "admins read media usage types" on public.media_usage_types for select to authenticated
using (public.has_active_admin_access() or public.is_media_manager());
drop policy if exists "admins manage asset usage types" on public.media_asset_usage_types;
create policy "admins manage asset usage types" on public.media_asset_usage_types for all to authenticated
using (public.has_active_admin_access() or public.is_media_manager())
with check (public.has_active_admin_access() or public.is_media_manager());

create or replace function public.admin_media_asset_other_applications(p_asset_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare fk record; rows jsonb; result jsonb := '[]'::jsonb;
begin
  for fk in
    select c.conrelid::regclass relation_table, a.attname asset_column
    from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    where c.contype='f' and c.confrelid='public.media_assets'::regclass and array_length(c.conkey,1)=1
      and c.conrelid not in ('public.media_asset_usage_types'::regclass,'public.journal_post_media'::regclass,
        'public.media_collection_items'::regclass,'public.proof_of_mind_concept_media'::regclass,
        'public.proof_of_mind_mockup_screens'::regclass)
  loop
    execute format('select coalesce(jsonb_agg(jsonb_build_object(''relation_table'',%L,''relation_id'',coalesce(to_jsonb(r)->>''id'',to_jsonb(r)->>''%I''),''entity_type'',%L,''entity_id'',coalesce(to_jsonb(r)->>''id'',''''),''entity_title'',null,''placement'',coalesce(to_jsonb(r)->>''placement'',to_jsonb(r)->>''slot_key'',to_jsonb(r)->>''relation_type''),''display_order'',coalesce((to_jsonb(r)->>''display_order'')::int,0),''is_featured'',coalesce((to_jsonb(r)->>''is_featured'')::boolean,false),''caption_override'',to_jsonb(r)->>''caption_override'',''alt_text_override'',to_jsonb(r)->>''alt_text_override'',''editable'',false,''details'',to_jsonb(r))),''[]''::jsonb) from %s r where %I=$1', fk.relation_table::text, fk.asset_column, fk.relation_table::text, fk.relation_table, fk.asset_column)
      into rows using p_asset_id;
    result := result || rows;
  end loop;
  return result;
end $$;

create or replace function public.admin_get_media_asset_editor(p_asset_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
  if not (public.has_active_admin_access() or public.is_media_manager()) then
    raise exception 'Active admin or media-manager access required' using errcode='42501';
  end if;
  select jsonb_build_object(
    'asset', to_jsonb(ma),
    'usage_types', coalesce((select jsonb_agg(to_jsonb(ut) order by ut.display_order)
      from public.media_asset_usage_types au join public.media_usage_types ut on ut.key=au.usage_type_key
      where au.media_asset_id=ma.id), '[]'::jsonb),
    'available_usage_types', coalesce((select jsonb_agg(to_jsonb(ut) order by ut.display_order)
      from public.media_usage_types ut where ut.is_active), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(application order by application->>'entity_type', coalesce((application->>'display_order')::int,0)) from (
        select jsonb_build_object('relation_table','journal_post_media','relation_id',jpm.id,'entity_type','journal_post','entity_id',jpm.journal_post_id,'entity_title',jp.title,'placement',jpm.placement,'display_order',jpm.display_order,'is_featured',jpm.is_featured,'caption_override',jpm.caption_override,'alt_text_override',jpm.alt_text_override,'editable',false) application from public.journal_post_media jpm left join public.journal_posts jp on jp.id=jpm.journal_post_id where jpm.media_asset_id=ma.id
        union all
        select jsonb_build_object('relation_table','media_collection_items','relation_id',mci.id,'entity_type','media_collection','entity_id',mci.collection_id,'entity_title',mc.title,'placement',mci.placement,'display_order',mci.display_order,'is_featured',mci.is_featured,'caption_override',mci.caption_override,'alt_text_override',mci.alt_text_override,'editable',false) from public.media_collection_items mci left join public.media_collections mc on mc.id=mci.collection_id where mci.media_asset_id=ma.id
        union all
        select jsonb_build_object('relation_table','proof_of_mind_concept_media','relation_id',pcm.id,'entity_type','proof_of_mind_concept','entity_id',pcm.concept_id,'entity_title',c.title,'placement',pcm.placement,'display_order',pcm.display_order,'is_featured',pcm.is_featured,'caption_override',pcm.caption_override,'alt_text_override',pcm.alt_text_override,'autoplay',pcm.autoplay,'muted',pcm.muted,'loop',pcm.loop,'editable',true) from public.proof_of_mind_concept_media pcm left join public.proof_of_mind_concepts c on c.id=pcm.concept_id where pcm.media_asset_id=ma.id
        union all
        select jsonb_build_object('relation_table','proof_of_mind_mockup_screens','relation_id',pms.id,'entity_type','proof_of_mind_mockup_screen','entity_id',pms.concept_id,'entity_title',c.title,'placement','mockup_screen','display_order',pms.display_order,'is_featured',false,'caption_override',null,'alt_text_override',pms.image_alt,'editable',true,'details',to_jsonb(pms)) from public.proof_of_mind_mockup_screens pms left join public.proof_of_mind_concepts c on c.id=pms.concept_id where pms.media_asset_id=ma.id
      ) linked
    ), '[]'::jsonb) || public.admin_media_asset_other_applications(ma.id),
    'concepts', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'slug',c.slug) order by c.title) from public.proof_of_mind_concepts c), '[]'::jsonb),
    'mockup_screens', coalesce((select jsonb_agg(to_jsonb(s) order by s.display_order,s.screen_name) from public.proof_of_mind_mockup_screens s where s.media_asset_id is null or s.media_asset_id=ma.id), '[]'::jsonb)
  ) into result from public.media_assets ma where ma.id=p_asset_id;
  if result is null then raise exception 'Media asset not found' using errcode='P0002'; end if;
  return result;
end $$;

create or replace function public.admin_save_media_asset_editor(p_asset_id uuid, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
  usage_keys text[]; controlled_tags text[]; supplied_tags text[]; relation jsonb; mockup jsonb;
begin
  if not (public.has_active_admin_access() or public.is_media_manager()) then
    raise exception 'Active admin or media-manager access required' using errcode='42501';
  end if;
  perform 1 from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'Media asset not found' using errcode='P0002'; end if;

  select coalesce(array_agg(value), '{}'::text[]) into usage_keys from jsonb_array_elements_text(coalesce(p_payload->'usage_type_keys','[]'));
  if exists(select 1 from unnest(usage_keys) k left join public.media_usage_types ut on ut.key=k and ut.is_active where ut.key is null) then
    raise exception 'Unknown or inactive media usage type' using errcode='22023';
  end if;
  mockup := p_payload->'mockup_screen';
  if 'mockup_screen'=any(usage_keys) and (mockup is null or nullif(mockup->>'concept_id','') is null) then
    raise exception 'Mockup screen usage requires a linked Proof of Mind screen' using errcode='23514';
  end if;

  select coalesce(array_agg(value), '{}'::text[]) into supplied_tags from jsonb_array_elements_text(coalesce(p_payload#>'{asset,tags}','[]'));
  select coalesce(array_agg(controlled_tag), '{}'::text[]) into controlled_tags from public.media_usage_types where key=any(usage_keys);
  supplied_tags := array(select distinct tag from unnest(supplied_tags || controlled_tags) tag where tag<>'' and tag not like 'usage:%' or tag=any(controlled_tags));

  update public.media_assets set
    title=nullif(p_payload#>>'{asset,title}',''), description=nullif(p_payload#>>'{asset,description}',''),
    alt_text=nullif(p_payload#>>'{asset,alt_text}',''), caption=nullif(p_payload#>>'{asset,caption}',''),
    language_code=nullif(p_payload#>>'{asset,language_code}',''), tags=supplied_tags,
    captured_at=nullif(p_payload#>>'{asset,captured_at}','')::timestamptz,
    visibility=p_payload#>>'{asset,visibility}', status=p_payload#>>'{asset,status}',
    published_at=nullif(p_payload#>>'{asset,published_at}','')::timestamptz,
    show_in_media_vault=coalesce((p_payload#>>'{asset,show_in_media_vault}')::boolean,false),
    updated_by=auth.uid(), updated_at=now()
  where id=p_asset_id;

  delete from public.media_asset_usage_types where media_asset_id=p_asset_id and not (usage_type_key=any(usage_keys));
  insert into public.media_asset_usage_types(media_asset_id,usage_type_key,created_by)
    select p_asset_id,k,auth.uid() from unnest(usage_keys) k on conflict do nothing;

  for relation in select value from jsonb_array_elements(coalesce(p_payload->'concept_media','[]')) loop
    update public.proof_of_mind_concept_media set
      placement=relation->>'placement', display_order=coalesce((relation->>'display_order')::int,0),
      is_featured=coalesce((relation->>'is_featured')::boolean,false),
      caption_override=nullif(relation->>'caption_override',''), alt_text_override=nullif(relation->>'alt_text_override',''),
      autoplay=coalesce((relation->>'autoplay')::boolean,false), muted=coalesce((relation->>'muted')::boolean,false), loop=coalesce((relation->>'loop')::boolean,false)
    where id=(relation->>'relation_id')::uuid and media_asset_id=p_asset_id;
    if not found then raise exception 'Concept media relation not found or does not belong to asset' using errcode='P0002'; end if;
  end loop;

  if mockup is not null and 'mockup_screen'=any(usage_keys) then
    if nullif(mockup->>'id','') is null then
      insert into public.proof_of_mind_mockup_screens(concept_id,media_asset_id,screen_name,screen_key,screen_purpose,primary_user_role,image_alt,image_status,display_order)
      values ((mockup->>'concept_id')::uuid,p_asset_id,mockup->>'screen_name',mockup->>'screen_key',nullif(mockup->>'screen_purpose',''),nullif(mockup->>'primary_user_role',''),nullif(mockup->>'image_alt',''),nullif(mockup->>'image_status',''),coalesce((mockup->>'display_order')::int,0));
    else
      update public.proof_of_mind_mockup_screens set concept_id=(mockup->>'concept_id')::uuid,media_asset_id=p_asset_id,
        screen_name=mockup->>'screen_name',screen_key=mockup->>'screen_key',screen_purpose=nullif(mockup->>'screen_purpose',''),primary_user_role=nullif(mockup->>'primary_user_role',''),image_alt=nullif(mockup->>'image_alt',''),image_status=nullif(mockup->>'image_status',''),display_order=coalesce((mockup->>'display_order')::int,0)
      where id=(mockup->>'id')::uuid and (media_asset_id is null or media_asset_id=p_asset_id);
      if not found then raise exception 'Mockup screen not found or does not belong to asset' using errcode='P0002'; end if;
    end if;
  elsif exists(select 1 from public.proof_of_mind_mockup_screens where media_asset_id=p_asset_id) then
    raise exception 'Unlink the existing mockup screen before removing its usage type' using errcode='23514';
  end if;
  return public.admin_get_media_asset_editor(p_asset_id);
end $$;

create or replace function public.admin_delete_media_asset(p_asset_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare applications jsonb;
begin
  if not (public.has_active_admin_access() or public.is_media_manager()) then raise exception 'Active admin or media-manager access required' using errcode='42501'; end if;
  applications := public.admin_get_media_asset_editor(p_asset_id)->'applications';
  if jsonb_array_length(applications)>0 then
    raise exception 'Media asset is still in use. Unlink these applications first: %', applications::text using errcode='23503', detail=applications::text;
  end if;
  delete from public.media_assets where id=p_asset_id;
  if not found then raise exception 'Media asset not found' using errcode='P0002'; end if;
  return jsonb_build_object('deleted',true,'asset_id',p_asset_id);
end $$;

-- Catalog and bootstrap the private admin surface through the shared 30-language registry.
insert into public.website_translation_keys
  (translation_key,namespace,description,default_text,value_type,is_required,is_active,interpolation_variables,supports_plural)
values
  ('admin.cancel', 'admin.media', 'Admin Media Vault UI key admin.cancel', 'Cancel', 'text', true, true, '{}', false),
  ('admin.delete', 'admin.media', 'Admin Media Vault UI key admin.delete', 'Delete', 'text', true, true, '{}', false),
  ('admin.loading.live_data', 'admin.media', 'Admin Media Vault UI key admin.loading.live_data', 'Loading live data…', 'text', true, true, '{}', false),
  ('admin.media.add_media', 'admin.media', 'Admin Media Vault UI key admin.media.add_media', 'Add media', 'text', true, true, '{}', false),
  ('admin.media.assets.count', 'admin.media', 'Admin Media Vault UI key admin.media.assets.count', '{count} assets', 'text', true, true, '{}', false),
  ('admin.media.category.badge', 'admin.media', 'Admin Media Vault UI key admin.media.category.badge', 'category', 'text', true, true, '{}', false),
  ('admin.media.category.founders', 'admin.media', 'Admin Media Vault UI key admin.media.category.founders', 'Founders', 'text', true, true, '{}', false),
  ('admin.media.category.journal_unlinked', 'admin.media', 'Admin Media Vault UI key admin.media.category.journal_unlinked', 'Journal unlinked', 'text', true, true, '{}', false),
  ('admin.media.category.journey_events', 'admin.media', 'Admin Media Vault UI key admin.media.category.journey_events', 'Journey events', 'text', true, true, '{}', false),
  ('admin.media.category.other', 'admin.media', 'Admin Media Vault UI key admin.media.category.other', 'Other', 'text', true, true, '{}', false),
  ('admin.media.concept.eyebrow', 'admin.media', 'Admin Media Vault UI key admin.media.concept.eyebrow', 'CONCEPT MEDIA', 'text', true, true, '{}', false),
  ('admin.media.delete_confirm', 'admin.media', 'Admin Media Vault UI key admin.media.delete_confirm', 'Delete this media file permanently? This cannot be undone.', 'text', true, true, '{}', false),
  ('admin.media.delete_error', 'admin.media', 'Admin Media Vault UI key admin.media.delete_error', 'Media delete failed.', 'text', true, true, '{}', false),
  ('admin.media.delete_success', 'admin.media', 'Admin Media Vault UI key admin.media.delete_success', 'Media deleted.', 'text', true, true, '{}', false),
  ('admin.media.description.grouped', 'admin.media', 'Admin Media Vault UI key admin.media.description.grouped', 'Footage grouped by journal post, offer, concept and media category.', 'text', true, true, '{}', false),
  ('admin.media.detail.empty', 'admin.media', 'Admin Media Vault UI key admin.media.detail.empty', 'No footage in this group.', 'text', true, true, '{}', false),
  ('admin.media.drawer.eyebrow', 'admin.media', 'Admin Media Vault UI key admin.media.drawer.eyebrow', 'FOOTAGE', 'text', true, true, '{}', false),
  ('admin.media.edit', 'admin.media', 'Admin Media Vault UI key admin.media.edit', 'Edit media', 'text', true, true, '{}', false),
  ('admin.media.editor.applications', 'admin.media', 'Admin Media Vault UI key admin.media.editor.applications', 'Linked applications', 'text', true, true, '{}', false),
  ('admin.media.editor.asset_type_help', 'admin.media', 'Admin Media Vault UI key admin.media.editor.asset_type_help', 'Technical asset type remains unchanged: {type}', 'text', true, true, '{}', false),
  ('admin.media.editor.concept', 'admin.media', 'Admin Media Vault UI key admin.media.editor.concept', 'Proof of Mind concept', 'text', true, true, '{}', false),
  ('admin.media.editor.delete_blocked', 'admin.media', 'Admin Media Vault UI key admin.media.editor.delete_blocked', 'This media asset is still in use. Unlink its applications first.', 'text', true, true, '{}', false),
  ('admin.media.editor.delete_confirm', 'admin.media', 'Admin Media Vault UI key admin.media.editor.delete_confirm', 'Delete this unused media asset permanently?', 'text', true, true, '{}', false),
  ('admin.media.editor.display_order', 'admin.media', 'Admin Media Vault UI key admin.media.editor.display_order', 'Display order', 'text', true, true, '{}', false),
  ('admin.media.editor.eyebrow', 'admin.media', 'Admin Media Vault UI key admin.media.editor.eyebrow', 'MEDIA ASSET', 'text', true, true, '{}', false),
  ('admin.media.editor.existing_mockup', 'admin.media', 'Admin Media Vault UI key admin.media.editor.existing_mockup', 'Existing or new screen', 'text', true, true, '{}', false),
  ('admin.media.editor.new_mockup', 'admin.media', 'Admin Media Vault UI key admin.media.editor.new_mockup', 'Create new screen', 'text', true, true, '{}', false),
  ('admin.media.editor.file_info', 'admin.media', 'Admin Media Vault UI key admin.media.editor.file_info', 'Read-only file information', 'text', true, true, '{}', false),
  ('admin.media.editor.load_error', 'admin.media', 'Admin Media Vault UI key admin.media.editor.load_error', 'Media could not be loaded.', 'text', true, true, '{}', false),
  ('admin.media.editor.metadata', 'admin.media', 'Admin Media Vault UI key admin.media.editor.metadata', 'General metadata', 'text', true, true, '{}', false),
  ('admin.media.editor.mockup', 'admin.media', 'Admin Media Vault UI key admin.media.editor.mockup', 'Mockup screen link', 'text', true, true, '{}', false),
  ('admin.media.editor.no_applications', 'admin.media', 'Admin Media Vault UI key admin.media.editor.no_applications', 'This asset is not currently linked.', 'text', true, true, '{}', false),
  ('admin.media.editor.save_error', 'admin.media', 'Admin Media Vault UI key admin.media.editor.save_error', 'Media could not be saved.', 'text', true, true, '{}', false),
  ('admin.media.editor.show_in_vault', 'admin.media', 'Admin Media Vault UI key admin.media.editor.show_in_vault', 'Show in Media Vault', 'text', true, true, '{}', false),
  ('admin.media.editor.tags', 'admin.media', 'Admin Media Vault UI key admin.media.editor.tags', 'Tags', 'text', true, true, '{}', false),
  ('admin.media.editor.title', 'admin.media', 'Admin Media Vault UI key admin.media.editor.title', 'Edit media', 'text', true, true, '{}', false),
  ('admin.media.editor.usage', 'admin.media', 'Admin Media Vault UI key admin.media.editor.usage', 'Functional usage', 'text', true, true, '{}', false),
  ('admin.media.empty', 'admin.media', 'Admin Media Vault UI key admin.media.empty', 'No media groups found.', 'text', true, true, '{}', false),
  ('admin.media.filter.all', 'admin.media', 'Admin Media Vault UI key admin.media.filter.all', 'All', 'text', true, true, '{}', false),
  ('admin.media.filter.concepts', 'admin.media', 'Admin Media Vault UI key admin.media.filter.concepts', 'Concepts', 'text', true, true, '{}', false),
  ('admin.media.filter.journal', 'admin.media', 'Admin Media Vault UI key admin.media.filter.journal', 'Journal', 'text', true, true, '{}', false),
  ('admin.media.filter.offers', 'admin.media', 'Admin Media Vault UI key admin.media.filter.offers', 'Offers', 'text', true, true, '{}', false),
  ('admin.media.groups.count', 'admin.media', 'Admin Media Vault UI key admin.media.groups.count', '{count} groups', 'text', true, true, '{}', false),
  ('admin.media.offer.badge', 'admin.media', 'Admin Media Vault UI key admin.media.offer.badge', 'offer', 'text', true, true, '{}', false),
  ('admin.media.offer.eyebrow', 'admin.media', 'Admin Media Vault UI key admin.media.offer.eyebrow', 'OFFER MEDIA', 'text', true, true, '{}', false),
  ('admin.media.open_concept', 'admin.media', 'Admin Media Vault UI key admin.media.open_concept', 'Open public concept', 'text', true, true, '{}', false),
  ('admin.media.open_offer', 'admin.media', 'Admin Media Vault UI key admin.media.open_offer', 'Open public offer', 'text', true, true, '{}', false),
  ('admin.media.search.placeholder', 'admin.media', 'Admin Media Vault UI key admin.media.search.placeholder', 'Search media groups…', 'text', true, true, '{}', false),
  ('admin.media.title', 'admin.media', 'Admin Media Vault UI key admin.media.title', 'Media Vault', 'text', true, true, '{}', false),
  ('admin.media.upload_error', 'admin.media', 'Admin Media Vault UI key admin.media.upload_error', 'Media upload failed.', 'text', true, true, '{}', false),
  ('admin.media.upload_success', 'admin.media', 'Admin Media Vault UI key admin.media.upload_success', 'Media uploaded.', 'text', true, true, '{}', false),
  ('admin.media.uploading', 'admin.media', 'Admin Media Vault UI key admin.media.uploading', 'Uploading media…', 'text', true, true, '{}', false),
  ('admin.records.empty', 'admin.media', 'Admin Media Vault UI key admin.records.empty', 'No records found.', 'text', true, true, '{}', false),
  ('admin.refresh', 'admin.media', 'Admin Media Vault UI key admin.refresh', 'Refresh', 'text', true, true, '{}', false),
  ('admin.save', 'admin.media', 'Admin Media Vault UI key admin.save', 'Save', 'text', true, true, '{}', false),
  ('admin.saving', 'admin.media', 'Admin Media Vault UI key admin.saving', 'Saving…', 'text', true, true, '{}', false),
  ('admin.section.eyebrow', 'admin.media', 'Admin Media Vault UI key admin.section.eyebrow', 'ADMIN SECTION', 'text', true, true, '{}', false)
on conflict (translation_key) do update set default_text=excluded.default_text,description=excluded.description,is_active=true,updated_at=now();

insert into public.website_translations
  (translation_key_id,language_code,translated_text,translation_status,translation_source,translated_at,reviewed_at,published_at)
select k.id,sl.code,k.default_text,'published','manual',now(),now(),now()
from public.website_translation_keys k cross join public.site_languages sl
where k.translation_key = any(array['admin.media.editor.existing_mockup', 'admin.media.editor.new_mockup', 'admin.cancel', 'admin.delete', 'admin.loading.live_data', 'admin.media.add_media', 'admin.media.assets.count', 'admin.media.category.badge', 'admin.media.category.founders', 'admin.media.category.journal_unlinked', 'admin.media.category.journey_events', 'admin.media.category.other', 'admin.media.concept.eyebrow', 'admin.media.delete_confirm', 'admin.media.delete_error', 'admin.media.delete_success', 'admin.media.description.grouped', 'admin.media.detail.empty', 'admin.media.drawer.eyebrow', 'admin.media.edit', 'admin.media.editor.applications', 'admin.media.editor.asset_type_help', 'admin.media.editor.concept', 'admin.media.editor.delete_blocked', 'admin.media.editor.delete_confirm', 'admin.media.editor.display_order', 'admin.media.editor.eyebrow', 'admin.media.editor.file_info', 'admin.media.editor.load_error', 'admin.media.editor.metadata', 'admin.media.editor.mockup', 'admin.media.editor.no_applications', 'admin.media.editor.save_error', 'admin.media.editor.show_in_vault', 'admin.media.editor.tags', 'admin.media.editor.title', 'admin.media.editor.usage', 'admin.media.empty', 'admin.media.filter.all', 'admin.media.filter.concepts', 'admin.media.filter.journal', 'admin.media.filter.offers', 'admin.media.groups.count', 'admin.media.offer.badge', 'admin.media.offer.eyebrow', 'admin.media.open_concept', 'admin.media.open_offer', 'admin.media.search.placeholder', 'admin.media.title', 'admin.media.upload_error', 'admin.media.upload_success', 'admin.media.uploading', 'admin.records.empty', 'admin.refresh', 'admin.save', 'admin.saving', 'admin.section.eyebrow']) and sl.is_active=true
on conflict (translation_key_id,language_code) do update set translated_text=excluded.translated_text,translation_status='published',translated_at=now(),reviewed_at=now(),published_at=now(),updated_at=now();

insert into public.website_ui_component_translation_keys(component_id,translation_key_id,usage_kind,is_required)
select c.id,k.id,'label',true from public.website_ui_components c cross join public.website_translation_keys k
where c.component_key='admin.media_vault.page' and k.translation_key = any(array['admin.media.editor.existing_mockup', 'admin.media.editor.new_mockup', 'admin.cancel', 'admin.delete', 'admin.loading.live_data', 'admin.media.add_media', 'admin.media.assets.count', 'admin.media.category.badge', 'admin.media.category.founders', 'admin.media.category.journal_unlinked', 'admin.media.category.journey_events', 'admin.media.category.other', 'admin.media.concept.eyebrow', 'admin.media.delete_confirm', 'admin.media.delete_error', 'admin.media.delete_success', 'admin.media.description.grouped', 'admin.media.detail.empty', 'admin.media.drawer.eyebrow', 'admin.media.edit', 'admin.media.editor.applications', 'admin.media.editor.asset_type_help', 'admin.media.editor.concept', 'admin.media.editor.delete_blocked', 'admin.media.editor.delete_confirm', 'admin.media.editor.display_order', 'admin.media.editor.eyebrow', 'admin.media.editor.file_info', 'admin.media.editor.load_error', 'admin.media.editor.metadata', 'admin.media.editor.mockup', 'admin.media.editor.no_applications', 'admin.media.editor.save_error', 'admin.media.editor.show_in_vault', 'admin.media.editor.tags', 'admin.media.editor.title', 'admin.media.editor.usage', 'admin.media.empty', 'admin.media.filter.all', 'admin.media.filter.concepts', 'admin.media.filter.journal', 'admin.media.filter.offers', 'admin.media.groups.count', 'admin.media.offer.badge', 'admin.media.offer.eyebrow', 'admin.media.open_concept', 'admin.media.open_offer', 'admin.media.search.placeholder', 'admin.media.title', 'admin.media.upload_error', 'admin.media.upload_success', 'admin.media.uploading', 'admin.records.empty', 'admin.refresh', 'admin.save', 'admin.saving', 'admin.section.eyebrow'])
on conflict (component_id,translation_key_id) do nothing;

revoke all on function public.admin_get_media_asset_editor(uuid) from public;
revoke all on function public.admin_media_asset_other_applications(uuid) from public;
revoke all on function public.admin_save_media_asset_editor(uuid,jsonb) from public;
revoke all on function public.admin_delete_media_asset(uuid) from public;
grant execute on function public.admin_get_media_asset_editor(uuid) to authenticated;
grant execute on function public.admin_media_asset_other_applications(uuid) to authenticated;
grant execute on function public.admin_save_media_asset_editor(uuid,jsonb) to authenticated;
grant execute on function public.admin_delete_media_asset(uuid) to authenticated;

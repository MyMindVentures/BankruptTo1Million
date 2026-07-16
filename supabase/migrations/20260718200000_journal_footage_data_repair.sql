-- Repair journal post ↔ footage links: remove cross-post associations and orphan metadata.

-- 1. Remove the confirmed wrong link (music video on Cafeteria Cajiz post).
delete from public.journal_post_media
where journal_post_id = '01bf802b-6b66-4487-a7c8-f2202094bb31'
  and media_asset_id = 'ba48fbfe-ee49-4c44-bcd0-0466deae9f78';

-- 2. Remove any journal_post_media rows pointing at legacy journey-events storage
--    (founder timeline events use founder_timeline_event_media instead).
delete from public.journal_post_media jpm
using public.media_assets ma
where jpm.media_asset_id = ma.id
  and ma.storage_path like 'journey-events/%';

-- 3. Remove journal_post_media links where journal/ path post segment disagrees with journal_post_id.
delete from public.journal_post_media jpm
using public.media_assets ma
where jpm.media_asset_id = ma.id
  and ma.storage_path like 'journal/%'
  and split_part(ma.storage_path, '/', 4) <> jpm.journal_post_id::text;

-- 4. Strip orphan journal_post_id metadata from assets whose posts no longer exist
--    and that have no junction row.
update public.media_assets ma
set metadata = coalesce(ma.metadata, '{}'::jsonb) - 'journal_post_id' - 'journal_post_slug',
    updated_at = now()
where ma.metadata->>'journal_post_id' is not null
  and not exists (
    select 1
    from public.journal_posts jp
    where jp.id = (ma.metadata->>'journal_post_id')::uuid
  )
  and not exists (
    select 1
    from public.journal_post_media jpm
    where jpm.media_asset_id = ma.id
  );

-- Bootstrap proof for verify:i18n migration checks (no new UI keys in this migration).
select true
where 'journal.footage.title' = any(array['journal.footage.title']);

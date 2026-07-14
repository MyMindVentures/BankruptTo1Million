insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photo-frames', 'photo-frames', true, 15728640, array['image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Media managers upload photo frames" on storage.objects;
create policy "Media managers upload photo frames"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photo-frames' and is_media_manager());

drop policy if exists "Media managers update photo frames" on storage.objects;
create policy "Media managers update photo frames"
on storage.objects for update
to authenticated
using (bucket_id = 'photo-frames' and is_media_manager())
with check (bucket_id = 'photo-frames' and is_media_manager());

drop policy if exists "Media managers delete photo frames" on storage.objects;
create policy "Media managers delete photo frames"
on storage.objects for delete
to authenticated
using (bucket_id = 'photo-frames' and is_media_manager());

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('founder_support.qr.download_photo_frame', 'founder_support', 'Label for the localized photo-frame download button', 'Download photo frame', 'text', true, true, '{}', false),
  ('founder_support.qr.downloading_photo_frame', 'founder_support', 'Loading label for the localized photo-frame download button', 'Downloading photo frame…', 'text', true, true, '{}', false),
  ('founder_support.qr.photo_frame_download_failed', 'founder_support', 'Error shown when the localized photo frame cannot be downloaded', 'The photo frame could not be downloaded.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

with translations(translation_key, language_code, translated_text) as (
  values
    ('founder_support.qr.download_photo_frame','en','Download photo frame'),
    ('founder_support.qr.download_photo_frame','nl','Fotoframe downloaden'),
    ('founder_support.qr.download_photo_frame','fr','Télécharger le cadre photo'),
    ('founder_support.qr.download_photo_frame','de','Fotorahmen herunterladen'),
    ('founder_support.qr.download_photo_frame','es','Descargar marco de fotos'),
    ('founder_support.qr.download_photo_frame','pt','Baixar moldura de foto'),
    ('founder_support.qr.download_photo_frame','it','Scarica la cornice fotografica'),
    ('founder_support.qr.download_photo_frame','pl','Pobierz ramkę do zdjęcia'),
    ('founder_support.qr.download_photo_frame','cs','Stáhnout fotorámeček'),
    ('founder_support.qr.download_photo_frame','tr','Fotoğraf çerçevesini indir'),
    ('founder_support.qr.download_photo_frame','ar','تنزيل إطار الصورة'),
    ('founder_support.qr.download_photo_frame','hi','फोटो फ्रेम डाउनलोड करें'),
    ('founder_support.qr.download_photo_frame','zh','下载照片边框'),
    ('founder_support.qr.download_photo_frame','ja','フォトフレームをダウンロード'),
    ('founder_support.qr.download_photo_frame','ko','포토 프레임 다운로드'),
    ('founder_support.qr.downloading_photo_frame','en','Downloading photo frame…'),
    ('founder_support.qr.downloading_photo_frame','nl','Fotoframe downloaden…'),
    ('founder_support.qr.downloading_photo_frame','fr','Téléchargement du cadre photo…'),
    ('founder_support.qr.downloading_photo_frame','de','Fotorahmen wird heruntergeladen…'),
    ('founder_support.qr.downloading_photo_frame','es','Descargando marco de fotos…'),
    ('founder_support.qr.downloading_photo_frame','pt','Baixando moldura de foto…'),
    ('founder_support.qr.downloading_photo_frame','it','Download della cornice fotografica…'),
    ('founder_support.qr.downloading_photo_frame','pl','Pobieranie ramki do zdjęcia…'),
    ('founder_support.qr.downloading_photo_frame','cs','Stahování fotorámečku…'),
    ('founder_support.qr.downloading_photo_frame','tr','Fotoğraf çerçevesi indiriliyor…'),
    ('founder_support.qr.downloading_photo_frame','ar','جارٍ تنزيل إطار الصورة…'),
    ('founder_support.qr.downloading_photo_frame','hi','फोटो फ्रेम डाउनलोड हो रहा है…'),
    ('founder_support.qr.downloading_photo_frame','zh','正在下载照片边框…'),
    ('founder_support.qr.downloading_photo_frame','ja','フォトフレームをダウンロード中…'),
    ('founder_support.qr.downloading_photo_frame','ko','포토 프레임 다운로드 중…'),
    ('founder_support.qr.photo_frame_download_failed','en','The photo frame could not be downloaded.'),
    ('founder_support.qr.photo_frame_download_failed','nl','Het fotoframe kon niet worden gedownload.'),
    ('founder_support.qr.photo_frame_download_failed','fr','Le cadre photo n’a pas pu être téléchargé.'),
    ('founder_support.qr.photo_frame_download_failed','de','Der Fotorahmen konnte nicht heruntergeladen werden.'),
    ('founder_support.qr.photo_frame_download_failed','es','No se pudo descargar el marco de fotos.'),
    ('founder_support.qr.photo_frame_download_failed','pt','Não foi possível baixar a moldura de foto.'),
    ('founder_support.qr.photo_frame_download_failed','it','Non è stato possibile scaricare la cornice fotografica.'),
    ('founder_support.qr.photo_frame_download_failed','pl','Nie udało się pobrać ramki do zdjęcia.'),
    ('founder_support.qr.photo_frame_download_failed','cs','Fotorámeček se nepodařilo stáhnout.'),
    ('founder_support.qr.photo_frame_download_failed','tr','Fotoğraf çerçevesi indirilemedi.'),
    ('founder_support.qr.photo_frame_download_failed','ar','تعذر تنزيل إطار الصورة.'),
    ('founder_support.qr.photo_frame_download_failed','hi','फोटो फ्रेम डाउनलोड नहीं किया जा सका।'),
    ('founder_support.qr.photo_frame_download_failed','zh','无法下载照片边框。'),
    ('founder_support.qr.photo_frame_download_failed','ja','フォトフレームをダウンロードできませんでした。'),
    ('founder_support.qr.photo_frame_download_failed','ko','포토 프레임을 다운로드할 수 없습니다.')
), resolved as (
  select k.id as translation_key_id, t.language_code, t.translated_text
  from translations t
  join public.website_translation_keys k on k.translation_key = t.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    translation_source = 'manual',
    translated_at = now(),
    reviewed_at = now(),
    published_at = now(),
    updated_at = now();

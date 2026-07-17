-- Relink founder/journal author avatars to files that exist in media-images storage.

update public.founder_profiles
set
  avatar_url = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/kevin/founders-3.png',
  updated_at = now()
where slug = 'kevin-de-vlieger'
  and (
    avatar_url is distinct from 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/kevin/founders-3.png'
  );

update public.founder_profiles
set
  avatar_url = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/micha/founders-1.png',
  updated_at = now()
where slug = 'micha'
  and (
    avatar_url is distinct from 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/micha/founders-1.png'
  );

update public.journal_authors
set
  avatar_url = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/kevin/founders-3.png',
  updated_at = now()
where slug = 'kevin-de-vlieger'
  and (
    avatar_url is distinct from 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/kevin/founders-3.png'
  );

update public.journal_authors
set
  avatar_url = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/micha/founders-1.png',
  updated_at = now()
where slug = 'micha'
  and (
    avatar_url is distinct from 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/founders/micha/founders-1.png'
  );

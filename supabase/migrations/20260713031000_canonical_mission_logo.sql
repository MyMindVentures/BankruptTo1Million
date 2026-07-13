do $$
begin
  if to_regclass('public.website_media_slots') is not null then
    update public.website_media_slots
    set storage_bucket = 'media-images',
        storage_path = 'branding/branding/logos/b1m_logo.png',
        alt_text = 'Bankrupt to 1 Million logo',
        updated_at = now()
    where slot_key = 'site_logo';
  end if;
end $$;

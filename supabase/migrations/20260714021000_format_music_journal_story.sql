update public.journal_posts
set
  body = E'Kevin spent almost **ten hours nonstop** on his tablet shaping the **Bankrupt to 1 Million website**. He created posts, refined features and wrestled with **ChatGPT, MCP and Supabase**.\n\nOnly around **23:00**, after **Super Heavy Sound** had already been playing for quite some time, did he finally put the tablet aside and walk to **Chiringuito La Negra in Benajarafe**.\n\nThe music was genuinely outstanding. The groove was infectious, the musicianship was top level and the atmosphere was exactly what Kevin needed after such an intense day.\n\nThis was not a planned night out. It became a **well-earned moment to breathe, relax and recharge** before continuing the mission.\n\n> Super music. An incredible vibe. Musically top.',
  excerpt = 'After almost ten nonstop hours shaping Bankrupt to 1 Million, Kevin finally closed his tablet and found the perfect release in live funk, soul and groove.',
  seo_title = 'Ten Hours Building Bankrupt to 1 Million, Then Live Music in Benajarafe',
  seo_description = 'After ten hours building the Bankrupt to 1 Million website with ChatGPT, MCP and Supabase, Kevin recharged at Chiringuito La Negra in Benajarafe.',
  reading_time_minutes = 2,
  updated_at = now()
where slug = 'a-well-earned-moment-of-music-after-ten-hours-of-building';

-- Media assets can be linked without hardcoding URLs in the article.
-- The frontend recognizes these metadata keys and always resolves the public URL from storage_bucket + storage_path.
update public.media_assets
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'journal_post_slug', 'a-well-earned-moment-of-music-after-ten-hours-of-building'
)
where visibility = 'public'
  and status = 'published'
  and (
    lower(coalesce(title, '')) like any (array['%chiringuito la negra%','%super heavy sound%','%la negra%'])
    or lower(coalesce(description, '')) like any (array['%chiringuito la negra%','%super heavy sound%','%la negra%'])
    or lower(coalesce(caption, '')) like any (array['%chiringuito la negra%','%super heavy sound%','%la negra%'])
    or lower(coalesce(metadata->>'location', '')) like any (array['%chiringuito la negra%','%benajarafe%'])
  );
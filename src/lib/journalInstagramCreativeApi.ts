const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';

function token() {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) throw new Error('No valid admin session.');
  const parsed = JSON.parse(raw) as { access_token?: string };
  if (!parsed.access_token) throw new Error('No valid admin session.');
  return parsed.access_token;
}

async function invoke<T>(slug: string, body: Record<string, unknown>): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');
  const response = await fetch(`${supabaseUrl}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as ({ ok?: boolean; error?: string } & T) | null;
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Instagram creative request failed (${response.status}).`);
  }
  return payload as T;
}

export function generateJournalInstagramImage(postId: string, sourceMediaAssetId: string) {
  return invoke<{ creative_id: string; status: string }>('generate-journal-instagram-image', {
    post_id: postId,
    source_media_asset_id: sourceMediaAssetId,
  });
}

export function generateJournalInstagramCaption(creativeId: string) {
  return invoke<{ creative_id: string; status: string; hook_text?: string; caption_instagram_feed?: string }>(
    'generate-journal-instagram-caption',
    { creative_id: creativeId },
  );
}

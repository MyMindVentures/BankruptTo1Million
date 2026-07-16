const SUPABASE_URL = 'https://zlwwncmbxohnezotomcx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const WORKER_SECRET = process.env.JOURNAL_AI_WORKER_SECRET;
const postIds = [
  '2993d0ee-b22b-42b2-a737-ff6c4217d527',
];

if (!WORKER_SECRET) {
  console.error('Set JOURNAL_AI_WORKER_SECRET');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

function workerHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
    'x-journal-ai-worker-secret': WORKER_SECRET,
  };
}

async function invokeThankYou(postId) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-journal-venue-thank-you`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({ post_id: postId }),
  });
  return {
    postId,
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

const pending = new Set(postIds);

for (let round = 1; round <= 40 && pending.size; round += 1) {
  for (const postId of [...pending]) {
    const result = await invokeThankYou(postId);
    console.log(`round ${round}`, JSON.stringify(result));
    if (result.status !== 200 || result.body?.error) {
      console.warn(`Retryable failure for ${postId}:`, result.body?.error || result.status);
      continue;
    }
    if (result.body?.complete === true || (result.body?.skipped === true && result.body?.reason !== 'place_context_not_completed')) {
      pending.delete(postId);
    }
  }
  if (pending.size) await new Promise((resolve) => setTimeout(resolve, 2500));
}

if (pending.size) {
  console.error('Backfill incomplete for:', [...pending]);
  process.exit(1);
}

console.log('Venue thank-you backfill complete for all posts.');

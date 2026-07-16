const SUPABASE_URL = 'https://zlwwncmbxohnezotomcx.supabase.co';
const WORKER_SECRET = process.env.JOURNAL_AI_WORKER_SECRET;
const postIds = [
  '400736f3-9730-4183-bc29-1100b7337203',
  '01bf802b-6b66-4487-a7c8-f2202094bb31',
];

if (!WORKER_SECRET) {
  console.error('Set JOURNAL_AI_WORKER_SECRET');
  process.exit(1);
}

async function invokePlace(postId) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-journal-place-context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-journal-ai-worker-secret': WORKER_SECRET,
    },
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
    const result = await invokePlace(postId);
    console.log(`round ${round}`, JSON.stringify(result));
    if (result.status !== 200 || result.body?.error) {
      console.warn(`Retryable failure for ${postId}:`, result.body?.error || result.status);
      continue;
    }
    if (result.body?.complete === true || result.body?.skipped === true) {
      pending.delete(postId);
    }
  }
  if (pending.size) await new Promise((resolve) => setTimeout(resolve, 2500));
}

if (pending.size) {
  console.error('Backfill incomplete for:', [...pending]);
  process.exit(1);
}

console.log('Backfill complete for all posts.');

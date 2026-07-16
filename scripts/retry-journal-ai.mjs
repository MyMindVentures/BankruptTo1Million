const POST_ID = '400736f3-9730-4183-bc29-1100b7337203';
const SUPABASE_URL = 'https://zlwwncmbxohnezotomcx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsd3duY21ieG9obmV6b3RvbWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjExNzMsImV4cCI6MjA5OTMzNzE3M30.q-TpOAApyLVm2MylUFoG4DvT5Ey6USK05cmjTF97ssY';
const ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Set ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

async function getStatus() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_get_journal_ai_status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ post_id: POST_ID }),
  });
  const rows = await res.json();
  return rows[0];
}

async function invokeGeneration() {
  console.log('Invoking generate-journal-ai-post…');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25 * 60 * 1000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-journal-ai-post`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: POST_ID }),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    console.log('Edge response status:', res.status);
    console.log('Edge response body:', JSON.stringify(body, null, 2));
    return { ok: res.ok, body };
  } finally {
    clearTimeout(timer);
  }
}

async function invokePlaceContext() {
  console.log('Invoking generate-journal-place-context…');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-journal-place-context`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ post_id: POST_ID }),
  });
  const body = await res.json().catch(() => null);
  console.log('Place context status:', res.status, JSON.stringify(body, null, 2));
}

async function pollUntilDone(maxMinutes = 25) {
  const deadline = Date.now() + maxMinutes * 60 * 1000;
  let sawProcessing = false;
  let lastCount = -1;

  await new Promise((r) => setTimeout(r, 3000));

  while (Date.now() < deadline) {
    const status = await getStatus();
    if (!status) throw new Error('No status returned');

    if (status.generation_status === 'processing') sawProcessing = true;
    if (Number(status.translation_count) !== lastCount) {
      lastCount = Number(status.translation_count);
      sawProcessing = true;
    }

    console.log(
      `[${new Date().toISOString()}] gen=${status.generation_status} post=${status.status} translations=${status.translation_count}/${status.expected_translation_count}`,
    );

    if (status.generation_status === 'failed' && sawProcessing) {
      throw new Error(status.last_error || 'Generation failed');
    }

    if (
      status.generation_status === 'completed'
      && status.status === 'published'
      && Number(status.translation_count) === Number(status.expected_translation_count)
    ) {
      return status;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Polling timed out');
}

const invokePromise = invokeGeneration();

try {
  await pollUntilDone();
} catch (err) {
  console.error('Poll error (edge may still be running):', err.message);
}

try {
  await invokePromise;
} catch (err) {
  console.error('Invoke error:', err.message);
}

const finalStatus = await getStatus();
console.log('Final status:', JSON.stringify(finalStatus, null, 2));

if (
  finalStatus?.generation_status === 'completed'
  && finalStatus?.status === 'published'
) {
  await invokePlaceContext();
}

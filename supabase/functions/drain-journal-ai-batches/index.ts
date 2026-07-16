import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

async function authenticate(req: Request) {
  const supplied = req.headers.get("x-journal-ai-worker-secret");
  const { data, error } = await supabase.rpc("get_journal_ai_worker_secret");
  if (error || !supplied || supplied !== data) throw new Error("Unauthorized");
  return supplied;
}

function workerHeaders(secret: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SUPABASE_ANON_KEY ?? SERVICE_ROLE_KEY,
    "x-journal-ai-worker-secret": secret,
  };
}

async function invokeEdgeFunction(slug: string, secret: string, postId: string, worker: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: workerHeaders(secret),
    body: JSON.stringify({ post_id: postId }),
  });
  return {
    post_id: postId,
    worker,
    status: response.status,
    body: await response.json().catch(() => ({})),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const secret = await authenticate(req);
    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body.limit ?? 3), 5));

    const { data: recoveredPosts, error: recoveryError } = await supabase.rpc(
      "recover_stale_journal_ai_generation",
      { p_stale_minutes: 5 },
    );
    if (recoveryError) throw recoveryError;

    const { data: recoveredPlaceContext, error: placeRecoveryError } = await supabase.rpc(
      "recover_stale_journal_place_context_generation",
      { p_stale_minutes: 5 },
    );
    if (placeRecoveryError) throw placeRecoveryError;

    const { data: recoveredVenueThankYou, error: thankYouRecoveryError } = await supabase.rpc(
      "recover_stale_journal_venue_thank_you_generation",
      { p_stale_minutes: 5 },
    );
    if (thankYouRecoveryError) throw thankYouRecoveryError;

    const { data: posts, error } = await supabase.rpc("list_journal_ai_posts_needing_batch", {
      p_limit: limit,
    });
    if (error) throw error;

    const results: unknown[] = [];
    for (const row of (posts ?? []) as Array<{ journal_post_id: string; translation_count: number; expected_count: number }>) {
      try {
        results.push(await invokeEdgeFunction("generate-journal-ai-post", secret, row.journal_post_id, "journal_ai_post"));
      } catch (invokeError) {
        results.push({
          post_id: row.journal_post_id,
          worker: "journal_ai_post",
          status: 500,
          error: invokeError instanceof Error ? invokeError.message : String(invokeError),
        });
      }
    }

    const placeLimit = Math.max(1, Math.min(Number(body.place_context_limit ?? 1), 2));
    const { data: placePosts, error: placeError } = await supabase.rpc(
      "list_journal_place_context_needing_batch",
      { p_limit: placeLimit },
    );
    if (placeError) throw placeError;

    for (const row of (placePosts ?? []) as Array<{ journal_post_id: string }>) {
      try {
        results.push(await invokeEdgeFunction("generate-journal-place-context", secret, row.journal_post_id, "place_context"));
      } catch (invokeError) {
        results.push({
          post_id: row.journal_post_id,
          worker: "place_context",
          status: 500,
          error: invokeError instanceof Error ? invokeError.message : String(invokeError),
        });
      }
    }

    const thankYouLimit = Math.max(1, Math.min(Number(body.venue_thank_you_limit ?? 2), 3));
    const { data: thankYouPosts, error: thankYouError } = await supabase.rpc(
      "list_journal_venue_thank_you_needing_batch",
      { p_limit: thankYouLimit },
    );
    if (thankYouError) throw thankYouError;

    for (const row of (thankYouPosts ?? []) as Array<{ journal_post_id: string }>) {
      try {
        results.push(await invokeEdgeFunction("generate-journal-venue-thank-you", secret, row.journal_post_id, "venue_thank_you"));
      } catch (invokeError) {
        results.push({
          post_id: row.journal_post_id,
          worker: "venue_thank_you",
          status: 500,
          error: invokeError instanceof Error ? invokeError.message : String(invokeError),
        });
      }
    }

    return json({
      ok: true,
      recovered: recoveredPosts ?? 0,
      recovered_place_context: recoveredPlaceContext ?? 0,
      recovered_venue_thank_you: recoveredVenueThankYou ?? 0,
      processed: results.length,
      results,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

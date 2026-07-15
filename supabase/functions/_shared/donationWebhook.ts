import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export function serviceDb() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase service configuration.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function markDonationSucceeded(
  db: SupabaseClient,
  input: {
    donationId: string;
    idempotencyKey: string;
    providerPaymentId?: string | null;
    providerCheckoutId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const { data, error } = await db.rpc("record_donation_provider_event", {
    p_idempotency_key: input.idempotencyKey,
    p_donation_id: input.donationId,
    p_event_type: "webhook_received",
    p_payload: input.payload ?? {},
    p_new_status: "succeeded",
    p_provider_checkout_id: input.providerCheckoutId ?? null,
    p_provider_payment_id: input.providerPaymentId ?? null,
  });

  if (error) throw error;
  return data;
}

export async function resolveDonationId(
  db: SupabaseClient,
  input: {
    donationId?: string | null;
    providerCheckoutId?: string | null;
    providerPaymentId?: string | null;
    providerSlug: string;
  },
) {
  if (input.donationId) return input.donationId;

  if (input.providerCheckoutId) {
    const { data, error } = await db
      .from("donations")
      .select("id")
      .eq("provider_slug", input.providerSlug)
      .eq("provider_checkout_id", input.providerCheckoutId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  if (input.providerPaymentId) {
    const { data, error } = await db
      .from("donations")
      .select("id")
      .eq("provider_slug", input.providerSlug)
      .eq("provider_payment_id", input.providerPaymentId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  return null;
}

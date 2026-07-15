import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, markDonationSucceeded, resolveDonationId, serviceDb } from "../_shared/donationWebhook.ts";

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  ) as Record<string, string>;

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return json({ error: "Stripe webhook secret is not configured." }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing Stripe signature." }, 400);
  }

  const payload = await req.text();
  const valid = await verifyStripeSignature(payload, signature, secret);
  if (!valid) {
    return json({ error: "Invalid Stripe signature." }, 400);
  }

  const event = JSON.parse(payload) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };

  if (!["checkout.session.completed", "payment_intent.succeeded"].includes(event.type)) {
    return json({ received: true, ignored: event.type });
  }

  const object = event.data.object;
  const metadata = (object.metadata as Record<string, string> | undefined) ?? {};
  const donationId = metadata.donation_id || (object.client_reference_id as string | undefined) || null;
  const providerCheckoutId = (object.id as string | undefined) ?? null;
  const providerPaymentId = (object.payment_intent as string | undefined) ?? providerCheckoutId;

  const db = serviceDb();
  const resolvedDonationId = await resolveDonationId(db, {
    donationId,
    providerCheckoutId: event.type === "checkout.session.completed" ? providerCheckoutId : null,
    providerPaymentId: event.type === "payment_intent.succeeded" ? providerCheckoutId : providerPaymentId,
    providerSlug: "stripe",
  });

  if (!resolvedDonationId) {
    return json({ error: "Donation could not be resolved from Stripe event." }, 404);
  }

  await markDonationSucceeded(db, {
    donationId: resolvedDonationId,
    idempotencyKey: `stripe:${event.id}`,
    providerCheckoutId: event.type === "checkout.session.completed" ? providerCheckoutId : null,
    providerPaymentId,
    payload: {
      event_type: event.type,
      stripe_event_id: event.id,
    },
  });

  return json({ received: true, donation_id: resolvedDonationId, status: "succeeded" });
});

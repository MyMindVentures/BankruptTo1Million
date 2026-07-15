import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, markDonationSucceeded, resolveDonationId, serviceDb } from "../_shared/donationWebhook.ts";

function isUuid(value: string | null | undefined) {
  return !!value && /^[0-9a-f-]{36}$/i.test(value);
}

function readDonationIdFromPayPal(event: Record<string, unknown>) {
  const resource = (event.resource as Record<string, unknown> | undefined) ?? {};
  const customId = resource.custom_id as string | undefined;
  return isUuid(customId) ? customId : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    return json({ error: "PayPal webhook id is not configured." }, 500);
  }

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const transmissionSig = req.headers.get("paypal-transmission-sig");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return json({ error: "Missing PayPal verification headers." }, 400);
  }

  const payload = await req.json() as Record<string, unknown>;
  const eventType = String(payload.event_type ?? "");
  const eventId = String(payload.id ?? transmissionId);

  if (!["PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.APPROVED", "PAYMENT.SALE.COMPLETED"].includes(eventType)) {
    return json({ received: true, ignored: eventType });
  }

  const resource = (payload.resource as Record<string, unknown> | undefined) ?? {};
  const donationHint = readDonationIdFromPayPal(payload);
  const providerPaymentId = (resource.id as string | undefined) ?? null;
  const providerCheckoutId = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)
    ?.related_ids?.order_id ?? null;

  const db = serviceDb();
  const resolvedDonationId = await resolveDonationId(db, {
    donationId: donationHint,
    providerCheckoutId,
    providerPaymentId,
    providerSlug: "paypal",
  });

  if (!resolvedDonationId) {
    return json({ error: "Donation could not be resolved from PayPal event." }, 404);
  }

  await markDonationSucceeded(db, {
    donationId: resolvedDonationId,
    idempotencyKey: `paypal:${eventId}`,
    providerCheckoutId,
    providerPaymentId,
    payload: {
      event_type: eventType,
      paypal_event_id: eventId,
    },
  });

  return json({ received: true, donation_id: resolvedDonationId, status: "succeeded" });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();

const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function validateCoords(latitude: unknown, longitude: unknown) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("latitude and longitude are required");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Invalid coordinates");
  }
  return { lat, lng };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng } = validateCoords(body.latitude, body.longitude);
    const key = cacheKey(lat, lng);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return out({ ...cached.payload, cached: true });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Weather provider ${response.status}`);
    }

    const payload = await response.json();
    const current = payload?.current;
    if (!current) throw new Error("Weather data unavailable");

    const result = {
      latitude: lat,
      longitude: lng,
      observed_at: current.time ?? null,
      temperature_c: current.temperature_2m ?? null,
      apparent_temperature_c: current.apparent_temperature ?? null,
      humidity_percent: current.relative_humidity_2m ?? null,
      wind_speed_kmh: current.wind_speed_10m ?? null,
      weather_code: current.weather_code ?? null,
      timezone: payload?.timezone ?? null,
      cached: false,
    };

    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload: result });
    return out(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return out({ error: message }, 400);
  }
});

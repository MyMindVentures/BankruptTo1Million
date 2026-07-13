const routingBaseUrl = (process.env.ROUTING_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const routingCacheTtlMs = Number(process.env.ROUTING_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const routingCache = new Map();

function sendJson(response, status, payload, cacheControl = 'no-cache') {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
  });
  response.end(JSON.stringify(payload));
}

function normalizeCoordinates(raw) {
  if (!Array.isArray(raw)) return [];
  const normalized = [];
  for (const value of raw) {
    if (!Array.isArray(value) || value.length !== 2) continue;
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;
    const previous = normalized.at(-1);
    if (!previous || previous[0] !== longitude || previous[1] !== latitude) normalized.push([longitude, latitude]);
  }
  return normalized;
}

function cacheKey(profile, coordinates) {
  return `${profile}:${coordinates.map(([longitude, latitude]) => `${longitude.toFixed(5)},${latitude.toFixed(5)}`).join(';')}`;
}

async function requestRoadRoute(profile, coordinates) {
  const coordinateString = coordinates.map(([longitude, latitude]) => `${longitude},${latitude}`).join(';');
  const url = `${routingBaseUrl}/route/v1/${profile}/${coordinateString}?overview=full&geometries=geojson&steps=false&annotations=false`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BankruptTo1Million-journey-map',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Routing provider returned ${response.status}`);
  const payload = await response.json();
  const route = payload?.code === 'Ok' ? payload.routes?.[0] : null;
  if (!route?.geometry?.coordinates?.length) throw new Error('No road route was returned');
  return {
    geometry: route.geometry,
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
    provider: 'OSRM',
    profile,
  };
}

export async function handleJourneyRoute(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method not allowed' });
    return;
  }

  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 32_000) request.destroy(new Error('Payload too large'));
  });
  request.on('error', () => sendJson(response, 400, { message: 'Invalid request body' }));
  request.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const coordinates = normalizeCoordinates(parsed.coordinates);
      const profile = ['driving', 'cycling', 'walking'].includes(parsed.profile) ? parsed.profile : 'driving';
      if (coordinates.length < 2) {
        sendJson(response, 400, { message: 'At least two valid coordinates are required' });
        return;
      }
      if (coordinates.length > 40) {
        sendJson(response, 400, { message: 'A maximum of 40 route points is allowed' });
        return;
      }

      const key = cacheKey(profile, coordinates);
      const cached = routingCache.get(key);
      if (cached && Date.now() - cached.createdAt < routingCacheTtlMs) {
        sendJson(response, 200, { ...cached.data, cached: true }, 'public, max-age=900');
        return;
      }

      const data = await requestRoadRoute(profile, coordinates);
      routingCache.set(key, { createdAt: Date.now(), data });
      sendJson(response, 200, { ...data, cached: false }, 'public, max-age=900');
    } catch (error) {
      sendJson(response, 502, {
        message: error instanceof Error ? error.message : 'Road routing failed',
      }, 'no-cache');
    }
  });
}

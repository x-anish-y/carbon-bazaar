/**
 * Agromonitoring Satellite Imagery Service
 *
 * Uses Agromonitoring's 2-step image API:
 * 1) Create a polygon (GeoJSON)
 * 2) Search available imagery for the polygon and fetch a PNG (truecolor)
 *
 * This is used as a practical alternative to Sentinel Hub credentials.
 */

const AGROMONITORING_API_KEY = process.env.AGROMONITORING_API_KEY;
const AGROMONITORING_BASE_URL = process.env.AGROMONITORING_BASE_URL || 'https://api.agromonitoring.com';

// Lightweight in-memory cache to avoid creating a new polygon on every request.
// Note: serverless environments may reset this between invocations.
const polygonCache = new Map();

export function isAgroMonitoringAvailable() {
  return !!AGROMONITORING_API_KEY;
}

function clamp(value, min, max) {
  const v = Number(value);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function buildSquarePolygonAroundPoint({ latitude, longitude, areaHectares } = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Invalid coordinates');
  }

  // Compute a square size based on area, with safe bounds.
  // 1 hectare = 10,000 m^2
  const hectares = Number(areaHectares);
  const areaM2 = Number.isFinite(hectares) && hectares > 0 ? hectares * 10000 : 1000000; // default 1 km^2
  const sideM = Math.sqrt(areaM2);

  // Convert meters to degrees.
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180);

  const halfSideM = sideM / 2;
  const deltaLat = clamp(halfSideM / metersPerDegLat, 0.001, 0.02);
  const deltaLon = clamp(halfSideM / (metersPerDegLon || metersPerDegLat), 0.001, 0.02);

  // GeoJSON polygon coordinates are [lon, lat]
  const coords = [
    [lon - deltaLon, lat - deltaLat],
    [lon + deltaLon, lat - deltaLat],
    [lon + deltaLon, lat + deltaLat],
    [lon - deltaLon, lat + deltaLat],
    [lon - deltaLon, lat - deltaLat],
  ];

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    _meta: {
      deltaLat,
      deltaLon,
      areaHectares: Number.isFinite(hectares) ? hectares : null,
    },
  };
}

function getPolygonCacheKey({ latitude, longitude, areaHectares } = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const hectares = Number(areaHectares);

  const latKey = Number.isFinite(lat) ? lat.toFixed(5) : 'na';
  const lonKey = Number.isFinite(lon) ? lon.toFixed(5) : 'na';
  const areaKey = Number.isFinite(hectares) ? Math.round(hectares * 100) : 'na';
  return `${latKey}:${lonKey}:${areaKey}`;
}

async function createPolygonIfNeeded({ latitude, longitude, areaHectares } = {}) {
  if (!AGROMONITORING_API_KEY) {
    throw new Error('AGROMONITORING_API_KEY is not configured');
  }

  const cacheKey = getPolygonCacheKey({ latitude, longitude, areaHectares });
  const cached = polygonCache.get(cacheKey);
  if (cached && cached.polyid && cached.expiresAt > Date.now()) {
    return { polyid: cached.polyid, cached: true, polygonMeta: cached.polygonMeta };
  }

  const feature = buildSquarePolygonAroundPoint({ latitude, longitude, areaHectares });

  const name = `cb_${cacheKey}`;
  const url = `${AGROMONITORING_BASE_URL}/agro/1.0/polygons?appid=${encodeURIComponent(AGROMONITORING_API_KEY)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      name,
      geo_json: feature,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Agromonitoring polygon create failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`);
  }

  const payload = await response.json();
  const polyid = payload?.id || payload?._id || payload?.polyid || null;
  if (!polyid) {
    throw new Error('Agromonitoring polygon create returned no polygon id');
  }

  polygonCache.set(cacheKey, {
    polyid: String(polyid),
    polygonMeta: feature._meta,
    // Cache for 6 hours.
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
  });

  return { polyid: String(polyid), cached: false, polygonMeta: feature._meta };
}

async function searchImagery({ polyid, startUnix, endUnix } = {}) {
  if (!AGROMONITORING_API_KEY) {
    throw new Error('AGROMONITORING_API_KEY is not configured');
  }

  const url = new URL(`${AGROMONITORING_BASE_URL}/agro/1.0/image/search`);
  url.searchParams.set('appid', AGROMONITORING_API_KEY);
  url.searchParams.set('polyid', polyid);
  url.searchParams.set('start', String(startUnix));
  url.searchParams.set('end', String(endUnix));
  // Keep it simple; allow some clouds.
  url.searchParams.set('clouds_max', '60');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Agromonitoring image search failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Agromonitoring image search returned unexpected payload');
  }

  // Sort by acquisition date descending.
  const sorted = payload
    .filter(Boolean)
    .sort((a, b) => (Number(b?.dt) || 0) - (Number(a?.dt) || 0));

  return sorted;
}

function pickBestScene(scenes) {
  if (!Array.isArray(scenes) || scenes.length === 0) return null;

  // Prefer the most recent Sentinel-2 scene if present; otherwise most recent.
  const sentinel = scenes.find((s) => String(s?.type || '').toLowerCase().includes('sentinel'));
  return sentinel || scenes[0];
}

async function fetchPngAsBase64(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(url, {
    method: 'GET',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Agromonitoring PNG fetch failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();

  return {
    contentType,
    byteLength: arrayBuffer.byteLength,
    base64: Buffer.from(arrayBuffer).toString('base64'),
  };
}

async function fetchNdviStats(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload || null;
  } catch {
    return null;
  }
}

/**
 * Fetch RGB PNG imagery for a point by creating a small polygon around it.
 * Returns a Sentinel-like result structure used by the rest of the app.
 */
export async function fetchAgroMonitoringRgbImage(latitude, longitude, { areaHectares } = {}) {
  try {
    if (!AGROMONITORING_API_KEY) {
      return {
        success: false,
        data: null,
        error: 'Agromonitoring API key not configured (AGROMONITORING_API_KEY missing)',
      };
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { success: false, data: null, error: 'Invalid coordinates' };
    }

    const { polyid, cached, polygonMeta } = await createPolygonIfNeeded({
      latitude: lat,
      longitude: lon,
      areaHectares,
    });

    // Search the last 45 days to increase chance of matches.
    const endUnix = Math.floor(Date.now() / 1000);
    const startUnix = endUnix - 45 * 24 * 60 * 60;

    const scenes = await searchImagery({ polyid, startUnix, endUnix });
    const best = pickBestScene(scenes);

    if (!best) {
      return {
        success: false,
        data: null,
        error: 'No satellite scenes found for polygon in the selected period',
      };
    }

    const trueColorUrl = best?.image?.truecolor || null;
    if (!trueColorUrl) {
      return {
        success: false,
        data: null,
        error: 'No truecolor image URL returned by Agromonitoring',
      };
    }

    const image = await fetchPngAsBase64(trueColorUrl);

    const ndviStatsUrl = best?.stats?.ndvi || null;
    const ndviStats = ndviStatsUrl ? await fetchNdviStats(ndviStatsUrl) : null;

    return {
      success: true,
      data: {
        coordinates: { latitude: lat, longitude: lon },
        metrics: {
          analysisType: 'RGB',
          provider: 'Agromonitoring',
          ndviStats,
        },
        image,
        request: {
          provider: 'agromonitoring',
          baseUrl: AGROMONITORING_BASE_URL,
          polyid,
          polygonCached: cached,
          polygonMeta: polygonMeta || null,
          bestScene: {
            dt: best?.dt || null,
            type: best?.type || null,
            dc: best?.dc ?? null,
            cl: best?.cl ?? null,
          },
        },
        apiResponse: {
          status: 200,
          timestamp: new Date().toISOString(),
          provider: 'Agromonitoring',
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error?.message || 'Agromonitoring satellite fetch failed',
    };
  }
}

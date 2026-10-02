/**
 * Geocoding Service
 * Converts address strings to latitude/longitude
 * Supports multiple providers: Google Maps (primary) and Latlong.ai (fallback)
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const LATLONG_API_TOKEN = process.env.LATLONG_API_TOKEN;
const PREFERRED_PROVIDER = process.env.GEOCODING_PROVIDER || 'google'; // 'google' or 'latlong'
const OSM_FALLBACK_ENABLED = process.env.OSM_GEOCODING_FALLBACK !== 'false';
const GEOCODE_MAPS_CO_API_KEY = process.env.GEOCODE_MAPS_CO_API_KEY;

const GOOGLE_GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const LATLONG_GEOCODING_BASE_URL = 'https://apihub.latlong.ai/v4/geocode';
const OSM_NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_MAPS_CO_BASE_URL = 'https://geocode.maps.co/search';

// Validate API credentials on module load
if (!GOOGLE_MAPS_API_KEY && !LATLONG_API_TOKEN) {
  console.warn(
    'Warning: No geocoding API credentials configured. ' +
    'Set either GOOGLE_MAPS_API_KEY or LATLONG_API_TOKEN in environment variables.'
  );
} else if (!GOOGLE_MAPS_API_KEY) {
  console.log('✓ Using Latlong.ai as primary geocoding provider (Google Maps API key not configured)');
} else if (!LATLONG_API_TOKEN) {
  console.log('✓ Using Google Maps as primary geocoding provider (Latlong.ai token not configured)');
} else {
  console.log(`✓ Geocoding: Using ${PREFERRED_PROVIDER === 'latlong' ? 'Latlong.ai' : 'Google Maps'} as primary (fallback available)`);
}

if (GEOCODE_MAPS_CO_API_KEY) {
  console.log('✓ Geocoding: geocode.maps.co provider configured');
}

/**
 * Validate location input
 * @param {string} location - Location string to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateLocation(location) {
  if (!location) {
    return { isValid: false, error: 'Location cannot be empty' };
  }

  if (typeof location !== 'string') {
    return { isValid: false, error: 'Location must be a string' };
  }

  const trimmedLocation = location.trim();
  
  if (trimmedLocation.length === 0) {
    return { isValid: false, error: 'Location cannot be empty or whitespace only' };
  }

  if (trimmedLocation.length > 255) {
    return { isValid: false, error: 'Location exceeds maximum length of 255 characters' };
  }

  return { isValid: true, error: null };
}

/**
 * Geocode using OpenStreetMap Nominatim (no key required).
 * Used as a last-resort fallback when other providers fail.
 */
async function geocodeWithOsm(location) {
  try {
    const encodedLocation = encodeURIComponent(location.trim());
    const url = `${OSM_NOMINATIM_BASE_URL}?q=${encodedLocation}&format=json&addressdetails=1&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Nominatim requires an identifying User-Agent.
        'User-Agent': 'Carbon-Bazaar/1.0 (geocoding; contact: dev@localhost)',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `OSM geocoding error: HTTP ${response.status}`,
        provider: 'osm',
      };
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) {
      return {
        success: false,
        data: null,
        error: 'No results from OSM Nominatim',
        provider: 'osm',
      };
    }

    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        success: false,
        data: null,
        error: 'Invalid coordinates from OSM Nominatim',
        provider: 'osm',
      };
    }

    const addr = first.address || {};
    return {
      success: true,
      data: {
        latitude,
        longitude,
        formattedAddress: first.display_name || location,
        placeId: first.osm_id ? String(first.osm_id) : null,
        components: {
          country: addr.country || null,
          state: addr.state || addr.region || null,
          district: addr.county || addr.state_district || null,
          village: addr.village || addr.town || addr.city || addr.hamlet || null,
          postalCode: addr.postcode || null,
        },
      },
      error: null,
      provider: 'osm',
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `OSM geocoding error: ${error.message}`,
      provider: 'osm',
    };
  }
}

/**
 * Geocode using Google Maps API
 * @param {string} location - Location string
 * @returns {Promise<Object>} Result object
 */
async function geocodeWithGoogle(location) {
  if (!GOOGLE_MAPS_API_KEY) {
    return {
      success: false,
      data: null,
      error: 'Google Maps API key not configured',
      provider: 'google',
    };
  }

  try {
    const encodedLocation = encodeURIComponent(location.trim());
    const url = `${GOOGLE_GEOCODING_BASE_URL}?address=${encodedLocation}&key=${GOOGLE_MAPS_API_KEY}`;

    console.log('[Google Maps] Requesting geocoding for:', location);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    console.log('[Google Maps] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Google Maps] Response status code:', data.status);

    if (data.status !== 'OK') {
      let errorMsg = 'Location not found';
      if (data.status === 'REQUEST_DENIED') {
        errorMsg = 'Google Maps API denied request - key may not have Geocoding API enabled';
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        errorMsg = 'Google Maps API quota exceeded';
      } else if (data.status === 'ZERO_RESULTS') {
        errorMsg = 'No results found for location';
      }
      return { 
        success: false, 
        data: null, 
        error: errorMsg, 
        provider: 'google',
        apiStatus: data.status,
      };
    }

    const result = data.results[0];
    if (!result) {
      return { success: false, data: null, error: 'No results from Google Maps', provider: 'google' };
    }

    const { lat, lng } = result.geometry.location;

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { success: false, data: null, error: 'Invalid coordinates from Google', provider: 'google' };
    }

    console.log('[Google Maps] Success:', lat, lng);

    return {
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id || null,
        components: extractAddressComponents(result.address_components),
      },
      error: null,
      provider: 'google',
    };
  } catch (error) {
    console.error('[Google Maps] Error:', error.message);
    return {
      success: false,
      data: null,
      error: `Google Maps error: ${error.message}`,
      provider: 'google',
    };
  }
}

/**
 * Geocode using Latlong.ai API
 * @param {string} location - Location string
 * @returns {Promise<Object>} Result object
 */
async function geocodeWithLatlong(location) {
  if (!LATLONG_API_TOKEN) {
    return {
      success: false,
      data: null,
      error: 'Latlong.ai API token not configured',
      provider: 'latlong',
    };
  }

  try {
    const encodedLocation = encodeURIComponent(location.trim());
    const url = `${LATLONG_GEOCODING_BASE_URL}?location=${encodedLocation}`;

    console.log('[Latlong] Requesting:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LATLONG_API_TOKEN}`,
        'Accept': 'application/json',
        'User-Agent': 'Carbon-Bazaar/1.0',
      },
    });

    console.log('[Latlong] Response status:', response.status);

    // Latlong might return 401 if token is expired or invalid
    if (response.status === 401) {
      return {
        success: false,
        data: null,
        error: 'Latlong.ai authentication failed - token may be expired or invalid',
        provider: 'latlong',
      };
    }

    if (!response.ok) {
      const text = await response.text();
      console.log('[Latlong] Error response:', text);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Latlong] Response data:', JSON.stringify(data).substring(0, 200));

    // Check response structure - latlong returns different formats
    // Some responses might be { location: {...}, latitude, longitude }
    // Others might be { data: {...}, latitude, longitude }
    let latitude, longitude, address;

    if (data.latitude && data.longitude) {
      latitude = parseFloat(data.latitude);
      longitude = parseFloat(data.longitude);
      address = data.address || data.display_name || location;
    } else if (data.results && data.results.length > 0) {
      const result = data.results[0];
      latitude = parseFloat(result.latitude);
      longitude = parseFloat(result.longitude);
      address = result.address || result.display_name || location;
    } else if (data.data && data.data.latitude && data.data.longitude) {
      latitude = parseFloat(data.data.latitude);
      longitude = parseFloat(data.data.longitude);
      address = data.data.address || location;
    } else {
      console.log('[Latlong] Unexpected response format');
      return {
        success: false,
        data: null,
        error: 'Unexpected response format from Latlong.ai',
        provider: 'latlong',
      };
    }

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        data: null,
        error: 'Invalid coordinates from Latlong.ai',
        provider: 'latlong',
      };
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        success: false,
        data: null,
        error: 'Coordinates out of valid range from Latlong.ai',
        provider: 'latlong',
      };
    }

    return {
      success: true,
      data: {
        latitude,
        longitude,
        formattedAddress: address,
        placeId: data.place_id || null,
        components: {
          country: data.country || null,
          state: data.state || data.province || null,
          district: data.district || data.county || null,
          village: data.city || data.locality || null,
          postalCode: data.postal_code || data.postcode || null,
        },
      },
      error: null,
      provider: 'latlong',
    };
  } catch (error) {
    console.error('[Latlong] Error:', error.message);
    return {
      success: false,
      data: null,
      error: `Latlong.ai error: ${error.message}`,
      provider: 'latlong',
    };
  }
}

/**
 * Geocode using geocode.maps.co (OSM-based, requires api_key)
 * @param {string} location
 */
async function geocodeWithGeocodeMapsCo(location) {
  if (!GEOCODE_MAPS_CO_API_KEY) {
    return {
      success: false,
      data: null,
      error: 'geocode.maps.co API key not configured',
      provider: 'mapsco',
    };
  }

  try {
    const encodedLocation = encodeURIComponent(location.trim());
    const url = `${GEOCODE_MAPS_CO_BASE_URL}?q=${encodedLocation}&format=json&addressdetails=1&limit=1&api_key=${encodeURIComponent(GEOCODE_MAPS_CO_API_KEY)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Carbon-Bazaar/1.0 (geocoding; contact: dev@localhost)',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        data: null,
        error: `geocode.maps.co error: HTTP ${response.status}${text ? ` - ${text.slice(0, 200)}` : ''}`,
        provider: 'mapsco',
      };
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;

    if (!first) {
      return {
        success: false,
        data: null,
        error: 'No results from geocode.maps.co',
        provider: 'mapsco',
      };
    }

    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        success: false,
        data: null,
        error: 'Invalid coordinates from geocode.maps.co',
        provider: 'mapsco',
      };
    }

    const addr = first.address || {};

    return {
      success: true,
      data: {
        latitude,
        longitude,
        formattedAddress: first.display_name || location,
        placeId: first.place_id ? String(first.place_id) : (first.osm_id ? String(first.osm_id) : null),
        components: {
          country: addr.country || null,
          state: addr.state || addr.region || null,
          district: addr.county || addr.state_district || null,
          village: addr.village || addr.town || addr.city || addr.hamlet || null,
          postalCode: addr.postcode || null,
        },
      },
      error: null,
      provider: 'mapsco',
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `geocode.maps.co error: ${error.message}`,
      provider: 'mapsco',
    };
  }
}

/**
 * Geocode a location string to coordinates
 * Tries primary provider first, falls back to alternative if available
 * @param {string} location - Location string (e.g., "Village XYZ, District ABC, State MH, India")
 * @returns {Promise<Object>} { success: boolean, data: { latitude, longitude, formattedAddress }, error: string|null }
 */
export async function geocodeLocation(location) {
  try {
    // Validate input
    const validation = validateLocation(location);
    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: validation.error,
      };
    }

    let primaryResult;
    let fallbackResult;

    const providerOrder = [];
    const pref = String(PREFERRED_PROVIDER || '').toLowerCase();
    if (pref === 'latlong') providerOrder.push('latlong');
    else if (pref === 'mapsco' || pref === 'geocode-maps-co' || pref === 'geocodemapsco') providerOrder.push('mapsco');
    else providerOrder.push('google');

    // Fill remaining providers in a stable order
    for (const p of ['google', 'latlong', 'mapsco']) {
      if (!providerOrder.includes(p)) providerOrder.push(p);
    }

    const runProvider = async (providerName) => {
      if (providerName === 'google') return GOOGLE_MAPS_API_KEY ? geocodeWithGoogle(location) : ({ success: false, data: null, error: 'Google Maps API key not configured', provider: 'google' });
      if (providerName === 'latlong') return LATLONG_API_TOKEN ? geocodeWithLatlong(location) : ({ success: false, data: null, error: 'Latlong.ai API token not configured', provider: 'latlong' });
      if (providerName === 'mapsco') return GEOCODE_MAPS_CO_API_KEY ? geocodeWithGeocodeMapsCo(location) : ({ success: false, data: null, error: 'geocode.maps.co API key not configured', provider: 'mapsco' });
      return { success: false, data: null, error: 'Unknown provider', provider: providerName };
    };

    // Try providers in order
    primaryResult = await runProvider(providerOrder[0]);
    if (primaryResult.success) return primaryResult;

    fallbackResult = await runProvider(providerOrder[1]);
    if (fallbackResult.success) return fallbackResult;

    const thirdResult = await runProvider(providerOrder[2]);
    if (thirdResult.success) return thirdResult;

    // Last-resort fallback: OpenStreetMap Nominatim
    const osmResult = OSM_FALLBACK_ENABLED ? await geocodeWithOsm(location) : null;
    if (osmResult?.success) return osmResult;

    // Both providers failed (or only one was configured)
    const errors = [];
    if (primaryResult && !primaryResult.success) {
      errors.push(`${primaryResult.provider || 'primary'}: ${primaryResult.error || 'failed'}`);
    }
    if (fallbackResult && !fallbackResult.success) {
      errors.push(`${fallbackResult.provider || 'fallback'}: ${fallbackResult.error || 'failed'}`);
    }
    if (thirdResult && !thirdResult.success) {
      errors.push(`${thirdResult.provider || 'third'}: ${thirdResult.error || 'failed'}`);
    }
    if (osmResult && !osmResult.success) {
      errors.push(`${osmResult.provider || 'osm'}: ${osmResult.error || 'failed'}`);
    }

    return {
      success: false,
      data: null,
      error: errors.length ? errors.join(' | ') : 'Geocoding failed',
      provider: 'combined',
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      data: null,
      error: 'An unexpected error occurred during geocoding',
    };
  }
}

/**
 * Extract address components from Google Maps result
 * @param {Array} addressComponents - Address components from Google Maps API
 * @returns {Object} Structured address components
 */
function extractAddressComponents(addressComponents) {
  const components = {
    country: null,
    state: null,
    district: null,
    village: null,
    postalCode: null,
  };

  if (!Array.isArray(addressComponents)) {
    return components;
  }

  addressComponents.forEach(component => {
    const types = component.types || [];
    const longName = component.long_name;

    if (types.includes('country')) {
      components.country = longName;
    } else if (types.includes('administrative_area_level_1')) {
      components.state = longName;
    } else if (types.includes('administrative_area_level_2')) {
      components.district = longName;
    } else if (types.includes('locality') || types.includes('administrative_area_level_3')) {
      components.village = longName;
    } else if (types.includes('postal_code')) {
      components.postalCode = longName;
    }
  });

  return components;
}

/**
 * Validate latitude and longitude
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { isValid: false, error: 'Latitude and longitude must be numbers' };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { isValid: true, error: null };
}

/**
 * Check if geocoding service is available
 * @returns {boolean} True if at least one provider is configured
 */
export function isGeocodingAvailable() {
  return !!(GOOGLE_MAPS_API_KEY || LATLONG_API_TOKEN || GEOCODE_MAPS_CO_API_KEY || OSM_FALLBACK_ENABLED);
}

/**
 * Get geocoding provider status
 * @returns {Object} Status of both providers
 */
export function getGeocodingStatus() {
  return {
    googleMapsAvailable: !!GOOGLE_MAPS_API_KEY,
    latlongAvailable: !!LATLONG_API_TOKEN,
    mapsCoAvailable: !!GEOCODE_MAPS_CO_API_KEY,
    osmFallbackEnabled: OSM_FALLBACK_ENABLED,
    primaryProvider: PREFERRED_PROVIDER,
    anyProviderAvailable: !!(GOOGLE_MAPS_API_KEY || LATLONG_API_TOKEN || GEOCODE_MAPS_CO_API_KEY || OSM_FALLBACK_ENABLED),
  };
}

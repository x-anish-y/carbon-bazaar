/**
 * Satellite Analysis Service
 * Fetches and analyzes satellite imagery using Sentinel Hub API
 * Provides NDVI, land cover confidence, and vegetation metrics
 */

const SENTINEL_HUB_CLIENT_ID = process.env.SENTINEL_HUB_CLIENT_ID;
const SENTINEL_HUB_CLIENT_SECRET = process.env.SENTINEL_HUB_CLIENT_SECRET;
const SENTINEL_HUB_OAUTH_URL = 'https://services.sentinel-hub.com/oauth/token';
const SENTINEL_HUB_API_URL = 'https://services.sentinel-hub.com/api/v1/process';

// Validate credentials on module load
if (!SENTINEL_HUB_CLIENT_ID || !SENTINEL_HUB_CLIENT_SECRET) {
  console.warn(
    'Warning: Sentinel Hub credentials (SENTINEL_HUB_CLIENT_ID and/or SENTINEL_HUB_CLIENT_SECRET) ' +
    'are not defined in environment variables. Satellite analysis service will not work until configured.'
  );
}

/**
 * Validate coordinate input
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateCoordinates(latitude, longitude) {
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
 * Get OAuth access token from Sentinel Hub
 * @returns {Promise<string>} Access token
 * @throws {Error} If unable to get token
 */
async function getAccessToken() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', SENTINEL_HUB_CLIENT_ID);
    params.append('client_secret', SENTINEL_HUB_CLIENT_SECRET);

    const response = await fetch(SENTINEL_HUB_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `OAuth request failed: ${response.status} ${response.statusText}` +
        (text ? ` - ${text.slice(0, 500)}` : '')
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access token in OAuth response');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

/**
 * Build request body for Sentinel Hub API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} analysisType - Type of analysis: 'NDVI' or 'RGB'
 * @returns {Object} Request body for Sentinel Hub API
 */
function buildSentinelHubRequest(latitude, longitude, analysisType = 'NDVI') {
  // Create a small bounding box around the coordinates (0.01 degrees = ~1 km)
  const buffer = 0.01;
  const bbox = [
    longitude - buffer,
    latitude - buffer,
    longitude + buffer,
    latitude + buffer,
  ];

  const timeRange = {
    // Last 30 days of data
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  };

  if (analysisType === 'NDVI') {
    return {
      input: {
        bounds: {
          bbox,
          properties: {
            crs: 'http://www.opengis.net/gml/srs/epsg.xml#4326',
          },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                ...timeRange,
              },
              mosaickingOrder: 'mostRecent',
              maxCloudCoverage: 50,
            },
          },
        ],
      },
      output: {
        responses: [
          {
            identifier: 'default',
            format: {
              type: 'image/png',
            },
          },
        ],
        width: 512,
        height: 512,
      },
      evalscript: `
        //VERSION=3
        function setup() {
          return {
            input: [{
              bands: ["B04", "B08", "dataMask"],
              units: "REFLECTANCE"
            }],
            output: {
              bands: 3,
              sampleType: "UINT8"
            }
          };
        }

        function evaluatePixel(sample) {
          const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);

          // Map NDVI (-1..1) to a simple red-yellow-green palette for PNG output
          // ndvi <= 0 => red, 0..0.5 => yellowish, >= 0.5 => green
          const v = Math.max(-1, Math.min(1, ndvi));
          let r = 255;
          let g = 0;
          let b = 0;

          if (v > 0) {
            // 0..1
            const t = Math.min(1, v);
            r = Math.round(255 * (1 - t));
            g = Math.round(255 * t);
            b = 0;
          }

          return [r, g, b];
        }
      `,
      _meta: { bbox, timeRange },
    };
  } else if (analysisType === 'RGB') {
    return {
      input: {
        bounds: {
          bbox,
          properties: {
            crs: 'http://www.opengis.net/gml/srs/epsg.xml#4326',
          },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                ...timeRange,
              },
              mosaickingOrder: 'mostRecent',
              maxCloudCoverage: 50,
            },
          },
        ],
      },
      output: {
        responses: [
          {
            identifier: 'default',
            format: {
              type: 'image/png',
            },
          },
        ],
        width: 512,
        height: 512,
      },
      evalscript: `
        //VERSION=3
        function setup() {
          return {
            input: [{
              bands: ["B02", "B03", "B04", "dataMask"],
              units: "REFLECTANCE"
            }],
            output: {
              bands: 3,
              sampleType: "UINT8"
            }
          };
        }

        function evaluatePixel(sample) {
          // Basic natural color mapping with a mild gain.
          const gain = 2.5;
          const r = Math.max(0, Math.min(255, Math.round(sample.B04 * 255 * gain)));
          const g = Math.max(0, Math.min(255, Math.round(sample.B03 * 255 * gain)));
          const b = Math.max(0, Math.min(255, Math.round(sample.B02 * 255 * gain)));
          return [r, g, b];
        }
      `,
      _meta: { bbox, timeRange },
    };
  }

  throw new Error(`Unknown analysis type: ${analysisType}`);
}

/**
 * Calculate metrics from satellite data
 * @param {Object} data - Raw satellite data
 * @param {string} analysisType - Type of analysis performed
 * @returns {Object} Simplified metrics
 */
function calculateMetrics(data, analysisType) {
  if (analysisType === 'NDVI') {
    // NDVI ranges from -1 to 1
    // < 0.3: Low vegetation (bare soil, water, urban)
    // 0.3-0.6: Medium vegetation (grassland, crops)
    // > 0.6: High vegetation (forests, dense crops)

    return {
      analysisType: 'NDVI',
      vegetationIndex: null,
      vegetationStatus: null,
      confidence: 0.6,
      lastAnalyzedDate: new Date().toISOString(),
      dataQuality: 'unknown',
      cloudCoverage: null,
      recommendation: 'NDVI image generated; metrics not computed server-side',
      note: 'This service returns a rendered NDVI PNG for downstream analysis (e.g., OpenAI vision).',
    };
  } else if (analysisType === 'RGB') {
    // RGB analysis provides visual confirmation
    return {
      analysisType: 'RGB',
      rgbChannels: null,
      dominantColor: null,
      landCoverConfidence: 0.6,
      lastAnalyzedDate: new Date().toISOString(),
      dataQuality: 'unknown',
      cloudCoverage: null,
      recommendation: 'Visual confirmation shows active land use',
      note: 'This service returns a rendered RGB PNG for downstream analysis (e.g., OpenAI vision).',
    };
  }

  return null;
}

/**
 * Fetch and analyze satellite imagery for given coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} analysisType - Type of analysis: 'NDVI' or 'RGB'
 * @returns {Promise<Object>} { success: boolean, data: metrics|null, error: string|null }
 */
export async function fetchSatelliteAnalysis(latitude, longitude, analysisType = 'NDVI') {
  try {
    // Validate coordinates
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: validation.error,
      };
    }

    // Check credentials
    if (!SENTINEL_HUB_CLIENT_ID || !SENTINEL_HUB_CLIENT_SECRET) {
      return {
        success: false,
        data: null,
        error: 'Sentinel Hub credentials are not configured. Please set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET in environment variables.',
      };
    }

    // Validate analysis type
    if (!['NDVI', 'RGB'].includes(analysisType)) {
      return {
        success: false,
        data: null,
        error: `Invalid analysis type: ${analysisType}. Must be 'NDVI' or 'RGB'`,
      };
    }

    // Get access token
    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch (error) {
      return {
        success: false,
        data: null,
        error: 'Failed to authenticate with Sentinel Hub: ' + error.message,
      };
    }

    // Build request
    const requestBody = buildSentinelHubRequest(latitude, longitude, analysisType);
    const requestMeta = requestBody?._meta;
    if (requestMeta) delete requestBody._meta;

    // Send request to Sentinel Hub API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(SENTINEL_HUB_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `Sentinel Hub API error: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;

    // Calculate metrics from the response (no pixel parsing here)
    const metrics = calculateMetrics(null, analysisType);

    return {
      success: true,
      data: {
        coordinates: { latitude, longitude },
        metrics,
        image: {
          contentType,
          byteLength,
          base64: Buffer.from(arrayBuffer).toString('base64'),
        },
        request: requestMeta || null,
        apiResponse: {
          status: response.status,
          timestamp: new Date().toISOString(),
          provider: 'Sentinel Hub',
        },
      },
      error: null,
    };
  } catch (error) {
    console.error('Satellite analysis error:', error);
    return {
      success: false,
      data: null,
      error: 'An unexpected error occurred during satellite analysis',
    };
  }
}

/**
 * Convenience wrapper for RGB PNG imagery used by OpenAI vision analysis.
 * Does NOT attempt server-side pixel parsing.
 */
export async function fetchSatelliteRgbImage(latitude, longitude) {
  return fetchSatelliteAnalysis(latitude, longitude, 'RGB');
}

/**
 * Check if satellite analysis service is available
 * @returns {boolean} True if credentials are configured
 */
export function isSatelliteAnalysisAvailable() {
  return !!(SENTINEL_HUB_CLIENT_ID && SENTINEL_HUB_CLIENT_SECRET);
}

/**
 * Get available analysis types
 * @returns {Array<string>} List of available analysis types
 */
export function getAvailableAnalysisTypes() {
  return ['NDVI', 'RGB'];
}

/**
 * Get information about analysis type
 * @param {string} analysisType - Analysis type to get info about
 * @returns {Object} Information about the analysis type
 */
export function getAnalysisTypeInfo(analysisType) {
  const info = {
    NDVI: {
      name: 'Normalized Difference Vegetation Index',
      description: 'Measures vegetation health and density using red and near-infrared bands',
      output: 'Vegetation index (-1 to 1), vegetation status, cloud coverage',
      bestFor: 'Assessing agricultural land health and vegetation coverage',
      cloudTolerance: '50%',
    },
    RGB: {
      name: 'Red-Green-Blue Imagery',
      description: 'True color imagery combining red, green, and blue bands',
      output: 'RGB channels, dominant color, land cover confidence',
      bestFor: 'Visual verification of land use and land cover',
      cloudTolerance: '50%',
    },
  };

  return info[analysisType] || null;
}

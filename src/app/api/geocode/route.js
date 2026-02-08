import { geocodeLocation, isGeocodingAvailable, getGeocodingStatus } from '@/lib/services/geocoding';

/**
 * POST /api/geocode
 * Geocode a location string to latitude/longitude coordinates
 */
export async function POST(request) {
  try {
    // Check if geocoding service is available
    if (!isGeocodingAvailable()) {
      return Response.json(
        {
          success: false,
          message: 'Geocoding service is not available. Please configure a provider in environment variables (GOOGLE_MAPS_API_KEY, LATLONG_API_TOKEN, or GEOCODE_MAPS_CO_API_KEY).',
          data: null,
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { location } = body;

    // Validate request
    if (!location) {
      return Response.json(
        {
          success: false,
          message: 'Location is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Call geocoding service
    const result = await geocodeLocation(location);

    // If geocoding failed, return error response
    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: result.error || 'Failed to geocode location',
          data: null,
        },
        { status: 400 }
      );
    }

    // Return successful response
    return Response.json(
      {
        success: true,
        message: 'Location geocoded successfully',
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Geocoding API error:', error);
    return Response.json(
      {
        success: false,
        message: 'An error occurred while processing your request',
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geocode
 * Check if geocoding service is available
 */
export async function GET(request) {
  try {
    const available = isGeocodingAvailable();
    const status = getGeocodingStatus();

    return Response.json(
      {
        success: true,
        message: 'Geocoding service status retrieved',
        data: {
          available,
          status,
          message: available
            ? `Geocoding service is ready (${status.primaryProvider} as primary provider)`
            : 'Geocoding service is not configured',
          providers: {
            googleMaps: status.googleMapsAvailable ? 'Configured ✓' : 'Not configured',
            latlong: status.latlongAvailable ? 'Configured ✓' : 'Not configured',
            primaryProvider: status.primaryProvider,
            fallbackAvailable: status.googleMapsAvailable && status.latlongAvailable,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Geocoding status check error:', error);
    return Response.json(
      {
        success: false,
        message: 'An error occurred while checking service status',
        data: null,
      },
      { status: 500 }
    );
  }
}

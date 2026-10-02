import {
  fetchSatelliteAnalysis,
  isSatelliteAnalysisAvailable,
  getAvailableAnalysisTypes,
  getAnalysisTypeInfo,
} from '@/lib/services/satelliteAnalysis';

/**
 * POST /api/satellite-analysis
 * Fetch and analyze satellite imagery for given coordinates
 */
export async function POST(request) {
  try {
    // Check if service is available
    if (!isSatelliteAnalysisAvailable()) {
      return Response.json(
        {
          success: false,
          message: 'Satellite analysis service is not available. Please configure SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET.',
          data: null,
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { latitude, longitude, analysisType = 'NDVI' } = body;

    // Validate required fields
    if (latitude === undefined || latitude === null) {
      return Response.json(
        {
          success: false,
          message: 'Latitude is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (longitude === undefined || longitude === null) {
      return Response.json(
        {
          success: false,
          message: 'Longitude is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate coordinate types
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return Response.json(
        {
          success: false,
          message: 'Latitude and longitude must be numbers',
          data: null,
        },
        { status: 400 }
      );
    }

    // Call satellite analysis service
    const result = await fetchSatelliteAnalysis(latitude, longitude, analysisType);

    // If analysis failed, return error response
    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: result.error || 'Failed to analyze satellite imagery',
          data: null,
        },
        { status: 400 }
      );
    }

    // Return successful response
    return Response.json(
      {
        success: true,
        message: 'Satellite analysis completed successfully',
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Satellite analysis API error:', error);
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
 * GET /api/satellite-analysis
 * Get information about satellite analysis service
 */
export async function GET(request) {
  try {
    const available = isSatelliteAnalysisAvailable();
    const analysisTypes = getAvailableAnalysisTypes();

    const typeInfo = analysisTypes.map(type => ({
      type,
      ...getAnalysisTypeInfo(type),
    }));

    return Response.json(
      {
        success: true,
        message: 'Satellite analysis service information retrieved',
        data: {
          available,
          analysisTypes: typeInfo,
          message: available
            ? 'Satellite analysis service is ready'
            : 'Satellite analysis service is not configured',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Satellite analysis info error:', error);
    return Response.json(
      {
        success: false,
        message: 'An error occurred while retrieving service information',
        data: null,
      },
      { status: 500 }
    );
  }
}

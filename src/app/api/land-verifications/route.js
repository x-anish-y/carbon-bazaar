import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { LandVerificationRepository } from '@/lib/db/landVerificationRepository';
import CarbonListing from '@/models/CarbonListing';
import LandVerification from '@/models/LandVerification';
import { calculateMatchPercentage } from '@/lib/utils/landVerification';
import User from '@/models/User';
import { geocodeLocation } from '@/lib/services/geocoding';
import { fetchSatelliteRgbImage as fetchSentinelRgbImage, isSatelliteAnalysisAvailable } from '@/lib/services/satelliteAnalysis';
import { fetchAgroMonitoringRgbImage, isAgroMonitoringAvailable } from '@/lib/services/agromonitoringSatellite';
import { analyzeSatellitePngWithOpenAi, isOpenAiVisionAvailable } from '@/lib/services/openaiSatelliteVision';
import { INDIAN_STATES, isValidState } from '@/lib/india/constants';

function deriveStateCodeFromGeocoding(geoResult) {
  const raw =
    geoResult?.data?.components?.state ||
    geoResult?.data?.components?.administrative_area_level_1 ||
    geoResult?.data?.components?.stateProvince ||
    null;

  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If provider returns a 2-letter code already
  const maybeCode = trimmed.toUpperCase();
  if (maybeCode.length === 2 && isValidState(maybeCode)) {
    return maybeCode;
  }

  // Match by state name (case-insensitive)
  const normalized = trimmed.toLowerCase();
  const match = INDIAN_STATES.find((s) => String(s.name).toLowerCase() === normalized);
  return match ? match.code : null;
}

function deriveStateCodeFromText(location) {
  if (!location || typeof location !== 'string') return null;
  const haystack = location.toLowerCase();

  const normalizeForStateMatch = (value) =>
    String(value || '')
      .toLowerCase()
      // Remove all non-letter characters (spaces, punctuation, digits)
      // so inputs like "Maha rashtra" match "Maharashtra".
      .replace(/[^a-z]/g, '');

  const compactHaystack = normalizeForStateMatch(haystack);

  // Try full state names first (e.g., "West Bengal")
  for (const state of INDIAN_STATES) {
    const needle = String(state.name).toLowerCase();
    if (needle && haystack.includes(needle)) {
      return state.code;
    }
  }

  // Retry with compacted (letters-only) matching to tolerate spacing/typos like "Maha rashtra"
  if (compactHaystack) {
    for (const state of INDIAN_STATES) {
      const compactNeedle = normalizeForStateMatch(state.name);
      if (compactNeedle && compactHaystack.includes(compactNeedle)) {
        return state.code;
      }
    }
  }

  // Then try 2-letter codes as standalone tokens
  for (const state of INDIAN_STATES) {
    const code = String(state.code).toLowerCase();
    const re = new RegExp(`\\b${code}\\b`, 'i');
    if (re.test(location)) {
      return state.code;
    }
  }

  return null;
}

function clamp01(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.min(1, Math.max(0, numberValue));
}

function normalizeListingCropType(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  if (['RICE', 'WHEAT', 'SUGARCANE', 'PULSES'].includes(v)) return v;
  return null;
}

function normalizeObservedCropType(value) {
  if (!value || typeof value !== 'string') return 'UNKNOWN';
  const v = value.trim().toUpperCase();
  if (['RICE', 'WHEAT', 'SUGARCANE', 'PULSES', 'UNKNOWN'].includes(v)) return v;
  // Basic synonym handling
  if (v.includes('SUGAR')) return 'SUGARCANE';
  if (v.includes('PULSE') || v.includes('LENTIL') || v.includes('GRAM')) return 'PULSES';
  if (v.includes('RICE') || v.includes('PADDY')) return 'RICE';
  if (v.includes('WHEAT')) return 'WHEAT';
  return 'UNKNOWN';
}

function tryParseLatLonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

function computeAreaMatchScore({ declaredAreaHectares, observedAreaHectares } = {}) {
  const declared = Number(declaredAreaHectares);
  const observed = Number(observedAreaHectares);
  if (!Number.isFinite(declared) || declared <= 0) return null;
  if (!Number.isFinite(observed) || observed <= 0) return null;

  const relError = Math.abs(observed - declared) / declared;
  // Full score when within 20%, linearly decay to 0 at 80%.
  const score = 1 - Math.min(1, Math.max(0, (relError - 0.2) / 0.6));
  return Math.min(1, Math.max(0, score));
}

function sanitizeAiObservedDataForResponse(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const cloned = { ...value };

  for (const key of ['geocoding', 'satellite', 'openaiVision']) {
    const section = cloned[key];
    if (!section || typeof section !== 'object') continue;
    if (section.success !== true) {
      delete cloned[key];
      continue;
    }
    const { error, provider, ...rest } = section;
    cloned[key] = rest;
  }

  // Remove any top-level error field if present
  if (Object.prototype.hasOwnProperty.call(cloned, 'error')) {
    delete cloned.error;
  }

  return cloned;
}

function computeHeuristicMatchPercentage({ farmerDeclaredData, listing, aiObservedData } = {}) {
  const areaLocation = farmerDeclaredData?.areaLocation;
  const derivedStateCode =
    aiObservedData?.derived?.stateCode ||
    deriveStateCodeFromText(areaLocation);

  const stateMatch =
    derivedStateCode && listing?.state ? String(derivedStateCode) === String(listing.state) : null;

  const hasLocationText = typeof areaLocation === 'string' && areaLocation.trim().length > 0;
  const hasGeoCoordinates =
    aiObservedData?.geocoding?.data?.latitude !== null &&
    aiObservedData?.geocoding?.data?.latitude !== undefined &&
    aiObservedData?.geocoding?.data?.longitude !== null &&
    aiObservedData?.geocoding?.data?.longitude !== undefined;

  const hasSatelliteCoordinates =
    aiObservedData?.satellite?.data?.coordinates !== null &&
    aiObservedData?.satellite?.data?.coordinates !== undefined;

  // Heuristic: give partial confidence if we have something concrete to review.
  // - Coordinates present => stronger confidence
  // - State code derived => moderate confidence
  // - Only a location string => low but non-zero confidence (minimum ~7% overall)
  const landSizeConfidence =
    (hasGeoCoordinates || hasSatelliteCoordinates)
      ? 0.6
      : (derivedStateCode ? 0.3 : (hasLocationText ? 0.24 : 0));

  const cropTypeMatch = stateMatch === null ? 0 : (stateMatch ? 1 : 0);

  return calculateMatchPercentage({
    cropTypeMatch,
    landSizeConfidence,
    farmingPracticeMatch: 0,
  });
}

async function computeAiAndMatch({ farmerDeclaredData, listing }) {
  try {
    const areaLocation = farmerDeclaredData?.areaLocation;

    const parsedLatLon = tryParseLatLonFromText(areaLocation);
    const geo = parsedLatLon
      ? {
          success: true,
          data: {
            latitude: parsedLatLon.latitude,
            longitude: parsedLatLon.longitude,
            formattedAddress: areaLocation,
            placeId: null,
            components: {},
          },
          error: null,
          provider: 'manual',
        }
      : (areaLocation ? await geocodeLocation(areaLocation) : null);
    const derivedStateCode =
      geo?.success
        ? (deriveStateCodeFromGeocoding(geo) || deriveStateCodeFromText(areaLocation))
        : deriveStateCodeFromText(areaLocation);
    const stateMatch =
      derivedStateCode && listing?.state ? String(derivedStateCode) === String(listing.state) : null;

    let satelliteRgb = null;
    let openAi = null;

    if (geo?.success && geo?.data?.latitude !== undefined && geo?.data?.longitude !== undefined) {
      const latitude = Number(geo.data.latitude);
      const longitude = Number(geo.data.longitude);

      const preferredProvider = (process.env.SATELLITE_PROVIDER || '').toLowerCase();
      const canUseAgro = isAgroMonitoringAvailable();
      const canUseSentinel = isSatelliteAnalysisAvailable();

      if (canUseAgro && (preferredProvider === 'agromonitoring' || !canUseSentinel)) {
        satelliteRgb = await fetchAgroMonitoringRgbImage(latitude, longitude, {
          areaHectares: listing?.areaInHectares,
        });
      } else {
        satelliteRgb = await fetchSentinelRgbImage(latitude, longitude);
      }

      const base64Png = satelliteRgb?.success ? satelliteRgb?.data?.image?.base64 : null;

      if (base64Png && isOpenAiVisionAvailable()) {
        openAi = await analyzeSatellitePngWithOpenAi({
          imageBase64: base64Png,
          listingSnapshot: {
            state: listing?.state ?? null,
            cropType: listing?.cropType ?? null,
            areaInHectares: listing?.areaInHectares ?? null,
            methodology: listing?.methodology ?? null,
          },
          farmerDeclaredData,
        });
      } else if (base64Png && !isOpenAiVisionAvailable()) {
        openAi = {
          success: false,
          model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
          data: null,
          error: 'OpenAI vision not configured (OPENAI_API_KEY missing)',
        };
      }
    }

    const openAiSucceeded = !!(openAi && openAi.success);

    const listingCrop = normalizeListingCropType(listing?.cropType);
    const observedCrop = normalizeObservedCropType(openAiSucceeded ? openAi?.data?.observedCrop : null);

    const derivedCropTypeMatch =
      (openAiSucceeded && listingCrop && observedCrop !== 'UNKNOWN')
        ? (listingCrop === observedCrop ? 1 : 0)
        : (stateMatch === null ? 0 : (stateMatch ? 1 : 0));

    const areaMatchScore = openAiSucceeded
      ? computeAreaMatchScore({
          declaredAreaHectares: listing?.areaInHectares,
          observedAreaHectares: openAi?.data?.observedAreaHectares,
        })
      : null;

    const openAiAreaConfidence = clamp01(openAiSucceeded ? openAi?.data?.confidence?.area : null);

    const heuristicLandSizeConfidence = geo?.success ? 0.6 : (derivedStateCode ? 0.3 : 0);
    const derivedLandSizeConfidence =
      areaMatchScore !== null
        ? (openAiAreaConfidence !== null ? Math.min(1, Math.max(0, (areaMatchScore * 0.7) + (openAiAreaConfidence * 0.3))) : areaMatchScore)
        : heuristicLandSizeConfidence;

    const practiceConfidence = clamp01(openAiSucceeded ? openAi?.data?.confidence?.practices : null);
    const derivedFarmingPracticeMatch = practiceConfidence !== null ? practiceConfidence : null;

    const heuristicMatchPercentage = calculateMatchPercentage({
      // If OpenAI isn't available, we base the score on what we can validate reliably.
      // Today that's primarily location/state coherence.
      cropTypeMatch: stateMatch === null ? 0 : (stateMatch ? 1 : 0),
      landSizeConfidence: heuristicLandSizeConfidence,
      farmingPracticeMatch: 0,
    });

    const matchPercentage = openAiSucceeded
      ? calculateMatchPercentage({
          cropTypeMatch: derivedCropTypeMatch,
          landSizeConfidence: derivedLandSizeConfidence,
          farmingPracticeMatch: derivedFarmingPracticeMatch ?? 0,
        })
      : heuristicMatchPercentage;

    const aiObservedData = sanitizeAiObservedDataForResponse({
      generatedAt: new Date().toISOString(),
      listingSnapshot: {
        state: listing?.state ?? null,
        cropType: listing?.cropType ?? null,
        areaInHectares: listing?.areaInHectares ?? null,
      },
      derived: {
        stateCode: derivedStateCode,
        stateMatch,
      },
      observed: {
        cropType: openAiSucceeded ? observedCrop : (listingCrop ?? (listing?.cropType ?? null)),
        areaInHectares: openAiSucceeded ? (openAi?.data?.observedAreaHectares ?? null) : (listing?.areaInHectares ?? null),
      },
      geocoding: geo?.success
        ? {
            success: true,
            data: {
              latitude: geo?.data?.latitude ?? null,
              longitude: geo?.data?.longitude ?? null,
              formattedAddress: geo?.data?.formattedAddress ?? null,
            },
          }
        : undefined,
      satellite: satelliteRgb?.success
        ? {
            success: true,
            data: {
              coordinates: satelliteRgb?.data?.coordinates || null,
              metrics: satelliteRgb?.data?.metrics || null,
              image: {
                contentType: satelliteRgb?.data?.image?.contentType || null,
                byteLength: satelliteRgb?.data?.image?.byteLength || null,
              },
            },
          }
        : undefined,
      openaiVision: openAiSucceeded
        ? {
            success: true,
            model: openAi?.model,
            data: openAi?.data,
          }
        : undefined,
      matchComponents: {
        cropTypeMatch: openAiSucceeded ? derivedCropTypeMatch : (stateMatch === null ? 0 : (stateMatch ? 1 : 0)),
        landSizeConfidence: openAiSucceeded ? derivedLandSizeConfidence : heuristicLandSizeConfidence,
        farmingPracticeMatch: openAiSucceeded ? (derivedFarmingPracticeMatch ?? 0) : 0,
      },
      matchPercentage,
    });

    return { aiObservedData, matchPercentage };
  } catch (e) {
    return {
      aiObservedData: {
        generatedAt: new Date().toISOString(),
        observed: {
          cropType: listing?.cropType ?? null,
          areaInHectares: listing?.areaInHectares ?? null,
        },
      },
      matchPercentage: computeHeuristicMatchPercentage({ farmerDeclaredData, listing }),
    };
  }
}

/**
 * GET /api/land-verifications
 * Fetch land verifications with filters and pagination
 */
export async function GET(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request);
    if (error) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const listingId = searchParams.get('listingId');

    // Non-admin users can only query their own listing's verification
    if (user.role !== 'ADMIN') {
      if (!listingId) {
        return Response.json(
          { success: false, message: 'listingId is required' },
          { status: 400 }
        );
      }

      const listing = await CarbonListing.findById(listingId);
      const sellerId = listing?.sellerId || listing?.farmerId;

      if (!listing || String(sellerId) !== String(user.userId)) {
        return Response.json(
          { success: false, message: 'Forbidden: Listing does not belong to you' },
          { status: 403 }
        );
      }
    }

    // Build filters
    const filters = {};
    if (status) filters.status = status;
    if (listingId) filters.listingId = listingId;

    // Fetch verifications with pagination
    const verifications = await LandVerificationRepository.findMany(filters, {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: -1,
    });

    const total = await LandVerificationRepository.count(filters);

    const sanitized = (verifications || []).map((v) => {
      const listing = v?.listingId && typeof v.listingId === 'object' ? v.listingId : null;

      const cleanedAi = sanitizeAiObservedDataForResponse(v?.aiObservedData);

      const existingMatch = v?.matchPercentage;
      const recomputedHeuristic = computeHeuristicMatchPercentage({
        farmerDeclaredData: v?.farmerDeclaredData,
        listing,
        aiObservedData: cleanedAi,
      });

      const derivedMatch =
        // If an older record stored 0 because we couldn't derive a state code,
        // recompute on the fly using improved text normalization.
        (existingMatch === 0 && recomputedHeuristic > 0)
          ? recomputedHeuristic
          : (existingMatch !== null && existingMatch !== undefined)
            ? existingMatch
            : (cleanedAi?.matchPercentage !== null && cleanedAi?.matchPercentage !== undefined)
              ? cleanedAi.matchPercentage
              : (cleanedAi?.matchComponents?.heuristicMatchPercentage !== null && cleanedAi?.matchComponents?.heuristicMatchPercentage !== undefined)
                ? cleanedAi.matchComponents.heuristicMatchPercentage
                : recomputedHeuristic;

      return {
        ...v,
        matchPercentage: derivedMatch,
        aiObservedData: cleanedAi,
      };
    });

    return Response.json(
      {
        success: true,
        message: 'Land verifications fetched successfully',
        data: {
          verifications: sanitized,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching land verifications:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/land-verifications
 * Create a new land verification record
 */
export async function POST(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN', 'FARMER']);
    if (error) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      listingId,
      farmerDeclaredData,
      aiObservedData,
      matchPercentage,
      cropTypeMatch,
      landSizeConfidence,
      farmingPracticeMatch,
    } = body;

    const shouldCalculateMatchPercentageFromInputs =
      cropTypeMatch !== undefined ||
      landSizeConfidence !== undefined ||
      farmingPracticeMatch !== undefined;

    // Validate required fields
    if (!listingId || !farmerDeclaredData) {
      return Response.json(
        {
          success: false,
          message: 'Missing required fields',
          errors: {
            listingId: !listingId ? 'Listing ID is required' : null,
            farmerDeclaredData: !farmerDeclaredData ? 'Farmer declared data is required' : null,
          },
        },
        { status: 400 }
      );
    }

    // Verify listing exists
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    // Farmers can only create verification for their own listing
    if (user.role === 'FARMER') {
      const farmer = await User.findById(user.userId).select('_id');
      if (!farmer) {
        return Response.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      const sellerId = listing.sellerId || listing.farmerId;
      if (String(sellerId) !== String(user.userId)) {
        return Response.json(
          { success: false, message: 'Forbidden: You can only verify your own listings' },
          { status: 403 }
        );
      }
    }

    // Check if verification already exists
    const existingVerification = await LandVerification.findOne({ listingId });
    if (existingVerification) {
      const computedFromOpenAi =
        existingVerification?.aiObservedData?.matchComponents?.matchComputedFromOpenAi === true;

      const shouldBackfill =
        existingVerification.status === 'PENDING' &&
        (!computedFromOpenAi ||
          existingVerification.matchPercentage === null ||
          existingVerification.matchPercentage === undefined ||
          !existingVerification.aiObservedData ||
          (typeof existingVerification.aiObservedData === 'object' &&
            !Array.isArray(existingVerification.aiObservedData) &&
            Object.keys(existingVerification.aiObservedData).length === 0));

      if (shouldBackfill) {
        const computed = await computeAiAndMatch({
          farmerDeclaredData: existingVerification.farmerDeclaredData,
          listing,
        });

        const updated = await LandVerificationRepository.updateById(existingVerification._id, {
          aiObservedData: computed.aiObservedData,
          matchPercentage: computed.matchPercentage,
        });

        return Response.json(
          {
            success: true,
            message: 'Verification already exists for this listing',
            data: updated,
          },
          { status: 200 }
        );
      }

      const fullExisting = await LandVerificationRepository.findByListingId(listingId);
      return Response.json(
        {
          success: true,
          message: 'Verification already exists for this listing',
          data: fullExisting || existingVerification.toJSON(),
        },
        { status: 200 }
      );
    }

    // If client didn't send aiObservedData/match inputs, compute them from location + satellite analysis
    let computedAiObservedData = aiObservedData;
    let computedMatchPercentage = matchPercentage ?? null;

    if (!shouldCalculateMatchPercentageFromInputs && computedMatchPercentage === null) {
      const computed = await computeAiAndMatch({ farmerDeclaredData, listing });
      computedAiObservedData = computed.aiObservedData;
      computedMatchPercentage = computed.matchPercentage;
    } else if (shouldCalculateMatchPercentageFromInputs) {
      computedMatchPercentage = calculateMatchPercentage({ cropTypeMatch, landSizeConfidence, farmingPracticeMatch });
    }

    if (computedMatchPercentage === null || computedMatchPercentage === undefined) {
      computedMatchPercentage = computeHeuristicMatchPercentage({ farmerDeclaredData, listing, aiObservedData: computedAiObservedData });
    }

    // Create verification
    const verification = await LandVerificationRepository.create({
      listingId,
      farmerDeclaredData,
      aiObservedData: sanitizeAiObservedDataForResponse(computedAiObservedData) || {},
      matchPercentage: computedMatchPercentage,
      status: 'PENDING',
    });

    return Response.json(
      {
        success: true,
        message: 'Land verification created successfully',
        data: verification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating land verification:', error);
    return Response.json(
      { success: false, message: 'Failed to create verification' },
      { status: 500 }
    );
  }
}

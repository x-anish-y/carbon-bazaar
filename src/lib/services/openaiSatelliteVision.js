const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

function safeJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  // Prefer a raw JSON response.
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fallthrough
    }
  }

  // Try to extract first JSON object from the text.
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const maybe = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybe);
    } catch {
      return null;
    }
  }

  return null;
}

export function isOpenAiVisionAvailable() {
  return !!OPENAI_API_KEY;
}

/**
 * Analyze a satellite PNG (base64) and return structured observations.
 * Note: crop identification from satellite imagery is inherently uncertain.
 */
export async function analyzeSatellitePngWithOpenAi({
  imageBase64,
  listingSnapshot,
  farmerDeclaredData,
} = {}) {
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      model: OPENAI_VISION_MODEL,
      data: null,
      error: 'OPENAI_API_KEY is not configured',
    };
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return {
      success: false,
      model: OPENAI_VISION_MODEL,
      data: null,
      error: 'Missing imageBase64',
    };
  }

  const prompt = [
    'You are analyzing a satellite true-color image of a farm area in India.',
    'Return ONLY valid JSON (no markdown) with best-effort estimates.',
    '',
    'JSON schema:',
    '{',
    '  "observedCrop": "RICE|WHEAT|SUGARCANE|PULSES|UNKNOWN",',
    '  "observedAreaHectares": number|null,',
    '  "farmingPractices": string[],',
    '  "vegetationHealth": "LOW|MEDIUM|HIGH|UNKNOWN",',
    '  "confidence": { "crop": number, "area": number, "practices": number, "overall": number },',
    '  "notes": string',
    '}',
    '',
    'Use confidences in range 0..1.',
    'If you cannot infer something reliably, set it to UNKNOWN or null and lower confidence.',
    '',
    'Context (declared by farmer / listing snapshot):',
    JSON.stringify({ listingSnapshot: listingSnapshot || null, farmerDeclaredData: farmerDeclaredData || null }),
  ].join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: `data:image/png;base64,${imageBase64}` },
            ],
          },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        model: OPENAI_VISION_MODEL,
        data: null,
        error: `OpenAI error: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`,
      };
    }

    const payload = await response.json();

    // Try multiple possible locations for text output.
    const textOut =
      payload?.output_text ||
      payload?.output?.[0]?.content?.find?.((c) => c?.type === 'output_text')?.text ||
      payload?.output?.[0]?.content?.[0]?.text ||
      null;

    const parsed = safeJsonFromText(textOut || '');
    if (!parsed) {
      return {
        success: false,
        model: OPENAI_VISION_MODEL,
        data: null,
        error: 'OpenAI response could not be parsed as JSON',
      };
    }

    return {
      success: true,
      model: OPENAI_VISION_MODEL,
      data: parsed,
      error: null,
    };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'OpenAI request timed out' : (e?.message || 'OpenAI request failed');
    return {
      success: false,
      model: OPENAI_VISION_MODEL,
      data: null,
      error: msg,
    };
  }
}

/**
 * Calculates a match percentage (0-100) from the weighted components.
 *
 * Weights:
 * - cropTypeMatch: 40%
 * - landSizeConfidence: 30%
 * - farmingPracticeMatch: 30%
 *
 * Each component can be provided as:
 * - boolean (true => 100, false => 0)
 * - number in [0, 1] (treated as ratio and converted to percent)
 * - number in [0, 100] (treated as percent)
 */
export function calculateMatchPercentage({
  cropTypeMatch,
  landSizeConfidence,
  farmingPracticeMatch,
} = {}) {
  const normalizeToPercent = (value) => {
    if (value === true) return 100;
    if (value === false) return 0;
    if (value === null || value === undefined) return 0;

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return 0;

    // Treat 0..1 as ratio
    const percent = numberValue <= 1 && numberValue >= 0 ? numberValue * 100 : numberValue;
    return Math.min(100, Math.max(0, percent));
  };

  const crop = normalizeToPercent(cropTypeMatch);
  const land = normalizeToPercent(landSizeConfidence);
  const practice = normalizeToPercent(farmingPracticeMatch);

  const weighted = (crop * 0.4) + (land * 0.3) + (practice * 0.3);

  // Round to 2 decimals, clamp to 0..100
  const rounded = Math.round(weighted * 100) / 100;
  return Math.min(100, Math.max(0, rounded));
}

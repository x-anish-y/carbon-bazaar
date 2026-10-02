/**
 * India Crops Dropdown Component
 * INDIA-SPECIFIC: Only shows allowed crops (Rice, Wheat, Sugarcane, Pulses)
 */

import { INDIA_CROP_TYPES } from '@/lib/india/constants';

export default function CropTypeDropdown({ value, onChange, disabled = false, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
    >
      <option value="">Select Crop Type</option>
      {Object.entries(INDIA_CROP_TYPES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

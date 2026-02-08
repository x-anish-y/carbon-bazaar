/**
 * Indian States Dropdown Component
 * Displays all 28 states and 8 union territories of India
 */

import { INDIAN_STATES } from '@/lib/india/constants';

export default function StateDropdown({ value, onChange, disabled = false, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-zinc-100 disabled:cursor-not-allowed text-zinc-900 ${className}`}
    >
      <option value="">Select State or Union Territory</option>
      {INDIAN_STATES.map((state) => (
        <option key={state.code} value={state.name}>
          {state.name}
        </option>
      ))}
    </select>
  );
}

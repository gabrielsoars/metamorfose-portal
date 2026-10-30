import { useId } from 'react';
import { C } from '../../data/constants.js';

// Campo controlado das telas de auth (o Input de ui.jsx não aceita value/onChange).
export function AuthField({ label, className = '', ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
      <input
        id={id}
        {...props}
        className={`w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none transition-colors ${className}`}
        onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

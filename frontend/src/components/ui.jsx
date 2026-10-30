import { C } from '../data/constants.js';

export function OrangeBtn({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${className}`}
      style={{ background: C.orange }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
    >
      {children}
    </button>
  );
}

export function Input({ label, type = "text", placeholder, defaultValue, className = "" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${className}`}
        style={{ '--tw-ring-color': C.orange }}
        onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { C } from '../data/constants.js';
import { useEscape } from './hooks.js';

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

// Painel de edição: no celular sobe de baixo (bottom sheet); a partir do tablet é um modal centralizado.
// Fecha pelo fundo escurecido e pela tecla Esc.
export function Sheet({ onClose, labelledBy, children }) {
  const painel = useRef(null);
  useEscape(onClose);

  // Leva o foco para dentro do painel, para o Tab começar pelos campos dele.
  useEffect(() => {
    painel.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center md:justify-center md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="sheet-anim relative w-full max-h-full overflow-y-auto bg-white rounded-t-[2rem] md:max-w-lg md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] md:shadow-2xl outline-none"
      >
        <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

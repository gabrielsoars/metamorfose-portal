import { LayoutDashboard, Users, FileText, User } from 'lucide-react';
import { C } from '../data/constants.js';

export function MobileShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-0 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md h-screen sm:h-[820px] bg-gray-50 sm:rounded-2xl sm:shadow-2xl flex flex-col relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}

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

export function BottomNav({ active, onNav }) {
  const items = [
    { key: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { key: 'turmas', label: 'Turmas', icon: Users },
    { key: 'simulados', label: 'Simulados', icon: FileText },
    { key: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30">
      <div className="flex justify-between items-center px-2 py-1 h-16">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <Icon size={22} style={{ color: isActive ? C.orange : '#9ca3af' }} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold" style={{ color: isActive ? C.orange : '#6b7280' }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

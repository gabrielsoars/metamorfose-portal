import { useState } from 'react';
import { Plus, Search, LogOut, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { C, FALLBACK_PROFESSORS } from '../../data/constants.js';
import { MobileShell } from '../../components/ui.jsx';

export function AdminHomeScreen({ go, professors }) {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = (professors || FALLBACK_PROFESSORS).filter((p) => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === '' || p.subject === subject;
    const matchStatus = statusFilter === 'todos' ? true : statusFilter === 'ativo' ? p.active : !p.active;
    return matchName && matchSubject && matchStatus;
  });

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.orange }}>Painel Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        </div>
        <button
          type="button"
          onClick={() => go('login')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="bg-white px-6 py-4 border-b border-gray-100 z-10 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar professor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border border-transparent outline-none text-sm font-medium focus:bg-white transition-all"
            onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium text-gray-700 appearance-none"
            >
              <option value="">Todas as matérias</option>
              <option value="Matemática">Matemática</option>
              <option value="Física">Física</option>
              <option value="Biologia">Biologia</option>
              <option value="História">História</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium text-gray-700 appearance-none"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-8" style={{ scrollbarWidth: 'none' }}>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum professor encontrado</p>
          </div>
        )}
        {filtered.map((prof) => (
          <button
            key={prof.id}
            type="button"
            onClick={() => go('admin-gestao', prof)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all hover:shadow-md"
            style={{ borderColor: '#f3f4f6', opacity: prof.active ? 1 : 0.65 }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3f4f6')}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm shrink-0"
              style={{ background: prof.active ? C.yellow : '#e5e7eb', color: prof.active ? '#000' : '#6b7280' }}
            >
              {prof.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 leading-tight truncate" style={{ textDecoration: prof.active ? 'none' : 'line-through' }}>
                  {prof.name}
                </h3>
                {!prof.active && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{prof.email}</p>
            </div>
            <ChevronRight size={20} className="text-gray-300 shrink-0" />
          </button>
        ))}
        <div className="h-20" />
      </div>

      <button
        type="button"
        onClick={() => go('admin-cadastro')}
        className="absolute bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>
    </MobileShell>
  );
}

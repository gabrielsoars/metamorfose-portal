import { useState } from 'react';
import { Plus, Search, LogOut, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { C, FALLBACK_PROFESSORS } from '../../data/constants.js';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER, HEADER_TOP } from '../../components/layout.js';

// Colunas da tabela de professores no desktop (avatar, nome, e-mail, matéria, status, seta).
const COLUNAS = 'lg:grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)_5.5rem_1.25rem]';

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
    <AppShell variant="admin">
      <header className={`bg-white px-6 ${HEADER_TOP} pb-4 ${GUTTER} shadow-sm z-10 flex justify-between items-center`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.orange }}>Painel Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        </div>
        <button
          type="button"
          onClick={() => go('login')}
          aria-label="Sair"
          title="Sair"
          className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className={`bg-white px-6 py-4 ${GUTTER} border-b border-gray-100 z-10 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-3`}>
        <div className="relative lg:flex-1">
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

        <div className="flex gap-2 lg:w-[26rem] lg:shrink-0">
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

      <div className={`flex-1 overflow-y-auto p-6 pb-8 ${GUTTER}`} style={{ scrollbarWidth: 'none' }}>
        {/* Celular/tablet: lista de cartões. Desktop: tabela (mesmos elementos, organizados em grade). */}
        <div className="lg:bg-white lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm lg:overflow-hidden">
          {filtered.length > 0 && (
            <div className={`hidden lg:grid ${COLUNAS} gap-4 items-center px-5 py-3 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400`}>
              <span />
              <span>Nome</span>
              <span>E-mail</span>
              <span>Matéria</span>
              <span>Status</span>
              <span />
            </div>
          )}
          <div className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-gray-100">
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
                className={`w-full bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all hover:shadow-md lg:grid ${COLUNAS} lg:px-5 lg:py-3 lg:rounded-none lg:border-0 lg:shadow-none lg:hover:shadow-none lg:hover:bg-gray-50`}
                style={{ borderColor: '#f3f4f6', opacity: prof.active ? 1 : 0.65 }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3f4f6')}
              >
                <div
                  className="w-12 h-12 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-lg lg:text-base border-2 border-white shadow-sm shrink-0"
                  style={{ background: prof.active ? C.yellow : '#e5e7eb', color: prof.active ? '#000' : '#6b7280' }}
                >
                  {prof.initial}
                </div>
                <div className="flex-1 min-w-0 lg:contents">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold text-gray-900 leading-tight truncate" style={{ textDecoration: prof.active ? 'none' : 'line-through' }}>
                      {prof.name}
                    </h3>
                    {!prof.active && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate lg:mt-0 lg:text-sm">{prof.email}</p>
                </div>
                <p className="hidden lg:block text-sm text-gray-600 truncate">{prof.subject}</p>
                <span
                  className={`hidden lg:inline-flex w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${prof.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}
                >
                  {prof.active ? 'Ativo' : 'Inativo'}
                </span>
                <ChevronRight size={20} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
        <div className="h-20" />
      </div>

      <button
        type="button"
        aria-label="Novo cadastro"
        onClick={() => go('admin-cadastro')}
        className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>
    </AppShell>
  );
}

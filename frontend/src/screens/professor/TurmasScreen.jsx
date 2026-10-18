import { useState } from 'react';
import { Plus, Search, Users, ChevronRight } from 'lucide-react';
import { C, FALLBACK_TURMAS } from '../../data/constants.js';
import { MobileShell, BottomNav } from '../../components/ui.jsx';

export function TurmasScreen({ go, turmas, onRefresh }) {
  const [search, setSearch] = useState('');
  const filtered = (turmas || FALLBACK_TURMAS).filter((t) => (t.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Gestão de Alunos</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Minhas Turmas</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>P</div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar turma por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {filtered.map((turma) => (
          <button
            key={turma.id}
            type="button"
            onClick={() => go('turma-detalhes', turma)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all hover:shadow-md"
            style={{ borderColor: turma.empty ? '#d1d5db' : '#f3f4f6', borderStyle: turma.empty ? 'dashed' : 'solid' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = turma.empty ? '#d1d5db' : '#f3f4f6')}
          >
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center font-bold" style={{ color: C.orange }}>
              <span className="text-sm leading-none">{turma.code}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{turma.name}</h3>
              {turma.empty ? (
                <div className="flex items-center gap-1.5 mt-1" style={{ color: C.orange }}>
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="text-xs font-bold">Adicionar Alunos</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                  <Users size={14} />
                  <span className="text-xs font-semibold">{turma.alunos} Alunos</span>
                </div>
              )}
            </div>
            {!turma.empty && <ChevronRight size={20} className="text-gray-300" />}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go('turma-cadastro')}
        className="absolute bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>

      <BottomNav active="turmas" onNav={(tab) => {
        if (tab === 'dashboard') go('prof-dashboard');
        else if (tab === 'simulados') go('simulados-lista');
        else if (tab === 'perfil') go('prof-perfil');
      }} />
    </MobileShell>
  );
}

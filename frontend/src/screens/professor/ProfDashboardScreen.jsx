import { LogOut, ChevronDown, Bell, TrendingUp } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, BottomNav } from '../../components/ui.jsx';

export function ProfDashboardScreen({ go, turmas }) {
  const bars = [
    { month: 'Mar', pct: 45, height: 48 },
    { month: 'Abr', pct: 52, height: 64 },
    { month: 'Mai', pct: 48, height: 52 },
    { month: 'Jun', pct: 68, height: 96, current: true },
  ];

  const critical = [
    { q: 'Questão 12', pct: 82, color: '#ef4444' },
    { q: 'Questão 24', sub: 'Física', pct: 65, color: '#f97316' },
    { q: 'Questão 08', sub: 'Matemática', pct: 58, color: '#f97316' },
  ];

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>
            P
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Visão Geral</p>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Olá, Prof. Pedro</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="relative w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full border border-white" style={{ background: C.orange }} />
          </button>
          <button
            type="button"
            onClick={() => go('login')}
            className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10 space-y-2">
        <div className="flex gap-2">
          {[
            ['Todas as Turmas', 'Extensivo Noturno', 'Intensivo Sábado'],
            ['Último Simulado', '1º Simulado ENEM', 'Prova Diagnóstica']
          ].map((opts, i) => (
            <div key={i} className="relative flex-1">
              <select className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700 appearance-none">
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-24" style={{ scrollbarWidth: 'none' }}>
        <div className="rounded-2xl p-5 text-white shadow-md relative overflow-hidden" style={{ background: C.orange }}>
          <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Média de Acertos</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black leading-none">68%</h2>
            <span className="flex items-center text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md mb-1">
              <TrendingUp size={12} className="mr-1" /> +5%
            </span>
          </div>
          <p className="text-white/70 text-[10px] mt-2 font-medium">Comparado ao simulado anterior</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Atenção: Alto índice de erro</h3>
            <button type="button" className="text-[10px] font-bold uppercase hover:underline" style={{ color: C.orange }}>Ver todas</button>
          </div>
          <div className="space-y-4">
            {critical.map(({ q, sub, pct, color }) => (
              <div key={q}>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-xs font-bold text-gray-800">
                    {q} {sub && <span className="text-[9px] text-gray-400 font-normal ml-1">({sub})</span>}
                  </p>
                  <p className="text-xs font-bold" style={{ color }}>{pct}% erraram</p>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Desempenho por Simulado</h3>
          <div className="h-32 flex items-end gap-3 px-2">
            {bars.map(({ month, pct, height, current }) => (
              <div key={month} className="flex-1 flex flex-col items-center group">
                <span className="text-[10px] font-bold mb-1" style={{ color: current ? C.orange : '#9ca3af' }}>{pct}%</span>
                <div className="w-full rounded-t-md transition-colors" style={{ height, background: current ? C.yellow : '#e5e7eb' }} />
                <p className="text-[9px] font-bold mt-2" style={{ color: current ? C.orange : '#9ca3af' }}>{month}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="dashboard" onNav={(tab) => {
        if (tab === 'turmas') go('prof-turmas');
        else if (tab === 'simulados') go('simulados-lista');
        else if (tab === 'perfil') go('prof-perfil');
      }} />
    </MobileShell>
  );
}

import { ArrowLeft, Info } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

export function TurmaCadastroScreen({ go }) {
  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('prof-turmas')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Cadastro</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Nova Turma</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 p-6 space-y-6">
        <div className="rounded-xl p-4 flex gap-3 border" style={{ background: `${C.yellow}33`, borderColor: `${C.yellow}88` }}>
          <Info size={20} className="shrink-0" style={{ color: C.orange }} />
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Crie a turma primeiro. Você poderá adicionar a lista de alunos (CSV ou manual) na próxima tela.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Nome de Identificação</label>
          <input
            type="text"
            placeholder="Ex: Extensivo Noturno - 2026"
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none text-gray-800 font-medium"
            onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <OrangeBtn onClick={() => go('prof-turmas')}>Salvar Turma</OrangeBtn>
      </div>
    </MobileShell>
  );
}

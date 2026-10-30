import { LogOut, ChevronRight, Info, KeyRound } from 'lucide-react';
import { C } from '../../data/constants.js';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';

export function ProfPerfilScreen({ go }) {
  return (
    <AppShell go={go} active="perfil" onNav={(tab) => {
      if (tab === 'dashboard') go('prof-dashboard');
      else if (tab === 'turmas') go('prof-turmas');
      else if (tab === 'simulados') go('simulados-lista');
    }}>
      <header className={`bg-white ${HEADER_TOP} pb-6 px-6 shadow-sm z-20 flex flex-col items-center justify-center border-b border-gray-100`}>
        <div className="w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-black font-black text-2xl mb-3" style={{ background: C.yellow }}>
          P
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-none">Prof. Pedro</h1>
        <p className="text-xs font-medium text-gray-500 mt-1">pedro@unesp.br</p>
        <span className="mt-2 inline-block px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
          Professor • Matemática
        </span>
      </header>

      <div className={`flex-1 overflow-y-auto p-6 space-y-6 pb-8 ${GUTTER_FORM}`} style={{ scrollbarWidth: 'none' }}>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Configurações da Conta</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <KeyRound size={16} />
                </div>
                <span className="text-sm font-bold text-gray-700">Alterar Senha</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button type="button" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <Info size={16} />
                </div>
                <span className="text-sm font-bold text-gray-700">Suporte e Ajuda</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <button type="button" onClick={() => go('login')} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 active:scale-[0.98] transition-all">
          <LogOut size={20} /> Sair da Conta
        </button>
      </div>
    </AppShell>
  );
}

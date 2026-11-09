import { LogOut, Bell } from 'lucide-react';
import { C } from '../../data/constants.js';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER, HEADER_TOP } from '../../components/layout.js';
import { useQuestoesErro, FiltrosQuestoes, QuestoesErroLista } from './QuestoesErroScreen.jsx';
import { MediaAcertosCard } from './MediaAcertosCard.jsx';
import { HistoricoMensalCard } from './HistoricoMensalCard.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rotas, filtroDaUrl } from '../../routes/rotas.js';
import { useSair } from '../../routes/sessao.jsx';

export function ProfDashboardScreen() {
  const navigate = useNavigate();
  const sair = useSair();
  const [searchParams] = useSearchParams();
  // O filtro fica na URL (?turma=&simulado=): sobrevive ao F5 e ao voltar. Trocar o filtro substitui a entrada.
  const questoes = useQuestoesErro(filtroDaUrl(searchParams), (novo) => navigate(rotas.painel(novo), { replace: true }));

  return (
    <AppShell active="dashboard" onNav={(tab) => {
      if (tab === 'turmas') navigate(rotas.turmas);
      else if (tab === 'simulados') navigate(rotas.simulados);
      else if (tab === 'perfil') navigate(rotas.perfil);
    }}>
      <header className={`bg-white px-6 ${HEADER_TOP} pb-4 ${GUTTER} shadow-sm z-20 flex justify-between items-center`}>
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
          <button type="button" aria-label="Notificações" className="relative w-11 h-11 md:w-10 md:h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full border border-white" style={{ background: C.orange }} />
          </button>
          <button
            type="button"
            onClick={sair}
            aria-label="Sair"
            className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className={`bg-white px-6 pb-4 ${GUTTER} border-b border-gray-100 z-10 space-y-2 lg:[&>div]:max-w-2xl`}>
        <FiltrosQuestoes q={questoes} />
      </div>

      <div className={`flex-1 overflow-y-auto p-6 pb-8 ${GUTTER} grid content-start gap-5 md:grid-cols-2 lg:gap-6`} style={{ scrollbarWidth: 'none' }}>
        <MediaAcertosCard q={questoes} />

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Atenção: Alto índice de erro</h3>
            <button
              type="button"
              onClick={() => navigate(rotas.questoesErro(questoes.filtro))}
              disabled={!questoes.simulado}
              className="text-[10px] font-bold uppercase hover:underline disabled:opacity-40 disabled:no-underline"
              style={{ color: C.orange }}
            >
              Ver todas
            </button>
          </div>
          <QuestoesErroLista q={questoes} limite={3} />
        </div>

        <HistoricoMensalCard q={questoes} />
      </div>
    </AppShell>
  );
}

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, X, Ban, Clock, Camera } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterCorrecaoAluno } from '../../services/simuladosService.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER, GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';

// Colunas da tabela de questões no desktop.
const COLUNAS = 'lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_7rem]';

export function BoletimScreen({ go, simulado, aluno }) {
  // undefined = carregando; depois o retorno de GET /simulados/{id}/alunos/{aluno_id}.
  const [correcao, setCorrecao] = useState(undefined);

  useEffect(() => {
    let isMounted = true;

    obterCorrecaoAluno(simulado.id, aluno.id)
      .then((resposta) => {
        if (isMounted) setCorrecao(resposta);
      })
      .catch((error) => {
        if (isMounted) {
          setCorrecao(null);
          window.alert(error.message || 'Não foi possível carregar o boletim.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [simulado.id, aluno.id]);

  const corrigido = correcao?.status === 'CORRIGIDO';
  const detalhamento = corrigido ? correcao.detalhamento : [];
  const anuladas = detalhamento.filter((d) => d.anulada).length;
  const erros = detalhamento.filter((d) => !d.correto).length;
  const total = correcao?.total_questoes || 0;
  const pct = total ? Math.round((correcao.acertos / total) * 100) : 0;

  return (
    <AppShell go={go} active="simulados" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 ${GUTTER} shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => go('simulado-painel')} aria-label="Voltar ao painel" className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Boletim · {simulado.titulo}</p>
          <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{aluno.name}</h1>
        </div>
        <div className="w-11 h-11 md:w-10 md:h-10" />
      </header>

      {correcao === undefined && (
        <p className="p-6 text-sm font-semibold text-gray-500 text-center">Carregando boletim...</p>
      )}

      {correcao === null && (
        <p className="p-6 text-sm font-semibold text-gray-500 text-center">Não foi possível carregar o boletim.</p>
      )}

      {correcao && !corrigido && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Clock size={28} />
          </div>
          <h2 className="text-base font-bold text-gray-900">Ainda não corrigido</h2>
          <p className="text-sm text-gray-500">Este aluno ainda não tem correção salva neste simulado.</p>
          <OrangeBtn onClick={() => go('escaneamento', aluno)} className="mt-2">
            <Camera size={18} /> Escanear
          </OrangeBtn>
        </div>
      )}

      {corrigido && (
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)] lg:gap-6 lg:py-6 lg:px-[max(2rem,calc((100%-1200px)/2))]">
          <div className={`bg-white px-6 py-5 ${GUTTER_FORM} border-b border-gray-100 z-10 shadow-sm lg:p-5 lg:self-start lg:rounded-2xl lg:border lg:border-gray-100`}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Nota geral</p>
                <p className="text-3xl font-black text-emerald-600">{correcao.nota}</p>
              </div>
              <span className="text-lg font-bold" style={{ color: C.orange }}>{pct}%</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs font-bold text-gray-500">
              <span>{correcao.acertos} acertos</span>
              <span>{erros} erros</span>
              <span>{anuladas} anuladas</span>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-6 space-y-2 pb-8 ${GUTTER_FORM} lg:p-0`} style={{ scrollbarWidth: 'none' }}>
            <div className={`hidden lg:grid ${COLUNAS} gap-4 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400`}>
              <span>Questão</span>
              <span>Resposta do aluno</span>
              <span>Gabarito</span>
              <span>Resultado</span>
            </div>
            {detalhamento.map((d) => (
              <div
                key={d.questao}
                data-testid={`questao-${d.questao}`}
                className={`flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm lg:grid ${COLUNAS} lg:gap-4 lg:py-2`}
                style={{ borderColor: d.anulada ? '#fde68a' : d.correto ? '#d1fae5' : '#fecaca' }}
              >
                <div className="flex items-center gap-3 lg:contents">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center font-bold text-sm text-gray-700">
                    {String(d.questao).padStart(2, '0')}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 leading-tight lg:contents">
                    <p className="lg:text-sm"><span className="lg:hidden">Aluno: </span><span className="font-bold text-gray-900">{d.resposta_aluno || 'Em branco'}</span></p>
                    <p className="lg:text-sm"><span className="lg:hidden">Gabarito: </span><span className="font-bold text-gray-900">{d.resposta_correta || '—'}</span></p>
                  </div>
                </div>
                {d.anulada ? (
                  <span className="inline-flex lg:w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase tracking-wider">
                    <Ban size={10} strokeWidth={3} /> Anulada
                  </span>
                ) : d.correto ? (
                  <span className="inline-flex lg:w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    <Check size={10} strokeWidth={3} /> Acerto
                  </span>
                ) : (
                  <span className="inline-flex lg:w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                    <X size={10} strokeWidth={3} /> Erro
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

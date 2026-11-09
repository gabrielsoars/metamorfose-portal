import { useEffect, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterResumoSimulado, formatarPercentual, formatarVariacao } from '../../services/estatisticasService.js';

// Resumo (média + comparação com o anterior) do simulado/turma escolhidos no filtro.
export function useResumoSimulado(simulado, turmaId) {
  const [resultado, setResultado] = useState(null);
  const chave = simulado ? `${simulado.id}:${turmaId}` : null;

  useEffect(() => {
    if (!simulado) return undefined;
    let isMounted = true;
    obterResumoSimulado(simulado.id, turmaId)
      .then((dados) => {
        if (isMounted) setResultado({ chave, ...dados });
      })
      .catch(() => {
        if (isMounted) setResultado({ chave, erro: true });
      });
    return () => {
      isMounted = false;
    };
    // `simulado` só muda de identidade quando a lista é recarregada; a chave basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return {
    carregando: !!simulado && resultado?.chave !== chave,
    resumo: resultado?.chave === chave ? resultado : null,
  };
}

function Variacao({ pp }) {
  const Icone = pp > 0 ? TrendingUp : pp < 0 ? TrendingDown : Minus;
  return (
    <span className="flex items-center text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md mb-1" data-testid="variacao-media">
      <Icone size={12} className="mr-1" aria-hidden="true" /> {formatarVariacao(pp)}
    </span>
  );
}

// Texto de rodapé do card: estado vazio/carregando/erro ou a comparação com o anterior.
function rodape(q, { carregando, resumo }) {
  if (q.carregandoFiltros || carregando) return 'Calculando média...';
  if (!q.simulado) return 'Selecione um simulado para ver a média.';
  if (resumo?.erro) return 'Não foi possível carregar a média.';
  if (resumo.corrigidos === 0) return 'Sem correções para calcular a média.';
  const base = `${resumo.corrigidos} ${resumo.corrigidos === 1 ? 'prova corrigida' : 'provas corrigidas'}`;
  if (!resumo.anterior) return `${base} · Primeiro simulado com correções${q.turmaId ? ' desta turma' : ''}.`;
  return `${base} · Comparado a ${resumo.anterior.titulo} (${formatarPercentual(resumo.anterior.media_percentual)})`;
}

// Card laranja do dashboard. `q` é o retorno de useQuestoesErro (filtro de turma/simulado).
export function MediaAcertosCard({ q }) {
  const estado = useResumoSimulado(q.simulado, q.turmaId);
  const { resumo } = estado;
  const media = resumo && !resumo.erro ? resumo.media_percentual : null;

  return (
    <section aria-label="Média de acertos" className="md:col-span-2 rounded-2xl p-5 text-white shadow-md relative overflow-hidden" style={{ background: C.orange }}>
      <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
      <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Média de Acertos</p>
      <div className="flex items-end gap-2">
        <h2 className="text-4xl font-black leading-none" data-testid="media-acertos">{media === null ? '—' : formatarPercentual(media)}</h2>
        {media !== null && resumo.variacao_pp !== null && <Variacao pp={resumo.variacao_pp} />}
      </div>
      <p className="text-white/70 text-[10px] mt-2 font-medium">{rodape(q, estado)}</p>
    </section>
  );
}


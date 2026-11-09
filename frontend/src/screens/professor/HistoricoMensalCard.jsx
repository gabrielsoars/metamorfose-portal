import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C } from '../../data/constants.js';
import {
  extrairAnoMes,
  formatarMesCurto,
  formatarPercentual,
  obterHistoricoMensal,
} from '../../services/estatisticasService.js';

export function useHistoricoMensal(turmaId) {
  const [resultado, setResultado] = useState(null);
  const chave = String(turmaId ?? '');

  useEffect(() => {
    let isMounted = true;
    obterHistoricoMensal(turmaId)
      .then((dados) => {
        if (isMounted) setResultado({ chave, ...dados });
      })
      .catch(() => {
        if (isMounted) setResultado({ chave, erro: true });
      });
    return () => {
      isMounted = false;
    };
  }, [chave, turmaId]);

  return {
    carregando: resultado?.chave !== chave,
    historico: resultado?.chave === chave ? resultado : null,
  };
}

function TooltipHistorico({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const txtSimulados = `${item.simulados} ${item.simulados === 1 ? 'simulado' : 'simulados'}`;
  const txtProvas = `${item.corrigidos} ${item.corrigidos === 1 ? 'prova' : 'provas'}`;
  return (
    <div className="bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-md">
      <p className="font-bold">{item.rotulo} · {formatarPercentual(item.media_percentual)}</p>
      <p className="text-gray-300">{txtSimulados} · {txtProvas}</p>
    </div>
  );
}

// Card de desempenho histórico mensal com Recharts.
// Obedece apenas ao filtro de turma (`q.turmaId`) e destaca o mês de `q.simulado`.
export function HistoricoMensalCard({ q }) {
  const { carregando, historico } = useHistoricoMensal(q.turmaId);
  const mesSelecionado = q.simulado ? extrairAnoMes(q.simulado.data_aplicacao) : '';

  let mensagem = null;
  if (q.carregandoFiltros || carregando) mensagem = 'Carregando histórico...';
  else if (historico?.erro) mensagem = 'Não foi possível carregar o histórico.';
  else if (!historico?.pontos?.length) mensagem = 'Sem histórico de correções ainda.';

  const dados = (historico?.pontos || []).map((p) => ({
    ...p,
    rotulo: formatarMesCurto(p.mes),
    atual: p.mes === mesSelecionado,
  }));

  return (
    <section aria-label="Desempenho mensal" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-gray-900 text-sm mb-4">Desempenho mensal</h3>
      {mensagem ? (
        <p className="text-xs text-gray-400 text-center py-4">{mensagem}</p>
      ) : (
        <>
          <div className="h-36 w-full" data-testid="grafico-historico">
            <ResponsiveContainer width="100%" height={144} minWidth={200}>
              <BarChart data={dados} margin={{ top: 18, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="rotulo"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<TooltipHistorico />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="media_percentual" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="media_percentual"
                    position="top"
                    formatter={(v) => formatarPercentual(v)}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }}
                  />
                  {dados.map((entry) => (
                    <Cell key={entry.mes} fill={entry.atual ? C.yellow : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only" aria-label="Resumo mensal">
            {dados.map((d) => (
              <li key={d.mes} data-testid={`ponto-historico-${d.mes}`} data-atual={d.atual ? 'true' : 'false'}>
                {d.rotulo}: {formatarPercentual(d.media_percentual)} ({d.simulados} {d.simulados === 1 ? 'simulado' : 'simulados'}, {d.corrigidos} {d.corrigidos === 1 ? 'prova' : 'provas'})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}


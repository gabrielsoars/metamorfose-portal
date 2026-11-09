import { requestJson } from './api.js';

const comTurma = (path, turmaId) => (turmaId ? `${path}?turma_id=${encodeURIComponent(turmaId)}` : path);

// Média de acertos do simulado (da turma, se informada) e comparação com o simulado anterior.
// { simulado_id, turma_id, corrigidos, media_percentual, anterior: { simulado_id, titulo, media_percentual } | null, variacao_pp }
export function obterResumoSimulado(simuladoId, turmaId = '') {
  return requestJson(comTurma(`/simulados/${simuladoId}/resumo`, turmaId));
}

// Questões mais erradas do simulado (da turma, se informada), já calculadas no backend.
// { simulado_id, turma_id, corrigidos, questoes: [{ questao, erros, total, pct }] }
export function obterQuestoesErroSimulado(simuladoId, turmaId = '', limite) {
  const params = new URLSearchParams();
  if (turmaId) params.set('turma_id', turmaId);
  if (limite) params.set('limite', String(limite));
  const query = params.toString();
  return requestJson(`/simulados/${simuladoId}/questoes-erro${query ? `?${query}` : ''}`);
}


// Histórico mensal de desempenho (obedece apenas ao filtro de turma).
// { turma_id, pontos: [{ mes: 'YYYY-MM', media_percentual, simulados, corrigidos }] }
export function obterHistoricoMensal(turmaId = '', meses = 6) {
  const params = new URLSearchParams();
  if (turmaId) params.set('turma_id', turmaId);
  if (meses) params.set('meses', String(meses));
  const query = params.toString();
  return requestJson(`/estatisticas/historico${query ? `?${query}` : ''}`);
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// '2026-06' -> 'Jun'
export function formatarMesCurto(anoMes) {
  const match = /^\d{4}-(\d{2})$/.exec(String(anoMes ?? ''));
  if (!match) return String(anoMes ?? '');
  const idx = Number(match[1]) - 1;
  return MESES_CURTOS[idx] || String(anoMes);
}

// Extrai 'YYYY-MM' de uma data 'YYYY-MM-DD'.
export function extrairAnoMes(dataAplicacao) {
  return String(dataAplicacao ?? '').slice(0, 7);
}


const numero = (valor) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// 68.2 -> "68,2%"; 68 -> "68%"
export const formatarPercentual = (valor) => `${numero(valor)}%`;

// Variação em pontos percentuais: 5.2 -> "+5,2 p.p."; -3 -> "-3 p.p."; 0 -> "0 p.p."
export const formatarVariacao = (pp) => `${pp > 0 ? '+' : ''}${numero(pp)} p.p.`;


import { requestJson } from './api.js';

export function listarSimulados() {
  return requestJson('/simulados');
}

export function obterSimulado(id) {
  return requestJson(`/simulados/${id}`);
}

export function criarSimulado(simulado) {
  return requestJson('/simulados', {
    method: 'POST',
    body: JSON.stringify(simulado),
  });
}

export function atualizarSimulado(id, dados) {
  return requestJson(`/simulados/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export function excluirSimulado(id) {
  return requestJson(`/simulados/${id}`, { method: 'DELETE' });
}

export function obterGabarito(id) {
  return requestJson(`/simulados/${id}/gabarito`);
}

export function salvarGabarito(id, itens) {
  return requestJson(`/simulados/${id}/gabarito`, {
    method: 'PUT',
    body: JSON.stringify(itens),
  });
}

export function listarAlunosDoSimulado(id) {
  return requestJson(`/simulados/${id}/alunos`);
}

export function obterCorrecaoAluno(simuladoId, alunoId) {
  return requestJson(`/simulados/${simuladoId}/alunos/${alunoId}`);
}

export function salvarRespostasAluno(simuladoId, alunoId, respostas) {
  return requestJson(`/simulados/${simuladoId}/alunos/${alunoId}`, {
    method: 'PUT',
    body: JSON.stringify({ respostas }),
  });
}

// Item de GET /simulados/{id}/alunos. A nota ("acertos/total") vem pronta do backend.
export const normalizeAlunoSimulado = (item) => ({
  id: item.id,
  name: item.nome || 'Aluno',
  turma: item.turma,
  corrected: item.status === 'CORRIGIDO',
  nota: item.nota,
});

// O backend só aceita questões que têm gabarito e rejeita as acima de total_questoes;
// questão sem resposta vai como null (em branco).
export function montarRespostas(gabarito, answers, totalQuestoes) {
  return gabarito
    .filter((g) => g.num_questao <= totalQuestoes)
    .map((g) => ({ questao: g.num_questao, resposta_marcada: answers[g.num_questao] || null }));
}

// Respostas salvas (detalhamento de GET /simulados/{id}/alunos/{aluno_id}) no formato { numQuestao: 'A' }.
export function respostasSalvas(correcao) {
  const answers = {};
  (correcao?.detalhamento || []).forEach((d) => {
    if (d.resposta_aluno) answers[d.questao] = d.resposta_aluno;
  });
  return answers;
}

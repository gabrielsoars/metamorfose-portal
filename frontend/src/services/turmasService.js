import { requestJson } from './api.js';

export const normalizeTurma = (turma) => {
  const alunos = Number.isFinite(Number(turma.alunos)) ? Number(turma.alunos) : null;

  return {
    id: turma.id,
    code: (turma.nome || turma.name || 'T').split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase() || 'TUR',
    name: turma.nome || turma.name || 'Turma',
    alunos: alunos ?? 0,
    empty: alunos === 0,
    turno: turma.turno || 'Manhã',
    ano: turma.ano || 2026,
  };
};

export function listarTurmas() {
  return requestJson('/turmas');
}

export function obterTurma(id) {
  return requestJson(`/turmas/${id}`);
}

export function criarTurma(turma) {
  return requestJson('/turmas', {
    method: 'POST',
    body: JSON.stringify(turma),
  });
}

export function atualizarTurma(id, turma) {
  return requestJson(`/turmas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(turma),
  });
}

export function excluirTurma(id) {
  return requestJson(`/turmas/${id}`, { method: 'DELETE' });
}
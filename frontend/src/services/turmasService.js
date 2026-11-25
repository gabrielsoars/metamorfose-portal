import { requestJson } from './api.js';

export const normalizeTurma = (turma) => {
  const nome = turma.nome || turma.name || 'Turma';
  const partes = nome.replace(/^\[[^\]]+\]\s*/, '').trim().split(/\s+/).filter(Boolean);
  const palavras = partes.length ? partes : nome.split(/\s+/).filter(Boolean);
  const rawAlunos = turma.alunos ?? (Array.isArray(turma.alunos_list) ? turma.alunos_list.length : undefined);
  const parsed = rawAlunos !== undefined && rawAlunos !== null && rawAlunos !== '' ? Number(rawAlunos) : NaN;
  const alunos = Number.isFinite(parsed) ? parsed : 0;

  return {
    id: turma.id,
    code: palavras.map((p) => p[0]).join('').slice(0, 3).toUpperCase() || 'TUR',
    name: nome,
    alunos,
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
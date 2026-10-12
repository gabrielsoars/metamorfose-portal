import { requestJson } from './api.js';

export const normalizeAluno = (aluno) => ({
  id: aluno.id,
  name: aluno.nome || aluno.name || 'Aluno',
  matricula: String(aluno.matricula || aluno.id || '0000'),
  initial: (aluno.nome || aluno.name || 'A').charAt(0).toUpperCase(),
});

export function listarAlunosDaTurma(turmaId) {
  return requestJson(`/turmas/${turmaId}/alunos`);
}

export function criarAluno(turmaId, aluno) {
  return requestJson(`/turmas/${turmaId}/alunos`, {
    method: 'POST',
    body: JSON.stringify(aluno),
  });
}

export function atualizarAluno(id, aluno) {
  return requestJson(`/alunos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(aluno),
  });
}
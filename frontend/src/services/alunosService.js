import { API_BASE_URL, fetchComToken, requestJson } from './api.js';

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

// Não usa requestJson: ele força Content-Type: application/json, o que quebra o upload multipart.
// Sem definir o Content-Type, o navegador monta o boundary correto e fetchComToken envia o Bearer token.
export async function importarAlunosCsv(turmaId, arquivo) {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const response = await fetchComToken(`${API_BASE_URL}/turmas/${turmaId}/alunos/importar`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = 'Não foi possível importar os alunos.';
    try {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') detail = payload.detail;
    } catch {
      // Mantém a mensagem padrão.
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function atualizarAluno(id, aluno) {
  return requestJson(`/alunos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(aluno),
  });
}

export function excluirAluno(id) {
  return requestJson(`/alunos/${id}`, { method: 'DELETE' });
}
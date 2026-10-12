import { requestJson } from './api.js';

export const normalizeUsuario = (usuario) => ({
  id: usuario.id,
  name: usuario.nome || usuario.name || 'Usuário',
  email: usuario.email || '',
  subject: usuario.materia || usuario.subject || 'Sem disciplina',
  active: usuario.ativo !== false,
  initial: (usuario.nome || usuario.name || 'U').charAt(0).toUpperCase(),
  tipo: usuario.tipo ?? 1,
});

export function listarUsuarios() {
  return requestJson('/usuarios');
}

export function criarUsuario(usuario) {
  return requestJson('/usuarios', {
    method: 'POST',
    body: JSON.stringify(usuario),
  });
}

export function atualizarUsuario(id, usuario) {
  return requestJson(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(usuario),
  });
}
import { requestJson } from './api.js';

const post = (path, body) => requestJson(path, { method: 'POST', body: JSON.stringify(body) });

// 202: a resposta é sempre a mesma, exista ou não o e-mail.
export function esqueciSenha(email) {
  return post('/auth/esqueci-senha', { email });
}

// 204. Código inválido ou expirado volta como 400 com a mensagem do backend.
export function redefinirSenha({ email, codigo, senha }) {
  return post('/auth/redefinir-senha', { email, codigo, senha });
}

// 202. O backend aceita no máximo um envio por minuto para cada e-mail.
export function reenviarAtivacao(email) {
  return post('/auth/reenviar-ativacao', { email });
}

import { requestJson } from './api.js';

const post = (path, corpo) => requestJson(path, { method: 'POST', body: JSON.stringify(corpo), publico: true });

export const login = (email, senha) => post('/auth/login', { email, senha });

// Logo após o login o token ainda não está na sessão, por isso vai explícito.
export const obterUsuarioLogado = (token) =>
  requestJson('/auth/me', { headers: { Authorization: `Bearer ${token}` }, publico: true });

export const ativarConta = (email, codigo, senha) => post('/auth/ativar', { email, codigo, senha });

export const reenviarAtivacao = (email) => post('/auth/reenviar-ativacao', { email });

export const esqueciSenha = (email) => post('/auth/esqueci-senha', { email });

export const redefinirSenha = (email, codigo, senha) => post('/auth/redefinir-senha', { email, codigo, senha });

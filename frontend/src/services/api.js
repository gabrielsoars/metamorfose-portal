import { encerrarSessao, lerSessao } from './sessao.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// fetch com o token da sessão. Se a API recusar o token (401), encerra a sessão.
// `publico: true` (login, ativação...) não manda o token: um 401 ali é senha errada, não sessão vencida.
export async function fetchComToken(url, { publico = false, ...options } = {}) {
  const sessao = publico ? null : lerSessao();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 401 && sessao) encerrarSessao();
  return response;
}

export async function requestJson(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const response = await fetchComToken(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers: {
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Endpoint não disponível: ${path}`;
    try {
      const payload = await response.json();
      detail = payload?.detail ? String(payload.detail) : detail;
    } catch (error) {
      detail = detail;
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

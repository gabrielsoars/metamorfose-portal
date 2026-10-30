export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function requestJson(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      // Em 422 o FastAPI devolve uma lista de { loc, msg, type }.
      if (Array.isArray(payload?.detail)) {
        const mensagens = payload.detail.map((item) => item?.msg ?? String(item)).filter(Boolean);
        if (mensagens.length) detail = mensagens.join('; ');
      } else if (payload?.detail) {
        detail = String(payload.detail);
      }
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

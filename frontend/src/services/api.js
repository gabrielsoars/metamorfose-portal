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
      detail = payload?.detail ? String(payload.detail) : detail;
    } catch (error) {
      detail = detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

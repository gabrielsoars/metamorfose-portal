import { requestJson } from './api.js';

export function listarSimulados() {
  return requestJson('/simulados');
}

export function obterSimulado(id) {
  return requestJson(`/simulados/${id}`);
}

export function criarSimulado(simulado) {
  return requestJson('/simulados', {
    method: 'POST',
    body: JSON.stringify(simulado),
  });
}

export function atualizarSimulado(id, dados) {
  return requestJson(`/simulados/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export function excluirSimulado(id) {
  return requestJson(`/simulados/${id}`, { method: 'DELETE' });
}

export function obterGabarito(id) {
  return requestJson(`/simulados/${id}/gabarito`);
}

export function salvarGabarito(id, itens) {
  return requestJson(`/simulados/${id}/gabarito`, {
    method: 'PUT',
    body: JSON.stringify(itens),
  });
}

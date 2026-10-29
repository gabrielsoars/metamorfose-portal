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

export function obterGabarito(id) {
  return requestJson(`/simulados/${id}/gabarito`);
}

export function salvarGabarito(id, itens) {
  return requestJson(`/simulados/${id}/gabarito`, {
    method: 'PUT',
    body: JSON.stringify(itens),
  });
}

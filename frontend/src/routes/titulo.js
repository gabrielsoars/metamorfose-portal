import { useEffect } from 'react';

// Título da aba, que também aparece no histórico do navegador (ex.: "Turma 3º A · Metamorfose").
// Sem título (ex.: enquanto carrega) mantém o atual.
export function useTitulo(titulo) {
  useEffect(() => {
    if (titulo) document.title = `${titulo} · Metamorfose`;
  }, [titulo]);
}

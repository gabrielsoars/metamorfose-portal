import { useEffect, useState } from 'react';

// Contagem regressiva em segundos. Retorna [segundosRestantes, iniciar].
export function useCooldown() {
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (restante <= 0) return undefined;
    const timer = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [restante]);

  return [restante, setRestante];
}

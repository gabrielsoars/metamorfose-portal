import { useEffect, useState } from 'react';

// Largura a partir da qual o layout vira desktop (Tailwind `lg`).
export const DESKTOP_QUERY = '(min-width: 1024px)';

function consultar(query) {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches;
}

// true enquanto a media query casar; acompanha o redimensionamento da janela.
// Sem matchMedia (ex.: testes em jsdom) devolve false, ou seja, o layout de celular.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => consultar(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const atualizar = () => setMatches(media.matches);
    media.addEventListener?.('change', atualizar);
    return () => media.removeEventListener?.('change', atualizar);
  }, [query]);

  return matches;
}

// Chama `onEscape` quando a tecla Esc é pressionada (modais e menus).
export function useEscape(onEscape, ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onEscape, ativo]);
}

import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { entrarComo, semSessao } from './sessao.js';
import { limparAvisos } from '../components/avisosEstado.js';

configure({ asyncUtilTimeout: 5000 });

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Toda tela privada exige login: cada teste começa logado como admin (que abre todas as rotas).
// Testes de login e de rotas sem sessão chamam `semSessao()` antes de renderizar.
beforeEach(() => entrarComo());
afterEach(() => {
  semSessao();
  limparAvisos();
});

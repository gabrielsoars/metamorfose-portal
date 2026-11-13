import '@testing-library/jest-dom/vitest';
import { entrarComo, semSessao } from './sessao.js';
import { limparAvisos } from '../components/avisosEstado.js';

// Toda tela privada exige login: cada teste começa logado como admin (que abre todas as rotas).
// Testes de login e de rotas sem sessão chamam `semSessao()` antes de renderizar.
beforeEach(() => entrarComo());
afterEach(() => {
  semSessao();
  limparAvisos();
});

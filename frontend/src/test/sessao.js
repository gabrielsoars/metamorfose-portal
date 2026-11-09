import { gravarSessao, limparSessao } from '../services/sessao.js'

export const ADMIN = { id: 1, nome: 'Admin de Teste', email: 'admin@escola.com', tipo: 0, ativo: true }
export const PROFESSOR = { id: 7, nome: 'Pedro', email: 'pedro@unesp.br', materia: 'Matemática', tipo: 1, ativo: true }

// Grava a sessão no storage, como depois de um login. Vale para o próximo render do App.
export function entrarComo(usuario = ADMIN, token = 'token-de-teste') {
  gravarSessao({ token, expiraEm: Date.now() + 60 * 60 * 1000, usuario })
}

export const semSessao = () => limparSessao()

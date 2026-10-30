import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import App from '../App.jsx'

// Liga os comportamentos do react-router v7 (e cala os avisos de "future flag" nos testes).
const FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
}

// Renderiza `elemento` num roteador em memória aberto em `rota`; `caminho` é o padrão da rota
// (ex.: '/simulados/:simuladoId'). Qualquer outra URL renderiza vazio.
// Devolve o roteador: `router.state.location`, `router.state.historyAction`, `router.navigate(-1)`.
export function renderNaRota(elemento, { rota = '/', caminho = '*' } = {}) {
  const rotas = [{ path: caminho, element: elemento }]
  if (caminho !== '*') rotas.push({ path: '*', element: null })
  const router = createMemoryRouter(rotas, { initialEntries: [rota], future: FUTURE })
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return router
}

// O app inteiro aberto direto numa URL (como colar o link na barra de endereço).
export const renderApp = (rota = '/') => renderNaRota(<App />, { rota })

// Caminho + query da URL atual do roteador.
export const urlAtual = (router) => router.state.location.pathname + router.state.location.search

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfDashboardScreen } from './ProfDashboardScreen.jsx'
import { extrairAnoMes, formatarMesCurto } from '../../services/estatisticasService.js'
import { renderNaRota } from '../../test/rotas'

const simulados = [
  { id: 1, titulo: 'Simulado Março', data_aplicacao: '2026-03-10', total_questoes: 5, turmas: [{ id: 10, nome: 'Turma A' }] },
  { id: 2, titulo: 'Simulado Junho', data_aplicacao: '2026-06-15', total_questoes: 5, turmas: [{ id: 10, nome: 'Turma A' }, { id: 20, nome: 'Turma B' }] },
]
const turmas = [{ id: 10, nome: 'Turma A', ano: 2026, turno: 'Noite' }, { id: 20, nome: 'Turma B', ano: 2026, turno: 'Manhã' }]

const pontosPadrao = [
  { mes: '2026-03', media_percentual: 52.5, simulados: 1, corrigidos: 4 },
  { mes: '2026-06', media_percentual: 68.2, simulados: 2, corrigidos: 6 },
]

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

function mockApi({
  simuladosApi = simulados,
  historicoPorUrl = { '/estatisticas/historico?meses=6': { turma_id: null, pontos: pontosPadrao } },
} = {}) {
  const fetchMock = vi.fn(async (input) => {
    const url = String(input).replace('http://localhost:8000', '')
    if (url === '/simulados') return jsonResponse(simuladosApi)
    if (url === '/turmas') return jsonResponse(turmas)
    if (url.startsWith('/estatisticas/historico')) {
      const corpo = historicoPorUrl[url]
      return corpo ? jsonResponse(corpo) : { ok: false, status: 500, json: async () => ({ detail: 'erro' }) }
    }
    if (url.includes('/resumo')) {
      return jsonResponse({ simulado_id: 2, turma_id: null, corrigidos: 3, media_percentual: 68.2, anterior: null, variacao_pp: null })
    }
    if (/^\/simulados\/\d+\/alunos$/.test(url)) return jsonResponse({ total: 0, alunos: [] })
    return { ok: false, status: 404, json: async () => ({}) }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('HistoricoMensalCard (dashboard)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renderiza o gráfico Recharts e o resumo acessível destacando o mês do simulado selecionado', async () => {
    mockApi()
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByTestId('grafico-historico')).toBeInTheDocument()
    const mar = screen.getByTestId('ponto-historico-2026-03')
    const jun = screen.getByTestId('ponto-historico-2026-06')
    expect(mar).toHaveTextContent('Mar: 52,5% (1 simulado, 4 provas)')
    expect(mar).toHaveAttribute('data-atual', 'false')
    expect(jun).toHaveTextContent('Jun: 68,2% (2 simulados, 6 provas)')
    expect(jun).toHaveAttribute('data-atual', 'true')
  })

  it('trocar apenas o simulado muda o mês destacado sem refazer a chamada ao endpoint de histórico', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })
    await screen.findByTestId('grafico-historico')

    await user.selectOptions(screen.getByLabelText('Simulado'), '1')

    await waitFor(() => expect(screen.getByTestId('ponto-historico-2026-03')).toHaveAttribute('data-atual', 'true'))
    expect(screen.getByTestId('ponto-historico-2026-06')).toHaveAttribute('data-atual', 'false')
    const chamadasHistorico = fetchMock.mock.calls.filter(([u]) => String(u).includes('/estatisticas/historico'))
    expect(chamadasHistorico).toHaveLength(1)
  })

  it('trocar a turma refaz a chamada de histórico filtrada pela turma', async () => {
    const fetchMock = mockApi({
      historicoPorUrl: {
        '/estatisticas/historico?meses=6': { turma_id: null, pontos: pontosPadrao },
        '/estatisticas/historico?turma_id=20&meses=6': {
          turma_id: 20,
          pontos: [{ mes: '2026-06', media_percentual: 40, simulados: 1, corrigidos: 1 }],
        },
      },
    })
    const user = userEvent.setup()
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })
    await screen.findByTestId('grafico-historico')

    await user.selectOptions(screen.getByLabelText('Turma'), '20')

    await waitFor(() => expect(screen.getByTestId('ponto-historico-2026-06')).toHaveTextContent('Jun: 40% (1 simulado, 1 prova)'))
    expect(screen.queryByTestId('ponto-historico-2026-03')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/estatisticas/historico?turma_id=20&meses=6', expect.anything())
  })

  it('mostra estado vazio quando não há histórico de correções', async () => {
    mockApi({ historicoPorUrl: { '/estatisticas/historico?meses=6': { turma_id: null, pontos: [] } } })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Sem histórico de correções ainda.')).toBeInTheDocument()
    expect(screen.queryByTestId('grafico-historico')).not.toBeInTheDocument()
  })

  it('mostra mensagem de erro quando a API falha', async () => {
    mockApi({ historicoPorUrl: {} })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument()
  })
})

describe('formatarMesCurto e extrairAnoMes', () => {
  it.each([
    ['2026-01', 'Jan'],
    ['2026-06', 'Jun'],
    ['2026-12', 'Dez'],
  ])('formatarMesCurto(%s) = %s', (entrada, esperado) => {
    expect(formatarMesCurto(entrada)).toBe(esperado)
  })

  it('extrai YYYY-MM da data de aplicação', () => {
    expect(extrairAnoMes('2026-06-15')).toBe('2026-06')
  })
})


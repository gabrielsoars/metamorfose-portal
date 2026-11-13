import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfDashboardScreen } from './ProfDashboardScreen.jsx'
import { formatarPercentual, formatarVariacao } from '../../services/estatisticasService.js'
import { renderApp, renderNaRota, urlAtual } from '../../test/rotas'
import { PROFESSOR, entrarComo } from '../../test/sessao'
import { lerSessao } from '../../services/sessao'

const simulados = [
  { id: 1, titulo: 'Simulado Antigo', data_aplicacao: '2026-03-01', total_questoes: 5, turmas: [{ id: 10, nome: 'Turma A' }] },
  { id: 2, titulo: 'Simulado Novo', data_aplicacao: '2026-06-01', total_questoes: 5, turmas: [{ id: 10, nome: 'Turma A' }, { id: 20, nome: 'Turma B' }] },
]
const turmas = [{ id: 10, nome: 'Turma A', ano: 2026, turno: 'Noite' }, { id: 20, nome: 'Turma B', ano: 2026, turno: 'Manhã' }]

const resumo = (extra = {}) => ({
  simulado_id: 2,
  turma_id: null,
  corrigidos: 3,
  media_percentual: 68.2,
  anterior: { simulado_id: 1, titulo: 'Simulado Antigo', media_percentual: 63 },
  variacao_pp: 5.2,
  ...extra,
})

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

// `resumoPorUrl`: caminho + query de /simulados/{id}/resumo -> corpo (ou null para responder 500).
function mockApi({ simuladosApi = simulados, resumoPorUrl = { '/simulados/2/resumo': resumo() } } = {}) {
  const fetchMock = vi.fn(async (input) => {
    const url = String(input).replace('http://localhost:8000', '')
    if (url === '/simulados') return jsonResponse(simuladosApi)
    if (url === '/turmas') return jsonResponse(turmas)
    if (url.includes('/resumo')) {
      const corpo = resumoPorUrl[url]
      return corpo ? jsonResponse(corpo) : { ok: false, status: 500, json: async () => ({ detail: 'erro' }) }
    }
    if (/^\/simulados\/\d+\/alunos$/.test(url)) return jsonResponse({ total: 0, alunos: [] })
    return { ok: false, status: 404, json: async () => ({}) }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const media = () => screen.getByTestId('media-acertos')

describe('MediaAcertosCard (dashboard)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra a média real, a variação em p.p. e o simulado comparado', async () => {
    mockApi()
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    await waitFor(() => expect(media()).toHaveTextContent('68,2%'))
    expect(screen.getByTestId('variacao-media')).toHaveTextContent('+5,2 p.p.')
    expect(screen.getByText('3 provas corrigidas · Comparado a Simulado Antigo (63%)')).toBeInTheDocument()
    // sem os valores fixos antigos
    expect(screen.queryByText('Comparado ao simulado anterior')).not.toBeInTheDocument()
  })

  it('refaz a busca com a turma escolhida no filtro', async () => {
    const fetchMock = mockApi({
      resumoPorUrl: {
        '/simulados/2/resumo': resumo(),
        '/simulados/2/resumo?turma_id=20': resumo({ turma_id: 20, corrigidos: 1, media_percentual: 40, anterior: null, variacao_pp: null }),
      },
    })
    const user = userEvent.setup()
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })
    await waitFor(() => expect(media()).toHaveTextContent('68,2%'))

    await user.selectOptions(screen.getByLabelText('Turma'), '20')

    await waitFor(() => expect(media()).toHaveTextContent('40%'))
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/simulados/2/resumo?turma_id=20', expect.anything())
    expect(screen.queryByTestId('variacao-media')).not.toBeInTheDocument()
    expect(screen.getByText('1 prova corrigida · Primeiro simulado com correções desta turma.')).toBeInTheDocument()
  })

  it('mostra queda com variação negativa', async () => {
    mockApi({ resumoPorUrl: { '/simulados/2/resumo': resumo({ media_percentual: 50, variacao_pp: -13 }) } })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    await waitFor(() => expect(screen.getByTestId('variacao-media')).toHaveTextContent('-13 p.p.'))
  })

  it('mostra traço quando ninguém foi corrigido', async () => {
    mockApi({ resumoPorUrl: { '/simulados/2/resumo': resumo({ corrigidos: 0, media_percentual: null, anterior: null, variacao_pp: null }) } })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Sem correções para calcular a média.')).toBeInTheDocument()
    expect(media()).toHaveTextContent('—')
  })

  it('mostra erro sem quebrar o resto do dashboard', async () => {
    mockApi({ resumoPorUrl: {} })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Não foi possível carregar a média.')).toBeInTheDocument()
    expect(media()).toHaveTextContent('—')
  })

  it('sem simulados não chama o resumo', async () => {
    const fetchMock = mockApi({ simuladosApi: [] })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Selecione um simulado para ver a média.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/resumo'))).toBe(false)
  })

  it('envia o Bearer token nas rotas de estatísticas e encerra a sessão se retornar 401', async () => {
    entrarComo(PROFESSOR, 'token-estatisticas')
    const fetchMock = vi.fn(async (input) => {
      const url = String(input).replace('http://localhost:8000', '')
      if (url === '/simulados') return jsonResponse(simulados)
      if (url === '/turmas') return jsonResponse(turmas)
      if (url === '/simulados/2/resumo') {
        return { ok: false, status: 401, json: async () => ({ detail: 'Token de acesso inválido ou ausente.' }) }
      }
      return jsonResponse({ total: 0, alunos: [], pontos: [], questoes: [], corrigidos: 0 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const router = renderApp('/painel')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/simulados/2/resumo',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-estatisticas' }) }),
    ))
    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
    expect(lerSessao()).toBeNull()
  })
})

describe('formatadores de estatística', () => {
  it.each([
    [68.2, '68,2%'],
    [68, '68%'],
    [66.66, '66,7%'],
    [0, '0%'],
  ])('formatarPercentual(%s) = %s', (valor, esperado) => {
    expect(formatarPercentual(valor)).toBe(esperado)
  })

  it.each([
    [5.2, '+5,2 p.p.'],
    [-3, '-3 p.p.'],
    [0, '0 p.p.'],
  ])('formatarVariacao(%s) = %s', (valor, esperado) => {
    expect(formatarVariacao(valor)).toBe(esperado)
  })
})


import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfDashboardScreen } from './ProfDashboardScreen.jsx'
import { QuestoesErroScreen } from './QuestoesErroScreen.jsx'
import { calcularQuestoesComErro } from '../../services/simuladosService.js'
import { renderApp, renderNaRota, urlAtual } from '../../test/rotas'

const QUESTOES = { rota: '/painel/questoes-erro' }

const det = (questao, correto, anulada = false) => ({ questao, correto, anulada, resposta_aluno: 'A', resposta_correta: 'B' })

const simulados = [
  { id: 1, titulo: 'Simulado Antigo', data_aplicacao: '2026-03-01', total_questoes: 2, turmas: [{ id: 10, nome: 'Turma A' }] },
  { id: 2, titulo: 'Simulado Novo', data_aplicacao: '2026-06-01', total_questoes: 5, turmas: [{ id: 10, nome: 'Turma A' }, { id: 20, nome: 'Turma B' }] },
]
const turmas = [{ id: 10, nome: 'Turma A', ano: 2026, turno: 'Noite' }, { id: 20, nome: 'Turma B', ano: 2026, turno: 'Manhã' }]

// Simulado 2: Ana e Bruno (turma A) corrigidos, Carla (turma B) corrigida, Dani (turma A) pendente.
const alunosSimulado2 = {
  total: 4,
  alunos: [
    { id: 1, nome: 'Ana', turma_id: 10, turma: 'Turma A', status: 'CORRIGIDO', nota: '3/5' },
    { id: 2, nome: 'Bruno', turma_id: 10, turma: 'Turma A', status: 'CORRIGIDO', nota: '2/5' },
    { id: 3, nome: 'Carla', turma_id: 20, turma: 'Turma B', status: 'CORRIGIDO', nota: '5/5' },
    { id: 4, nome: 'Dani', turma_id: 10, turma: 'Turma A', status: 'NÃO CORRIGIDO', nota: null },
  ],
}
const correcoes = {
  1: { detalhamento: [det(1, true), det(2, false), det(3, false), det(4, false), det(5, true, true)] },
  2: { detalhamento: [det(1, true), det(2, false), det(3, true), det(4, false), det(5, true, true)] },
  3: { detalhamento: [det(1, true), det(2, true), det(3, true), det(4, true), det(5, true, true)] },
}

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

function mockApi({ simuladosApi = simulados, turmasApi = turmas, alunosPorSimulado = { 2: alunosSimulado2 } } = {}) {
  const fetchMock = vi.fn(async (input) => {
    const url = String(input).replace('http://localhost:8000', '')
    if (url === '/simulados') return jsonResponse(simuladosApi)
    if (url === '/turmas') return jsonResponse(turmasApi)
    let m = url.match(/^\/simulados\/(\d+)\/alunos$/)
    if (m) return jsonResponse(alunosPorSimulado[m[1]] || { total: 0, alunos: [] })
    m = url.match(/^\/simulados\/\d+\/alunos\/(\d+)$/)
    if (m) return jsonResponse(correcoes[m[1]])
    return { ok: false, status: 404, json: async () => ({}) }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const chamadasCorrecao = (fetchMock) =>
  fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => /\/alunos\/\d+$/.test(u))

describe('calcularQuestoesComErro', () => {
  it('calcula o percentual de erro por questão e ordena do maior para o menor', () => {
    const lista = calcularQuestoesComErro([
      { detalhamento: [det(1, true), det(2, false), det(3, false)] },
      { detalhamento: [det(1, false), det(2, false), det(3, true)] },
      { detalhamento: [det(1, true), det(2, false), det(3, true)] },
      { detalhamento: [det(1, true), det(2, true), det(3, true)] },
    ], 3)

    expect(lista).toEqual([
      { questao: 2, erros: 3, total: 4, pct: 75 },
      { questao: 1, erros: 1, total: 4, pct: 25 },
      { questao: 3, erros: 1, total: 4, pct: 25 },
    ])
  })

  it('ignora questões anuladas e questões acima do total do simulado', () => {
    const lista = calcularQuestoesComErro([
      { detalhamento: [det(1, false), det(2, true, true), det(3, false)] },
      { detalhamento: [det(1, true), det(2, true, true), det(3, false)] },
    ], 2)

    expect(lista).toEqual([{ questao: 1, erros: 1, total: 2, pct: 50 }])
  })

  it('desempata pelo número de provas e depois pelo número da questão, sem dividir por zero', () => {
    const lista = calcularQuestoesComErro([
      { detalhamento: [det(4, false), det(2, false), det(3, true)] },
      { detalhamento: [det(2, true)] },
    ], 10)

    expect(lista.map((i) => [i.questao, i.pct])).toEqual([[4, 100], [2, 50], [3, 0]])
    expect(calcularQuestoesComErro([], 10)).toEqual([])
  })
})

describe('QuestoesErroScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista todas as questões do simulado mais recente ordenadas pelo percentual de erro', async () => {
    const fetchMock = mockApi()
    renderNaRota(<QuestoesErroScreen />, QUESTOES)

    expect(await screen.findByText('Questão 02')).toBeInTheDocument()
    // Questão 5 (anulada) fica de fora; só alunos corrigidos entram (3 chamadas de correção, Dani é pendente).
    expect(screen.queryByText(/Questão 05/)).not.toBeInTheDocument()
    expect(chamadasCorrecao(fetchMock)).toHaveLength(3)
    expect(screen.getByText('Baseado em 3 provas corrigidas.')).toBeInTheDocument()

    const textos = screen.getAllByText(/% erraram/).map((el) => el.textContent)
    // Q2: 2/3 = 67%, Q4: 2/3 = 67%, Q3: 1/3 = 33%, Q1: 0%
    expect(textos).toEqual(['67% erraram', '67% erraram', '33% erraram', '0% erraram'])
    const questoes = screen.getAllByText(/^Questão \d\d/).map((el) => el.textContent.slice(0, 10))
    expect(questoes).toEqual(['Questão 02', 'Questão 04', 'Questão 03', 'Questão 01'])
  })

  it('trocar a turma recalcula só com os alunos da turma e grava o filtro na URL', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    const router = renderNaRota(<QuestoesErroScreen />, QUESTOES)
    await screen.findByText('Questão 02')

    await user.selectOptions(screen.getByLabelText('Turma'), '20')

    expect(urlAtual(router)).toBe('/painel/questoes-erro?turma=20&simulado=2')
    expect(router.state.historyAction).toBe('REPLACE')
    await waitFor(() => expect(screen.getByText('Baseado em 1 prova corrigida.')).toBeInTheDocument())
    expect(screen.getAllByText('0% erraram')).toHaveLength(4)
    expect(chamadasCorrecao(fetchMock).filter((u) => u.endsWith('/alunos/3'))).toHaveLength(2)
    // Ana e Bruno (turma A) não foram buscados de novo para a turma B.
    expect(chamadasCorrecao(fetchMock).filter((u) => u.endsWith('/alunos/1'))).toHaveLength(1)
  })

  it('só oferece simulados da turma escolhida e troca de simulado atualiza a lista', async () => {
    mockApi({
      alunosPorSimulado: {
        1: { total: 1, alunos: [{ id: 1, nome: 'Ana', turma_id: 10, turma: 'Turma A', status: 'CORRIGIDO', nota: '1/2' }] },
        2: alunosSimulado2,
      },
    })
    const user = userEvent.setup()
    renderNaRota(<QuestoesErroScreen />, { rota: '/painel/questoes-erro?turma=10&simulado=1' })

    // Filtro lido da URL: simulado 1, limitado a 2 questões.
    await screen.findByText('Questão 02')
    expect(screen.queryByText('Questão 03')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Simulado')).toHaveValue('1')

    await user.selectOptions(screen.getByLabelText('Turma'), '20')
    expect(within(screen.getByLabelText('Simulado')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Simulado Novo'])
    await waitFor(() => expect(screen.getByText('Questão 03')).toBeInTheDocument())
  })

  it('mostra estado vazio quando o simulado não tem correções', async () => {
    mockApi({ alunosPorSimulado: { 2: { total: 1, alunos: [alunosSimulado2.alunos[3]] } } })
    renderNaRota(<QuestoesErroScreen />, QUESTOES)

    expect(await screen.findByText('Nenhuma prova corrigida neste simulado ainda.')).toBeInTheDocument()
    expect(screen.queryByText(/erraram/)).not.toBeInTheDocument()
  })

  it('mostra estado vazio quando não há simulados', async () => {
    mockApi({ simuladosApi: [] })
    renderNaRota(<QuestoesErroScreen />, QUESTOES)

    expect(await screen.findByText('Nenhum simulado cadastrado ainda.')).toBeInTheDocument()
    expect(screen.getByLabelText('Simulado')).toBeDisabled()
  })
})

describe('ProfDashboardScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra as 3 piores questões reais e abre a tela completa com o mesmo filtro', async () => {
    mockApi()
    const user = userEvent.setup()
    const router = renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Questão 02')).toBeInTheDocument()
    expect(screen.getAllByText(/% erraram/)).toHaveLength(3)
    expect(screen.queryByText('Questão 01')).not.toBeInTheDocument()
    // selects reais, sem os valores fixos antigos
    expect(screen.getByRole('option', { name: 'Turma B' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Simulado Novo' })).toBeInTheDocument()
    expect(screen.queryByText('Extensivo Noturno')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Turma'), '10')
    // O filtro do dashboard também fica na URL (sobrevive ao F5).
    expect(urlAtual(router)).toBe('/painel?turma=10&simulado=2')
    expect(router.state.historyAction).toBe('REPLACE')
    await user.click(screen.getByRole('button', { name: /ver todas/i }))
    expect(urlAtual(router)).toBe('/painel/questoes-erro?turma=10&simulado=2')
    expect(router.state.historyAction).toBe('PUSH')
  })

  it('mostra estado vazio e bloqueia "Ver todas" sem simulados', async () => {
    mockApi({ simuladosApi: [], turmasApi: [] })
    renderNaRota(<ProfDashboardScreen />, { rota: '/painel' })

    expect(await screen.findByText('Nenhum simulado cadastrado ainda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver todas/i })).toBeDisabled()
  })
})

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('abre a tela de questões com maior erro com o filtro da URL (sobrevive ao refresh)', async () => {
    mockApi()

    renderApp('/painel/questoes-erro?turma=20&simulado=2')

    expect(await screen.findByRole('heading', { name: /questões com maior erro/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Turma')).toHaveValue('20')
    expect(screen.getByLabelText('Simulado')).toHaveValue('2')
    expect(await screen.findByText('Baseado em 1 prova corrigida.')).toBeInTheDocument()
  })
})

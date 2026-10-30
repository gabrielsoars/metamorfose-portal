import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, urlAtual } from '../test/rotas'

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

const simulado = {
  id: 9,
  titulo: '1º Simulado ENEM',
  data_aplicacao: '2026-05-10',
  total_questoes: 3,
  turmas: [{ id: 3, nome: 'Extensivo Noturno' }],
}
const gabarito = [
  { num_questao: 1, alt_correta: 'A', anulada: false },
  { num_questao: 2, alt_correta: 'B', anulada: false },
  { num_questao: 3, alt_correta: 'C', anulada: false },
]

let turma
let corrigido

function mockApi() {
  turma = { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite' }
  corrigido = false
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = String(input).replace('http://localhost:8000', '')
    const method = (options.method || 'GET').toUpperCase()
    if (url === '/usuarios') return json([{ id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Física', tipo: 1, ativo: true }])
    if (url === '/usuarios/7') return json({ id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Física', tipo: 1, ativo: true })
    if (url === '/turmas') return json([turma])
    if (url === '/turmas/3' && method === 'GET') return json(turma)
    if (url === '/turmas/3' && method === 'PATCH') {
      turma = { ...turma, ...JSON.parse(options.body) }
      return json(turma)
    }
    if (url === '/turmas/3/alunos') return json([{ id: 10, nome: 'Bruno', turma_id: 3 }])
    if (url === '/simulados') return json([simulado])
    if (url === '/simulados/9') return json(simulado)
    if (url === '/simulados/9/gabarito') return json(gabarito)
    if (url === '/simulados/9/alunos') {
      return json({
        total: 1,
        alunos: [{ id: 10, nome: 'Bruno', turma_id: 3, turma: 'Extensivo Noturno', status: corrigido ? 'CORRIGIDO' : 'NÃO CORRIGIDO', nota: corrigido ? '2/3' : null }],
      })
    }
    if (url === '/simulados/9/alunos/10' && method === 'PUT') {
      corrigido = true
      return json({})
    }
    if (url === '/simulados/9/alunos/10') {
      return json(corrigido
        ? {
          status: 'CORRIGIDO', acertos: 2, total_questoes: 3, nota: '2/3',
          detalhamento: [
            { questao: 1, resposta_aluno: 'A', resposta_correta: 'A', correto: true, anulada: false },
            { questao: 2, resposta_aluno: 'B', resposta_correta: 'B', correto: true, anulada: false },
            { questao: 3, resposta_aluno: 'D', resposta_correta: 'C', correto: false, anulada: false },
          ],
        }
        : { status: 'NÃO CORRIGIDO', acertos: null, total_questoes: 3, nota: null, detalhamento: [] })
    }
    return json({ detail: 'Não encontrado.' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const voltar = (router) => act(() => router.navigate(-1))
const avancar = (router) => act(() => router.navigate(1))

beforeEach(() => {
  mockApi()
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rotas: abrir cada tela pela URL', () => {
  it.each([
    ['/login', 'Metamorfose'],
    ['/ativacao', 'Ativar Conta'],
    ['/admin', 'Usuários'],
    ['/admin/professores/novo', 'Novo Cadastro'],
    ['/admin/professores/7', 'Editar Professor'],
    ['/painel', 'Olá, Prof. Pedro'],
    ['/painel/questoes-erro', 'Questões com maior erro'],
    ['/turmas', 'Minhas Turmas'],
    ['/turmas/nova', 'Nova Turma'],
    ['/turmas/3', 'Extensivo Noturno'],
    ['/turmas/3/editar', 'Editar Turma'],
    ['/simulados', 'Meus Simulados'],
    ['/simulados/novo', 'Novo Simulado'],
    ['/simulados/9', '1º Simulado ENEM'],
    ['/simulados/9/editar', 'Editar Simulado'],
    ['/simulados/9/gabarito', 'Revisar Gabarito'],
    ['/simulados/9/alunos/10/correcao', 'Bruno'],
    ['/simulados/9/alunos/10/boletim', 'Bruno'],
    ['/perfil', 'Prof. Pedro'],
  ])('%s abre a tela "%s"', async (url, titulo) => {
    const router = renderApp(url)

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(urlAtual(router)).toBe(url)
  })

  it('a raiz leva ao login', async () => {
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
  })

  it('a correção carrega simulado e aluno pelos ids da URL', async () => {
    renderApp('/simulados/9/alunos/10/correcao')

    expect(await screen.findByText('Aluno em Correção')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bruno' })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/simulados/9', expect.anything())
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/simulados/9/alunos', expect.anything())
  })
})

describe('rotas: voltar e avançar', () => {
  it('voltar e avançar refazem o caminho entre lista e turma', async () => {
    const user = userEvent.setup()
    const router = renderApp('/turmas')
    // Espera sair a lista de fallback (que o App mostra até a API responder).
    await waitFor(() => expect(screen.queryByText('Intensivo Sábado')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Extensivo Noturno/ }))
    expect(await screen.findByText(/Alunos Matriculados/)).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas/3')

    await voltar(router)
    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas')

    await avancar(router)
    expect(await screen.findByText(/Alunos Matriculados/)).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas/3')
  })

  it('o menu inferior cria entradas no histórico (push)', async () => {
    const user = userEvent.setup()
    const router = renderApp('/turmas')

    await user.click(await screen.findByRole('button', { name: 'Simulados' }))
    expect(await screen.findByRole('heading', { name: 'Meus Simulados' })).toBeInTheDocument()
    expect(router.state.historyAction).toBe('PUSH')

    await voltar(router)
    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
  })

  it('trocar o filtro de questões com maior erro atualiza a URL sem criar entrada nova', async () => {
    const user = userEvent.setup()
    const router = renderApp('/painel/questoes-erro')

    await waitFor(() => expect(screen.getByLabelText('Simulado')).toHaveValue('9'))
    await user.selectOptions(screen.getByLabelText('Turma'), '3')

    await waitFor(() => expect(urlAtual(router)).toBe('/painel/questoes-erro?turma=3&simulado=9'))
    expect(router.state.historyAction).toBe('REPLACE')
  })
})

describe('rotas: endereço sem tela', () => {
  it('turma inexistente volta para a lista de turmas', async () => {
    const router = renderApp('/turmas/99')
    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas')
  })

  it('URL desconhecida cai no login', async () => {
    const router = renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
  })
})

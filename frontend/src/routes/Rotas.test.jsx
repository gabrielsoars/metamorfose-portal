import { act, render, screen, waitFor, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'
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
let excluidos

function mockApi() {
  turma = { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite' }
  corrigido = false
  excluidos = new Set()
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = String(input).replace('http://localhost:8000', '')
    const method = (options.method || 'GET').toUpperCase()
    if (method === 'DELETE' && (url === '/turmas/3' || url === '/simulados/9')) {
      excluidos.add(url)
      return json(null, 204)
    }
    if (excluidos.has(url)) return json({ detail: 'Não encontrado.' }, 404)
    if (url === '/usuarios') return json([{ id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Física', tipo: 1, ativo: true }])
    if (url === '/usuarios/7') return json({ id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Física', tipo: 1, ativo: true })
    if (url === '/turmas') return json(excluidos.has('/turmas/3') ? [] : [turma])
    if (url === '/turmas/3' && method === 'GET') return json(turma)
    if (url === '/turmas/3' && method === 'PATCH') {
      turma = { ...turma, ...JSON.parse(options.body) }
      return json(turma)
    }
    if (url === '/turmas/3/alunos') return json([{ id: 10, nome: 'Bruno', turma_id: 3 }])
    if (url === '/simulados') return json(excluidos.has('/simulados/9') ? [] : [simulado])
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

describe('rotas: regras de histórico', () => {
  it('Fluxo A: login → turmas → turma → editar → salvar; voltar leva à turma, depois à lista; avançar refaz o caminho', async () => {
    const user = userEvent.setup()
    const router = renderApp('/login')

    await user.click(await screen.findByRole('button', { name: /acessar plataforma/i }))
    expect(await screen.findByRole('heading', { name: 'Olá, Prof. Pedro' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/painel')
    expect(router.state.historyAction).toBe('REPLACE')

    await user.click(screen.getByRole('button', { name: 'Turmas' }))
    await screen.findByRole('heading', { name: 'Minhas Turmas' })
    await waitFor(() => expect(screen.queryByText('Intensivo Sábado')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Extensivo Noturno/ }))
    await screen.findByText(/Alunos Matriculados/)
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /editar turma/i }))
    expect(urlAtual(router)).toBe('/turmas/3/editar')

    const nome = await screen.findByDisplayValue('Extensivo Noturno')
    await user.clear(nome)
    await user.type(nome, 'Extensivo Matutino')
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(await screen.findByRole('heading', { name: 'Extensivo Matutino' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas/3')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(document.title).toBe('Turma Extensivo Matutino · Metamorfose')

    // Voltar leva à turma (não ao formulário salvo)...
    await voltar(router)
    expect(urlAtual(router)).toBe('/turmas/3')
    expect(screen.getByText(/Alunos Matriculados/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Editar Turma' })).not.toBeInTheDocument()

    // ...voltar de novo leva à lista...
    await voltar(router)
    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas')

    // ...e, como o login foi substituído, o histórico não volta para ele.
    await voltar(router)
    await voltar(router)
    expect(urlAtual(router)).toBe('/painel')

    // Avançar refaz o caminho e termina na turma, nunca no formulário.
    await avancar(router)
    expect(urlAtual(router)).toBe('/turmas')
    await avancar(router)
    await avancar(router)
    await avancar(router)
    expect(urlAtual(router)).toBe('/turmas/3')
    expect(await screen.findByRole('heading', { name: 'Extensivo Matutino' })).toBeInTheDocument()
  })

  it('Fluxo B: simulados → simulado → escanear → Concluir; voltar leva ao painel com o aluno corrigido', async () => {
    const user = userEvent.setup()
    const router = renderApp('/simulados')

    await user.click(await screen.findByRole('button', { name: /1º Simulado ENEM/ }))
    expect(await screen.findByText('0 de 1 provas corrigidas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /escanear/i }))
    expect(await screen.findByText('Aluno em Correção')).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/simulados/9/alunos/10/correcao')

    await waitFor(() => expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument())
    await user.click(screen.getAllByRole('radio', { name: 'A' })[0])
    await user.click(screen.getByRole('button', { name: /concluir/i }))

    expect(await screen.findByText('1 de 1 provas corrigidas')).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/simulados/9')
    expect(router.state.historyAction).toBe('REPLACE')

    await voltar(router)
    expect(urlAtual(router)).toBe('/simulados/9')
    expect(screen.getByText('Corrigido')).toBeInTheDocument()
    expect(screen.queryByText('Aluno em Correção')).not.toBeInTheDocument()

    await voltar(router)
    expect(await screen.findByRole('heading', { name: 'Meus Simulados' })).toBeInTheDocument()
  })

  it('Fluxo C: excluir a turma volta para a lista e o voltar não reabre a turma excluída', async () => {
    const user = userEvent.setup()
    const router = renderApp('/turmas')

    await waitFor(() => expect(screen.queryByText('Intensivo Sábado')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Extensivo Noturno/ }))
    await screen.findByText('Bruno')
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir turma/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/turmas')
    expect(router.state.historyAction).toBe('REPLACE')

    await voltar(router)
    expect(urlAtual(router)).toBe('/turmas')
    expect(screen.queryByText(/Alunos Matriculados/)).not.toBeInTheDocument()
  })

  it('Fluxo C: excluir o simulado volta para a lista e o voltar não reabre o simulado excluído', async () => {
    const user = userEvent.setup()
    const router = renderApp('/simulados')

    await user.click(await screen.findByRole('button', { name: /1º Simulado ENEM/ }))
    await user.click(await screen.findByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir simulado/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Nenhum simulado cadastrado')).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/simulados')
    expect(router.state.historyAction).toBe('REPLACE')

    await voltar(router)
    expect(urlAtual(router)).toBe('/simulados')
  })

  it('salvar o gabarito substitui o formulário pelo painel', async () => {
    const user = userEvent.setup()
    const router = renderApp('/simulados/9/gabarito')

    await waitFor(() => expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(3))
    await user.click(screen.getByRole('button', { name: /salvar gabarito oficial/i }))

    await waitFor(() => expect(urlAtual(router)).toBe('/simulados/9'))
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('Sair substitui a tela atual pelo login', async () => {
    const user = userEvent.setup()
    const router = renderApp('/perfil')

    await user.click(await screen.findByRole('button', { name: /sair da conta/i }))

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('F5 no dashboard mantém o filtro da URL', async () => {
    renderApp('/painel?turma=3&simulado=9')

    await waitFor(() => expect(screen.getByLabelText('Turma')).toHaveValue('3'))
    expect(screen.getByLabelText('Simulado')).toHaveValue('9')
  })
})

describe('rotas: título da aba', () => {
  it.each([
    ['/login', 'Entrar · Metamorfose'],
    ['/turmas', 'Minhas turmas · Metamorfose'],
    ['/turmas/3', 'Turma Extensivo Noturno · Metamorfose'],
    ['/simulados/9', '1º Simulado ENEM · Metamorfose'],
    ['/simulados/9/alunos/10/boletim', 'Boletim de Bruno · Metamorfose'],
    ['/nao-existe', 'Página não encontrada · Metamorfose'],
  ])('%s → "%s"', async (url, titulo) => {
    renderApp(url)
    await waitFor(() => expect(document.title).toBe(titulo))
  })
})

describe('rotas: não encontrado', () => {
  it('URL desconhecida mostra "Página não encontrada" com link para o início', async () => {
    const user = userEvent.setup()
    const router = renderApp('/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ir para o início' }))

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
  })

  it.each([
    ['/turmas/99', 'Turma não encontrada', 'Voltar para as turmas', '/turmas'],
    ['/turmas/abc/editar', 'Turma não encontrada', 'Voltar para as turmas', '/turmas'],
    ['/simulados/99/gabarito', 'Simulado não encontrado', 'Voltar para os simulados', '/simulados'],
    ['/simulados/9/alunos/99/boletim', 'Aluno não encontrado', 'Voltar para o simulado', '/simulados/9'],
    ['/admin/professores/99', 'Professor não encontrado', 'Voltar para os usuários', '/admin'],
  ])('%s mostra "%s" com link de volta', async (url, titulo, link, destino) => {
    const user = userEvent.setup()
    const router = renderApp(url)

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(urlAtual(router)).toBe(url)

    await user.click(screen.getByRole('link', { name: link }))
    await waitFor(() => expect(urlAtual(router)).toBe(destino))
  })

  it('falha de rede ao carregar o registro mostra o erro, sem tela em branco', async () => {
    global.fetch.mockImplementation(async () => {
      throw new TypeError('Failed to fetch')
    })
    renderApp('/turmas/3')

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar a turma' })).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para as turmas' })).toBeInTheDocument()
  })
})

describe('histórico do navegador (History API)', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('o voltar e o avançar do navegador trocam de tela dentro do app', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/turmas')
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>,
    )

    await waitFor(() => expect(screen.queryByText('Intensivo Sábado')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Extensivo Noturno/ }))
    expect(await screen.findByText(/Alunos Matriculados/)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/turmas/3')

    act(() => window.history.back())
    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/turmas')

    act(() => window.history.forward())
    expect(await screen.findByText(/Alunos Matriculados/)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/turmas/3')
  })
})

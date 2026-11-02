import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/rotas'

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const deleteCalls = (fetchMock) => fetchMock.mock.calls.filter(([, o]) => o?.method === 'DELETE')

describe('Excluir turma e aluno', () => {
  let turmas
  let alunos
  let respostaDeleteTurma

  beforeEach(() => {
    turmas = [
      { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite', alunos: 2 },
      { id: 4, nome: 'Turma Outra', ano: 2026, turno: 'Manhã', alunos: 0 },
    ]
    alunos = [{ id: 10, nome: 'Bruno', turma_id: 3 }, { id: 11, nome: 'Carla', turma_id: 3 }]
    respostaDeleteTurma = () => {
      turmas = turmas.filter((t) => t.id !== 3)
      return json(null, 204)
    }
    vi.spyOn(window, 'alert').mockImplementation(() => {})

    vi.stubGlobal('fetch', vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()
      if (url.endsWith('/usuarios')) return json([])
      if (url.endsWith('/turmas') && method === 'GET') return json(turmas)
      if (url.endsWith('/turmas/3/alunos')) return json(alunos)
      if (url.endsWith('/turmas/3') && method === 'GET') return json(turmas.find((t) => t.id === 3))
      if (url.endsWith('/turmas/3') && method === 'DELETE') return respostaDeleteTurma()
      if (url.endsWith('/alunos/10') && method === 'DELETE') {
        alunos = alunos.filter((a) => a.id !== 10)
        return json(null, 204)
      }
      return json({ detail: 'endpoint indisponível' }, 500)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('oferece "Excluir turma" no menu ⋮ e pede confirmação dizendo quantos alunos serão apagados', async () => {
    const user = userEvent.setup()
    renderApp('/turmas/3')

    await screen.findByText('Bruno')
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir turma/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Excluir a turma Extensivo Noturno?')
    expect(dialog).toHaveTextContent('Isso apaga 2 alunos')
    expect(dialog).toHaveTextContent('não pode ser desfeito')
  })

  it('cancelar a exclusão da turma não chama a API', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    renderApp('/turmas/3')

    await screen.findByText('Bruno')
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir turma/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteCalls(fetchMock)).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Extensivo Noturno' })).toBeInTheDocument()
  })

  it('confirmar exclui a turma, volta para a lista de turmas e ela não aparece mais', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    const router = renderApp('/turmas/3')

    await screen.findByText('Bruno')
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir turma/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('heading', { name: 'Minhas Turmas' })).toBeInTheDocument()
    expect(deleteCalls(fetchMock).map(([url]) => url)).toEqual(['http://localhost:8000/turmas/3'])
    expect(screen.getByText('Turma Outra')).toBeInTheDocument()
    expect(screen.queryByText('Extensivo Noturno')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/turmas')
  })

  it('mostra a mensagem do backend quando a API recusa (409) e continua na turma', async () => {
    const user = userEvent.setup()
    const mensagem = 'Não é possível excluir a turma: ela está vinculada a 1 simulado(s) (“ENEM”).'
    respostaDeleteTurma = () => json({ detail: mensagem }, 409)
    renderApp('/turmas/3')

    await screen.findByText('Bruno')
    await user.click(screen.getByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir turma/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(mensagem))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Extensivo Noturno' })).toBeInTheDocument()
  })

  it('cancelar a exclusão do aluno não chama a API', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    renderApp('/turmas/3')

    await user.click(await screen.findByRole('button', { name: 'Excluir aluno Bruno' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Excluir o aluno Bruno?')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(deleteCalls(fetchMock)).toHaveLength(0)
    expect(screen.getByText('Bruno')).toBeInTheDocument()
  })

  it('confirmar exclui o aluno na API e o remove da lista', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    renderApp('/turmas/3')

    await user.click(await screen.findByRole('button', { name: 'Excluir aluno Bruno' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.queryByText('Bruno')).not.toBeInTheDocument())
    expect(deleteCalls(fetchMock).map(([url]) => url)).toEqual(['http://localhost:8000/alunos/10'])
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Excluir simulado', () => {
  let simulados
  const simulado = {
    id: 9,
    titulo: '1º Simulado ENEM',
    data_aplicacao: '2026-05-10',
    total_questoes: 10,
    turmas: [{ id: 3, nome: 'Extensivo Noturno' }],
    gabarito: [],
  }

  beforeEach(() => {
    simulados = [simulado, { ...simulado, id: 10, titulo: 'Outro Simulado' }]
    vi.spyOn(window, 'alert').mockImplementation(() => {})

    vi.stubGlobal('fetch', vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()
      if (url.endsWith('/usuarios')) return json([])
      if (url.endsWith('/turmas')) return json([])
      if (url.endsWith('/turmas/3/alunos')) return json([{ id: 10, nome: 'Bruno', turma_id: 3 }])
      if (url.endsWith('/simulados/9') && method === 'GET') return json(simulado)
      if (url.endsWith('/simulados/9') && method === 'DELETE') {
        simulados = simulados.filter((s) => s.id !== 9)
        return json(null, 204)
      }
      if (url.endsWith('/simulados') && method === 'GET') return json(simulados)
      return json({ detail: 'endpoint indisponível' }, 500)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('cancelar a exclusão do simulado não chama a API', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    renderApp('/simulados/9')

    await user.click(await screen.findByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir simulado/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Excluir o simulado 1º Simulado ENEM?')
    expect(dialog).toHaveTextContent('gabarito')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(deleteCalls(fetchMock)).toHaveLength(0)
    expect(screen.getByRole('heading', { name: '1º Simulado ENEM' })).toBeInTheDocument()
  })

  it('confirmar exclui o simulado, volta para a lista e ele não aparece mais', async () => {
    const user = userEvent.setup()
    const fetchMock = global.fetch
    const router = renderApp('/simulados/9')

    await user.click(await screen.findByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir simulado/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('heading', { name: 'Meus Simulados' })).toBeInTheDocument()
    expect(deleteCalls(fetchMock).map(([url]) => url)).toEqual(['http://localhost:8000/simulados/9'])
    expect(await screen.findByText('Outro Simulado')).toBeInTheDocument()
    expect(screen.queryByText('1º Simulado ENEM')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/simulados')
  })

  it('mostra o erro da API e continua no painel', async () => {
    const user = userEvent.setup()
    global.fetch.mockImplementation(async (input, options = {}) => {
      const url = String(input)
      if ((options.method || 'GET') === 'DELETE') return json({ detail: 'Simulado não encontrado' }, 404)
      if (url.endsWith('/usuarios') || url.endsWith('/turmas')) return json([])
      if (url.endsWith('/turmas/3/alunos')) return json([])
      return json(simulado)
    })
    renderApp('/simulados/9')

    await user.click(await screen.findByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /excluir simulado/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Simulado não encontrado'))
    expect(screen.getByRole('heading', { name: '1º Simulado ENEM' })).toBeInTheDocument()
  })
})

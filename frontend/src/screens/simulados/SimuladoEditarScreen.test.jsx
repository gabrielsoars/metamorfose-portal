import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimuladoCriarScreen } from './SimuladoCriarScreen.jsx'
import { SimuladoEditarScreen } from './SimuladoEditarScreen.jsx'
import { SimuladoPainelScreen } from './SimuladoPainelScreen.jsx'
import { requestJson } from '../../services/api.js'

const simulado = {
  id: 9,
  titulo: '1º Simulado',
  data_aplicacao: '2026-05-10',
  total_questoes: 10,
  turmas: [{ id: 1, nome: 'Turma A' }],
}
const turmas = [
  { id: 1, name: 'Turma A', turno: 'Manhã', ano: 2026 },
  { id: 2, name: 'Turma B', turno: 'Noite', ano: 2026 },
]

function mockFetch({ gabarito = [] } = {}) {
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = String(input)
    const method = (options.method || 'GET').toUpperCase()
    if (url.endsWith('/simulados/9/gabarito')) {
      return { ok: true, status: 200, json: async () => gabarito }
    }
    if (url.endsWith('/simulados/9') && method === 'PATCH') {
      return { ok: true, status: 200, json: async () => ({ ...simulado, ...JSON.parse(options.body), turmas: [] }) }
    }
    return { ok: false, status: 500, json: async () => ({ detail: 'indisponível' }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const patchCalls = (fetchMock) => fetchMock.mock.calls.filter(([, o]) => o?.method === 'PATCH')

describe('SimuladoEditarScreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('preenche o formulário e salva via PATCH voltando ao painel com o simulado atualizado', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch()
    const go = vi.fn()
    render(<SimuladoEditarScreen go={go} simulado={simulado} turmas={turmas} />)

    expect(screen.getByLabelText('Título do Simulado')).toHaveValue('1º Simulado')
    expect(screen.getByLabelText('Questões')).toHaveValue(10)

    await user.clear(screen.getByLabelText('Título do Simulado'))
    await user.type(screen.getByLabelText('Título do Simulado'), '  Simulado Final ')
    await user.clear(screen.getByLabelText('Questões'))
    await user.type(screen.getByLabelText('Questões'), '20')
    await user.click(screen.getByRole('button', { name: /Turma B/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(go).toHaveBeenCalledWith('simulado-painel', expect.objectContaining({ titulo: 'Simulado Final', total_questoes: 20 })))
    const [[url, options]] = patchCalls(fetchMock)
    expect(url).toMatch(/\/simulados\/9$/)
    expect(JSON.parse(options.body)).toEqual({
      titulo: 'Simulado Final',
      data_aplicacao: '2026-05-10',
      total_questoes: 20,
      turmas_ids: [1, 2],
    })
  })

  it('ao reduzir questões com gabarito cadastrado pede confirmação e não salva se recusar', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({ gabarito: [{ num_questao: 3, alt_correta: 'A' }, { num_questao: 9, alt_correta: 'B' }] })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const go = vi.fn()
    render(<SimuladoEditarScreen go={go} simulado={simulado} turmas={turmas} />)

    await user.clear(screen.getByLabelText('Questões'))
    await user.type(screen.getByLabelText('Questões'), '5')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
    expect(confirm.mock.calls[0][0]).toContain('1 delas já têm gabarito')
    expect(patchCalls(fetchMock)).toHaveLength(0)
    expect(go).not.toHaveBeenCalled()
    // O botão volta a ficar disponível depois de recusar.
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('ao reduzir e confirmar, salva com o novo total', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({ gabarito: [{ num_questao: 9, alt_correta: 'B' }] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const go = vi.fn()
    render(<SimuladoEditarScreen go={go} simulado={simulado} turmas={turmas} />)

    await user.clear(screen.getByLabelText('Questões'))
    await user.type(screen.getByLabelText('Questões'), '5')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(go).toHaveBeenCalledWith('simulado-painel', expect.objectContaining({ total_questoes: 5 })))
    expect(JSON.parse(patchCalls(fetchMock)[0][1].body).total_questoes).toBe(5)
  })

  it('reduzir sem nenhuma questão com gabarito acima do novo total não pede confirmação', async () => {
    const user = userEvent.setup()
    mockFetch({ gabarito: [{ num_questao: 2, alt_correta: 'A' }] })
    const confirm = vi.spyOn(window, 'confirm')
    const go = vi.fn()
    render(<SimuladoEditarScreen go={go} simulado={simulado} turmas={turmas} />)

    await user.clear(screen.getByLabelText('Questões'))
    await user.type(screen.getByLabelText('Questões'), '5')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(go).toHaveBeenCalled())
    expect(confirm).not.toHaveBeenCalled()
  })

  it('não salva com número de questões inválido', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<SimuladoEditarScreen go={vi.fn()} simulado={simulado} turmas={turmas} />)

    await user.clear(screen.getByLabelText('Questões'))
    await user.type(screen.getByLabelText('Questões'), '0')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(alert).toHaveBeenCalled()
    expect(patchCalls(fetchMock)).toHaveLength(0)
  })

  it('não salva quando todas as turmas são desmarcadas', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<SimuladoEditarScreen go={vi.fn()} simulado={simulado} turmas={turmas} />)

    await user.click(screen.getByRole('button', { name: /Turma A/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(alert).toHaveBeenCalledWith('Selecione ao menos uma turma para o simulado.')
    expect(patchCalls(fetchMock)).toHaveLength(0)
  })
})

describe('SimuladoCriarScreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exige ao menos uma turma antes de cadastrar e salva quando selecionada', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input, options = {}) => ({
      ok: true,
      status: 201,
      json: async () => ({ id: 12, ...JSON.parse(options.body), turmas: [{ id: 1, nome: 'Turma A' }] }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const go = vi.fn()

    render(<SimuladoCriarScreen go={go} turmas={turmas} />)

    await user.type(screen.getByLabelText('Título do Simulado'), '2º Simulado')
    await user.type(screen.getByLabelText('Data de Aplicação'), '2026-09-15')
    await user.click(screen.getByRole('button', { name: /Salvar e Continuar/ }))

    expect(alert).toHaveBeenCalledWith('Selecione ao menos uma turma para cadastrar o simulado.')
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Turma A/ }))
    await user.click(screen.getByRole('button', { name: /Salvar e Continuar/ }))

    await waitFor(() => expect(go).toHaveBeenCalledWith('simulado-gabarito', expect.objectContaining({ id: 12 })))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      titulo: '2º Simulado',
      data_aplicacao: '2026-09-15',
      total_questoes: 10,
      turmas_ids: [1],
    })
  })

  it('requestJson formata erros 422 do FastAPI sem exibir [object Object]', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ loc: ['body', 'turmas_ids'], msg: 'List should have at least 1 item after validation, not 0' }],
      }),
    })))

    await expect(requestJson('/simulados', { method: 'POST', body: '{}' })).rejects.toThrow(
      'List should have at least 1 item after validation, not 0',
    )
  })
})

describe('menu do painel do simulado', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('abre o menu ⋮ e leva para a edição', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })))
    const go = vi.fn()
    render(<SimuladoPainelScreen go={go} simulado={simulado} />)

    await user.click(screen.getByRole('button', { name: 'Mais opções' }))
    await user.click(screen.getByRole('menuitem', { name: /Editar simulado/ }))

    expect(go).toHaveBeenCalledWith('simulado-editar')
  })
})

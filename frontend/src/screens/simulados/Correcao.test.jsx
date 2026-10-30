import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimuladoPainelScreen } from './SimuladoPainelScreen.jsx'
import { EscaneamentoScreen } from './EscaneamentoScreen.jsx'
import { montarRespostas, respostasSalvas } from '../../services/simuladosService.js'

const simulado = { id: 9, titulo: 'Simulado 1', total_questoes: 3, turmas: [{ id: 1, nome: 'Turma A' }] }
const gabarito = [
  { num_questao: 1, alt_correta: 'A', anulada: false },
  { num_questao: 2, alt_correta: 'B', anulada: false },
  { num_questao: 3, alt_correta: 'C', anulada: false },
]

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

describe('montarRespostas / respostasSalvas', () => {
  it('envia só questões com gabarito dentro do total, com null para em branco', () => {
    const itens = [...gabarito, { num_questao: 4, alt_correta: 'D', anulada: false }]
    expect(montarRespostas(itens, { 1: 'A', 3: 'E' }, 3)).toEqual([
      { questao: 1, resposta_marcada: 'A' },
      { questao: 2, resposta_marcada: null },
      { questao: 3, resposta_marcada: 'E' },
    ])
  })

  it('converte o detalhamento salvo em respostas por questão', () => {
    const correcao = { detalhamento: [{ questao: 1, resposta_aluno: 'B' }, { questao: 2, resposta_aluno: null }] }
    expect(respostasSalvas(correcao)).toEqual({ 1: 'B' })
    expect(respostasSalvas(null)).toEqual({})
  })
})

describe('SimuladoPainelScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra status e nota por aluno e a contagem real de corrigidos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      total: 2,
      alunos: [
        { id: 1, nome: 'Ana Souza', turma_id: 1, turma: 'Turma A', status: 'CORRIGIDO', nota: '2/3' },
        { id: 2, nome: 'Bruno Lima', turma_id: 1, turma: 'Turma A', status: 'NÃO CORRIGIDO', nota: null },
      ],
    })))
    const go = vi.fn()
    const user = userEvent.setup()

    render(<SimuladoPainelScreen go={go} simulado={simulado} />)

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Corrigido')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('1 de 2 provas corrigidas')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /editar correção de ana souza/i }))
    expect(go).toHaveBeenCalledWith('escaneamento', expect.objectContaining({ id: 1, name: 'Ana Souza' }))
  })
})

describe('EscaneamentoScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('carrega as respostas salvas e salva ao concluir', async () => {
    const fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input)
      if (url.endsWith('/simulados/9/gabarito')) return jsonResponse(gabarito)
      if (url.endsWith('/simulados/9/alunos/1') && options.method === 'PUT') return jsonResponse({})
      if (url.endsWith('/simulados/9/alunos/1')) {
        return jsonResponse({
          status: 'CORRIGIDO',
          detalhamento: [
            { questao: 1, resposta_aluno: 'A' },
            { questao: 2, resposta_aluno: null },
            { questao: 3, resposta_aluno: 'D' },
          ],
        })
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const go = vi.fn()
    const user = userEvent.setup()

    render(<EscaneamentoScreen go={go} simulado={simulado} aluno={{ id: 1, name: 'Ana Souza' }} />)

    await waitFor(() => expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(2))
    await waitFor(() => expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /concluir/i }))

    await waitFor(() => expect(go).toHaveBeenCalledWith('simulado-painel'))
    const putCall = fetchMock.mock.calls.find(([url, o]) => String(url).endsWith('/alunos/1') && o?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(putCall[1].body)).toEqual({
      respostas: [
        { questao: 1, resposta_marcada: 'A' },
        { questao: 2, resposta_marcada: null },
        { questao: 3, resposta_marcada: 'D' },
      ],
    })
  })
})

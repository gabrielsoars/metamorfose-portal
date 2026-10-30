import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoletimScreen } from './BoletimScreen.jsx'
import { SimuladoPainelScreen } from './SimuladoPainelScreen.jsx'
import { montarRanking, parseNota } from '../../services/simuladosService.js'

const simulado = { id: 9, titulo: 'Simulado 1', total_questoes: 4, turmas: [{ id: 1, nome: 'Turma A' }] }
const aluno = { id: 1, name: 'Ana Souza' }

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

describe('parseNota / montarRanking', () => {
  it('interpreta "acertos/total" e rejeita valores inutilizáveis', () => {
    expect(parseNota('3/4')).toEqual({ acertos: 3, total: 4, percentual: 75 })
    expect(parseNota(null)).toBeNull()
    expect(parseNota('abc')).toBeNull()
    expect(parseNota('1/0')).toBeNull()
  })

  it('ordena por nota, desempata por nome e calcula a média só dos corrigidos', () => {
    const alunos = [
      { id: 1, name: 'Carla', corrected: true, nota: '2/4' },
      { id: 2, name: 'Bruno', corrected: false, nota: null },
      { id: 3, name: 'Ana', corrected: true, nota: '4/4' },
      { id: 4, name: 'Davi', corrected: true, nota: '2/4' },
    ]
    const { ranking, media } = montarRanking(alunos)
    expect(ranking.map((a) => [a.posicao, a.name])).toEqual([[1, 'Ana'], [2, 'Carla'], [3, 'Davi']])
    expect(media.acertos).toBeCloseTo(8 / 3)
    expect(media.total).toBe(4)
    expect(media.percentual).toBeCloseTo((100 + 50 + 50) / 3)
  })

  it('sem alunos corrigidos não há média', () => {
    expect(montarRanking([{ id: 1, name: 'Ana', corrected: false, nota: null }]).media).toBeNull()
  })
})

describe('BoletimScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra nota, acerto, erro, em branco e questão anulada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      status: 'CORRIGIDO',
      acertos: 3,
      total_questoes: 4,
      nota: '3/4',
      detalhamento: [
        { questao: 1, resposta_aluno: 'A', resposta_correta: 'A', correto: true, anulada: false },
        { questao: 2, resposta_aluno: 'C', resposta_correta: 'B', correto: false, anulada: false },
        { questao: 3, resposta_aluno: null, resposta_correta: 'D', correto: true, anulada: true },
        { questao: 4, resposta_aluno: 'E', resposta_correta: 'E', correto: true, anulada: false },
      ],
    })))
    const go = vi.fn()
    const user = userEvent.setup()

    render(<BoletimScreen go={go} simulado={simulado} aluno={aluno} />)

    expect(await screen.findByText('3/4')).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('3 acertos')).toBeInTheDocument()
    expect(screen.getByText('1 erros')).toBeInTheDocument()
    expect(screen.getByText('1 anuladas')).toBeInTheDocument()

    expect(within(screen.getByTestId('questao-1')).getByText('Acerto')).toBeInTheDocument()
    const q2 = within(screen.getByTestId('questao-2'))
    expect(q2.getByText('Erro')).toBeInTheDocument()
    expect(q2.getByText('C')).toBeInTheDocument()
    expect(q2.getByText('B')).toBeInTheDocument()
    const q3 = within(screen.getByTestId('questao-3'))
    expect(q3.getByText('Anulada')).toBeInTheDocument()
    expect(q3.getByText('Em branco')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /voltar ao painel/i }))
    expect(go).toHaveBeenCalledWith('simulado-painel')
  })

  it('aluno não corrigido mostra estado vazio, nunca nota zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      status: 'NÃO CORRIGIDO', acertos: null, total_questoes: 4, nota: null, detalhamento: [],
    })))
    const go = vi.fn()
    const user = userEvent.setup()

    render(<BoletimScreen go={go} simulado={simulado} aluno={aluno} />)

    expect(await screen.findByText('Ainda não corrigido')).toBeInTheDocument()
    expect(screen.queryByText(/nota geral/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/0\/4/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /escanear/i }))
    expect(go).toHaveBeenCalledWith('escaneamento', aluno)
  })
})

describe('SimuladoPainelScreen: ranking e acesso ao boletim', () => {
  afterEach(() => vi.unstubAllGlobals())

  const resposta = {
    total: 4,
    alunos: [
      { id: 1, nome: 'Ana Souza', turma_id: 1, turma: 'Turma A', status: 'CORRIGIDO', nota: '2/4' },
      { id: 2, nome: 'Bruno Lima', turma_id: 1, turma: 'Turma A', status: 'NÃO CORRIGIDO', nota: null },
      { id: 3, nome: 'Carla Dias', turma_id: 1, turma: 'Turma A', status: 'CORRIGIDO', nota: '4/4' },
    ],
  }

  it('lista o ranking ordenado com a média e não inclui pendentes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(resposta)))

    render(<SimuladoPainelScreen go={vi.fn()} simulado={simulado} />)

    const ranking = await screen.findByRole('region', { name: /ranking da turma/i })
    const itens = within(ranking).getAllByRole('listitem').map((li) => li.textContent)
    expect(itens).toEqual(['1º Carla Dias100%', '2º Ana Souza50%'])
    expect(within(ranking).getByText(/3 de 4 \(75%\)/)).toBeInTheDocument()
  })

  it('sem nenhum corrigido não mostra ranking', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      total: 1,
      alunos: [{ id: 2, nome: 'Bruno Lima', turma_id: 1, turma: 'Turma A', status: 'NÃO CORRIGIDO', nota: null }],
    })))

    render(<SimuladoPainelScreen go={vi.fn()} simulado={simulado} />)

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /ranking da turma/i })).not.toBeInTheDocument()
  })

  it('clicar no aluno corrigido abre o boletim; Escanear e editar vão ao escaneamento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(resposta)))
    const go = vi.fn()
    const user = userEvent.setup()

    render(<SimuladoPainelScreen go={go} simulado={simulado} />)

    await user.click(await screen.findByRole('button', { name: /ver boletim de ana souza/i }))
    expect(go).toHaveBeenCalledWith('aluno-boletim', expect.objectContaining({ id: 1, name: 'Ana Souza' }))

    await user.click(screen.getByRole('button', { name: /editar correção de ana souza/i }))
    expect(go).toHaveBeenCalledWith('escaneamento', expect.objectContaining({ id: 1 }))

    await user.click(screen.getByRole('button', { name: /escanear/i }))
    expect(go).toHaveBeenCalledWith('escaneamento', expect.objectContaining({ id: 2 }))
  })
})

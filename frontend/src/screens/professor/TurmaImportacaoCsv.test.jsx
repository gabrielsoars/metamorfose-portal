import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, urlAtual } from '../../test/rotas'
import { PROFESSOR, entrarComo } from '../../test/sessao'
import { lerSessao } from '../../services/sessao'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('Importar alunos por CSV no painel da turma', () => {
  let turmaNoServidor
  let alunosNoServidor

  beforeEach(() => {
    entrarComo(PROFESSOR, 'token-prof-csv')
    turmaNoServidor = { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite', alunos: 1 }
    alunosNoServidor = [{ id: 10, nome: 'Bruno Lima', turma_id: 3 }]
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia o CSV com FormData e Bearer token, ordena os alunos importados e mostra o resumo', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()

      if (url.endsWith('/turmas') && method === 'GET') return json([turmaNoServidor])
      if (url.endsWith('/turmas/3') && method === 'GET') return json(turmaNoServidor)
      if (url.endsWith('/turmas/3/alunos') && method === 'GET') return json(alunosNoServidor)
      if (url.endsWith('/turmas/3/alunos/importar') && method === 'POST') {
        const importados = [
          { id: 12, nome: 'Victor Breno', turma_id: 3 },
          { id: 11, nome: 'Alicia Suyane', turma_id: 3 },
        ]
        alunosNoServidor = [...alunosNoServidor, ...importados]
        turmaNoServidor = { ...turmaNoServidor, alunos: alunosNoServidor.length }
        return json({ total_importados: 2, ignorados: 1, alunos: importados }, 201)
      }
      return json({ detail: 'endpoint indisponível' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/turmas/3')
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()

    const botaoImportar = screen.getByRole('button', { name: /importar csv/i })
    const inputArquivo = screen.getByTestId('input-importar-csv')
    const clickSpy = vi.spyOn(inputArquivo, 'click')
    await user.click(botaoImportar)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    const arquivoCsv = new File([',CURSISTA\n,Victor Breno\n,Alicia Suyane\n'], 'chamada.csv', { type: 'text/csv' })
    fireEvent.change(inputArquivo, { target: { files: [arquivoCsv] } })

    expect(await screen.findByText('2 alunos importados com sucesso (1 linha ignorada).')).toBeInTheDocument()
    expect(screen.getByText('3 Alunos Matriculados')).toBeInTheDocument()

    const chamadaImport = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/turmas/3/alunos/importar'))
    expect(chamadaImport).toBeTruthy()
    const [, opcoesImport] = chamadaImport
    expect(opcoesImport.method).toBe('POST')
    expect(opcoesImport.headers).toMatchObject({ Authorization: 'Bearer token-prof-csv' })
    expect(opcoesImport.headers['Content-Type']).toBeUndefined()
    expect(opcoesImport.body).toBeInstanceOf(FormData)
    expect(opcoesImport.body.get('arquivo')).toBe(arquivoCsv)

    const nomesRenderizados = screen
      .getAllByText(/Alicia Suyane|Bruno Lima|Victor Breno/)
      .map((el) => el.textContent)
    expect(nomesRenderizados).toEqual(['Alicia Suyane', 'Bruno Lima', 'Victor Breno'])
  })

  it('exibe aviso de erro quando o backend rejeita o arquivo CSV (400)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()

      if (url.endsWith('/turmas') && method === 'GET') return json([turmaNoServidor])
      if (url.endsWith('/turmas/3') && method === 'GET') return json(turmaNoServidor)
      if (url.endsWith('/turmas/3/alunos') && method === 'GET') return json(alunosNoServidor)
      if (url.endsWith('/turmas/3/alunos/importar') && method === 'POST') {
        return json({ detail: "Cabeçalho 'CURSISTA' não encontrado no arquivo CSV." }, 400)
      }
      return json({ detail: 'endpoint indisponível' }, 500)
    }))

    renderApp('/turmas/3')
    await screen.findByText('Bruno Lima')

    const arquivoInvalido = new File(['NOME,EMAIL\nAna,ana@escola.com\n'], 'invalido.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByTestId('input-importar-csv'), { target: { files: [arquivoInvalido] } })

    expect(await screen.findByText("Cabeçalho 'CURSISTA' não encontrado no arquivo CSV.")).toBeInTheDocument()
    expect(screen.getByText('1 Alunos Matriculados')).toBeInTheDocument()
  })

  it('mostra estado "Importando..." desabilitado enquanto aguarda a resposta', async () => {
    let resolverImportacao
    vi.stubGlobal('fetch', vi.fn((input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()

      if (url.endsWith('/turmas') && method === 'GET') return Promise.resolve(json([turmaNoServidor]))
      if (url.endsWith('/turmas/3') && method === 'GET') return Promise.resolve(json(turmaNoServidor))
      if (url.endsWith('/turmas/3/alunos') && method === 'GET') return Promise.resolve(json(alunosNoServidor))
      if (url.endsWith('/turmas/3/alunos/importar') && method === 'POST') {
        return new Promise((resolve) => { resolverImportacao = resolve })
      }
      return Promise.resolve(json({ detail: 'endpoint indisponível' }, 500))
    }))

    renderApp('/turmas/3')
    await screen.findByText('Bruno Lima')

    const arquivoCsv = new File([',CURSISTA\n,Clara Tiberio\n'], 'chamada.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByTestId('input-importar-csv'), { target: { files: [arquivoCsv] } })

    const botaoOcupado = await screen.findByRole('button', { name: /importando\.\.\./i })
    expect(botaoOcupado).toBeDisabled()

    resolverImportacao(json({ total_importados: 1, ignorados: 0, alunos: [{ id: 15, nome: 'Clara Tiberio', turma_id: 3 }] }, 201))

    await waitFor(() => expect(screen.getByRole('button', { name: /importar csv/i })).toBeEnabled())
    expect(screen.getByText('1 aluno importado com sucesso.')).toBeInTheDocument()
  })

  it('encerra a sessão e volta para /login se a importação retornar 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = (options.method || 'GET').toUpperCase()

      if (url.endsWith('/turmas') && method === 'GET') return json([turmaNoServidor])
      if (url.endsWith('/turmas/3') && method === 'GET') return json(turmaNoServidor)
      if (url.endsWith('/turmas/3/alunos') && method === 'GET') return json(alunosNoServidor)
      if (url.endsWith('/turmas/3/alunos/importar') && method === 'POST') {
        return json({ detail: 'Token de acesso inválido ou ausente.' }, 401)
      }
      return json({ detail: 'endpoint indisponível' }, 500)
    }))

    const router = renderApp('/turmas/3')
    await screen.findByText('Bruno Lima')

    const arquivoCsv = new File([',CURSISTA\n,Clara Tiberio\n'], 'chamada.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByTestId('input-importar-csv'), { target: { files: [arquivoCsv] } })

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
    expect(lerSessao()).toBeNull()
  })
})

import { screen, within } from '@testing-library/react'
import { renderApp, renderNaRota } from '../test/rotas'
import { entrarComo } from '../test/sessao'
import { ProfPerfilScreen } from '../screens/professor/ProfPerfilScreen.jsx'

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const MARIA = { id: 21, nome: 'Maria Souza', email: 'maria@escola.com', materia: 'Física', tipo: 1, ativo: true }

const cabecalhoDe = (titulo) => within(screen.getByRole('heading', { name: titulo }).closest('header'))

describe('Professor logado no cabeçalho e no perfil', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = String(input).replace('http://localhost:8000', '')
      if (url === '/usuarios' || url === '/turmas' || url === '/simulados') return json([])
      return json({ detail: 'Não encontrado.' }, 404)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('o dashboard cumprimenta pelo primeiro nome e mostra a inicial', async () => {
    entrarComo(MARIA)
    renderApp('/painel')

    expect(await screen.findByRole('heading', { name: 'Olá, Prof. Maria' })).toBeInTheDocument()
    expect(cabecalhoDe('Olá, Prof. Maria').getByText('M')).toBeInTheDocument()
  })

  it('o perfil mostra nome completo, e-mail e matéria', async () => {
    entrarComo(MARIA)
    renderApp('/perfil')

    expect(await screen.findByRole('heading', { name: 'Prof. Maria Souza' })).toBeInTheDocument()
    expect(screen.getByText('maria@escola.com')).toBeInTheDocument()
    expect(screen.getByText('Professor • Física')).toBeInTheDocument()
  })

  it('sem matéria, o perfil mostra só "Professor"', async () => {
    entrarComo({ ...MARIA, materia: null })
    renderApp('/perfil')

    expect(await screen.findByRole('heading', { name: 'Prof. Maria Souza' })).toBeInTheDocument()
    expect(screen.getByText('Professor')).toBeInTheDocument()
  })

  it('funciona também com a tela renderizada sem o provider da sessão', () => {
    entrarComo(MARIA)
    renderNaRota(<ProfPerfilScreen />)

    expect(screen.getByRole('heading', { name: 'Prof. Maria Souza' })).toBeInTheDocument()
  })
})

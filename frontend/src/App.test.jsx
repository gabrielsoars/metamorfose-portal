import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { normalizeUsuario, normalizeTurma } from './App'
import { renderApp, urlAtual } from './test/rotas'
import { ADMIN, semSessao } from './test/sessao'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = String(input)

      if (url.endsWith('/auth/login')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'token-admin', token_type: 'bearer', expires_in: 3600 }) }
      }

      if (url.endsWith('/auth/me')) {
        return { ok: true, status: 200, json: async () => ADMIN }
      }

      if (url.endsWith('/usuarios')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Matemática', tipo: 1, ativo: true },
          ],
        }
      }

      if (url.endsWith('/turmas')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite', alunos: 45 },
          ],
        }
      }

      return {
        ok: false,
        status: 500,
        json: async () => ({ detail: 'endpoint indisponível' }),
      }
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza a tela de login e leva o admin ao painel admin', async () => {
    const user = userEvent.setup()
    semSessao()

    const router = renderApp('/')

    expect(await screen.findByText('Metamorfose')).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
    expect(screen.getByText('Plataforma de Correção de Simulados')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'admin@escola.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-do-admin')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    expect(await screen.findByRole('heading', { name: /usuários/i })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/admin')
  })

  it('carrega usuários e turmas reais do backend e usa os dados integrados', async () => {
    renderApp('/admin')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/usuarios', expect.objectContaining({ method: 'GET' }))
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/turmas', expect.objectContaining({ method: 'GET' }))
    })

    expect(await screen.findByText('Ana Paula')).toBeInTheDocument()
  })

  it('normaliza os dados recebidos do backend para a interface', () => {
    expect(normalizeUsuario({ id: 7, nome: 'Ana Paula', email: 'ana@email.com', materia: 'Matemática', tipo: 1, ativo: true })).toMatchObject({
      id: 7,
      name: 'Ana Paula',
      subject: 'Matemática',
      active: true,
      initial: 'A',
    })

    expect(normalizeTurma({ id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite', alunos: 45 })).toMatchObject({
      id: 3,
      name: 'Extensivo Noturno',
      code: 'EN',
      turno: 'Noite',
      empty: false,
    })
  })
})

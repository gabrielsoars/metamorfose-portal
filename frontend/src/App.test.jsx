import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { normalizeUsuario, normalizeTurma } from './App'

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = String(input)

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

  it('renderiza a tela de login e permite acessar o painel admin', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(screen.getByText('Metamorfose')).toBeInTheDocument()
    expect(screen.getByText('Plataforma de Correção de Simulados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /entrar como admin/i }))

    expect(await screen.findByRole('heading', { name: /usuários/i })).toBeInTheDocument()
  })

  it('carrega usuários e turmas reais do backend e usa os dados integrados', async () => {
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/usuarios', expect.objectContaining({ method: 'GET' }))
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/turmas', expect.objectContaining({ method: 'GET' }))
    })

    await user.click(screen.getByRole('button', { name: /entrar como admin/i }))

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

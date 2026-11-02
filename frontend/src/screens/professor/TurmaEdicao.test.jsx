import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

const json = (body) => ({ ok: true, status: 200, json: async () => body })

describe('Editar turma', () => {
  let turmaNoServidor

  beforeEach(() => {
    turmaNoServidor = { id: 3, nome: 'Extensivo Noturno', ano: 2026, turno: 'Noite', alunos: 2 }
    sessionStorage.clear()
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'turma-detalhes', turmaId: 3 }))

    vi.stubGlobal('fetch', vi.fn(async (input, options = {}) => {
      const url = String(input)
      const method = options.method || 'GET'

      if (url.endsWith('/usuarios')) return json([])
      if (url.endsWith('/turmas') && method === 'GET') return json([turmaNoServidor])
      if (url.endsWith('/turmas/3/alunos')) {
        return json([{ id: 10, nome: 'Bruno', turma_id: 3 }, { id: 11, nome: 'Carla', turma_id: 3 }])
      }
      if (url.endsWith('/turmas/3') && method === 'PATCH') {
        turmaNoServidor = { ...turmaNoServidor, ...JSON.parse(options.body) }
        return json({ id: 3, nome: turmaNoServidor.nome, ano: turmaNoServidor.ano, turno: turmaNoServidor.turno })
      }
      if (url.endsWith('/alunos/10') && method === 'PATCH') return json({ id: 10, nome: 'Bruno', turma_id: 3 })
      return { ok: false, status: 500, json: async () => ({ detail: 'endpoint indisponível' }) }
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('abre o menu ⋮ com a opção "Editar turma"', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /mais opções/i }))

    expect(screen.getByRole('menuitem', { name: /editar turma/i })).toBeInTheDocument()
  })

  it('edita a turma, envia o PATCH com os campos do formulário e volta aos detalhes atualizados', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /mais opções/i }))
    await user.click(screen.getByRole('menuitem', { name: /editar turma/i }))

    expect(await screen.findByRole('heading', { name: /editar turma/i })).toBeInTheDocument()
    const nome = screen.getByDisplayValue('Extensivo Noturno')
    await user.clear(nome)
    await user.type(nome, 'Extensivo Matutino')
    await user.selectOptions(screen.getByDisplayValue('Noite'), 'Manhã')
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(await screen.findByRole('heading', { name: 'Extensivo Matutino' })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/turmas/3',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ nome: 'Extensivo Matutino', ano: 2026, turno: 'Manhã' }) }),
    )
    expect(JSON.parse(sessionStorage.getItem('metamorfose:nav'))).toMatchObject({ screen: 'turma-detalhes', turmaId: 3 })
  })

  it('restaura a tela de edição após um refresh', async () => {
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'turma-editar', turmaId: 3 }))

    render(<App />)

    expect(await screen.findByRole('heading', { name: /editar turma/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('Extensivo Noturno')).toBeInTheDocument())
  })

  it('mostra a matrícula do aluno como somente leitura e só envia o nome ao salvar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('Bruno')
    await user.click(screen.getAllByRole('button').find((b) => b.className.includes('hover:bg-orange-50')))

    expect(screen.getByDisplayValue('10')).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))
    await waitFor(() => expect(screen.queryByDisplayValue('10')).not.toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/alunos/10',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ nome: 'Bruno' }) }),
    )
  })
})

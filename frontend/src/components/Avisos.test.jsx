import { act, fireEvent, render, screen } from '@testing-library/react'
import { Avisos } from './Avisos.jsx'
import { mostrarErro } from './avisosEstado.js'

describe('Avisos', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra o erro e fecha no X', () => {
    render(<Avisos />)

    act(() => mostrarErro('Não foi possível salvar.'))
    expect(screen.getByText('Não foi possível salvar.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByText('Não foi possível salvar.')).not.toBeInTheDocument()
  })

  it('some sozinho depois de 5 segundos', () => {
    vi.useFakeTimers()
    render(<Avisos />)

    act(() => mostrarErro('Erro temporário'))
    act(() => vi.advanceTimersByTime(4900))
    expect(screen.getByText('Erro temporário')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByText('Erro temporário')).not.toBeInTheDocument()
  })

  it('mostra no máximo 3 avisos; o mais antigo sai', () => {
    render(<Avisos />)

    act(() => {
      mostrarErro('Erro 1')
      mostrarErro('Erro 2')
      mostrarErro('Erro 3')
      mostrarErro('Erro 4')
    })

    expect(screen.queryByText('Erro 1')).not.toBeInTheDocument()
    expect(screen.getByText('Erro 2')).toBeInTheDocument()
    expect(screen.getByText('Erro 4')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Fechar aviso' })).toHaveLength(3)
  })
})

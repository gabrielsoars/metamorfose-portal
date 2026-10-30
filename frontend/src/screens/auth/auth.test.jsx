import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

const json = (status, body) => ({ ok: status < 400, status, json: async () => body })

// Responde ao que o App carrega na subida e delega as rotas /auth ao handler do teste.
function mockFetch(authHandler) {
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = String(input)
    if (url.endsWith('/usuarios') || url.endsWith('/turmas')) return json(200, [])
    const path = url.replace('http://localhost:8000', '')
    if (path.startsWith('/auth/')) return authHandler(path, options.body ? JSON.parse(options.body) : null)
    return json(500, { detail: 'endpoint indisponível' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const chamadasAuth = (fetchMock) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth/'))

// A contagem agenda um timer por segundo; cada tick precisa renderizar antes do próximo.
const passarSegundos = async (n) => {
  for (let i = 0; i < n; i += 1) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  }
}

describe('telas de recuperação de senha', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fluxo completo: recuperar -> mensagem neutra -> nova senha -> login com aviso', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch((path) => {
      if (path === '/auth/esqueci-senha') return json(202, { detail: 'Se o e-mail estiver cadastrado, um código de redefinição foi enviado.' })
      if (path === '/auth/redefinir-senha') return { ok: true, status: 204, json: async () => null }
      return json(500, {})
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: /esqueceu a senha/i }))
    expect(await screen.findByRole('heading', { name: /recuperar senha/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'ana@email.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    expect(await screen.findByText('Se o e-mail existir, enviamos instruções.')).toBeInTheDocument()
    expect(chamadasAuth(fetchMock)[0][0]).toBe('http://localhost:8000/auth/esqueci-senha')
    expect(JSON.parse(chamadasAuth(fetchMock)[0][1].body)).toEqual({ email: 'ana@email.com' })

    await user.click(screen.getByRole('button', { name: /já tenho o código/i }))
    expect(await screen.findByRole('heading', { name: /nova senha/i })).toBeInTheDocument()
    // O e-mail digitado antes acompanha o usuário.
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com')

    await user.type(screen.getByLabelText('Código de Verificação'), '123456')
    await user.type(screen.getByLabelText('Nova Senha'), 'senhaNova123')
    await user.type(screen.getByLabelText('Confirmar Senha'), 'senhaNova123')
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

    expect(await screen.findByText(/senha redefinida com sucesso/i)).toBeInTheDocument()
    expect(screen.getByText('Plataforma de Correção de Simulados')).toBeInTheDocument()
    const redefinir = chamadasAuth(fetchMock)[1]
    expect(redefinir[0]).toBe('http://localhost:8000/auth/redefinir-senha')
    expect(JSON.parse(redefinir[1].body)).toEqual({ email: 'ana@email.com', codigo: '123456', senha: 'senhaNova123' })
  })

  it('mostra a mesma mensagem mesmo quando o backend não conhece o e-mail', async () => {
    const user = userEvent.setup()
    // O backend responde 202 igual para e-mail existente ou não.
    mockFetch(() => json(202, { detail: 'Se o e-mail estiver cadastrado, um código de redefinição foi enviado.' }))

    render(<App />)
    await user.click(screen.getByRole('button', { name: /esqueceu a senha/i }))
    await user.type(screen.getByLabelText('E-mail'), 'ninguem@email.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    expect(await screen.findByText('Se o e-mail existir, enviamos instruções.')).toBeInTheDocument()
  })

  it('valida a nova senha no cliente sem chamar a API', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'redefinir-senha', email: 'ana@email.com' }))
    const fetchMock = mockFetch(() => json(204, null))

    render(<App />)
    await user.type(await screen.findByLabelText('Código de Verificação'), '123456')
    await user.type(screen.getByLabelText('Nova Senha'), 'curta')
    await user.type(screen.getByLabelText('Confirmar Senha'), 'curta')
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))
    expect(window.alert).toHaveBeenLastCalledWith(expect.stringMatching(/pelo menos 8 caracteres/))

    await user.clear(screen.getByLabelText('Nova Senha'))
    await user.type(screen.getByLabelText('Nova Senha'), 'senhaNova123')
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))
    expect(window.alert).toHaveBeenLastCalledWith(expect.stringMatching(/confirmação/))

    expect(chamadasAuth(fetchMock)).toHaveLength(0)
  })

  it('mostra a mensagem do backend quando o código é inválido ou expirado', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'redefinir-senha', email: 'ana@email.com' }))
    mockFetch(() => json(400, { detail: 'Código de redefinição inválido ou expirado.' }))

    render(<App />)
    await user.type(await screen.findByLabelText('Código de Verificação'), '000000')
    await user.type(screen.getByLabelText('Nova Senha'), 'senhaNova123')
    await user.type(screen.getByLabelText('Confirmar Senha'), 'senhaNova123')
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

    await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith('Código de redefinição inválido ou expirado.'))
    // Continua na tela de nova senha.
    expect(screen.getByRole('heading', { name: /nova senha/i })).toBeInTheDocument()
  })

  it('mostra o erro 422 da API de forma legível', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'recuperar-senha', email: 'ana@email.com' }))
    mockFetch(() => json(422, { detail: [{ type: 'value_error', loc: ['body', 'email'], msg: 'Valor inválido' }] }))

    render(<App />)
    await user.click(await screen.findByRole('button', { name: /enviar código/i }))

    await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith('Valor inválido'))
  })

  it('restaura as telas de recuperação após o refresh com o e-mail digitado', async () => {
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'redefinir-senha', email: 'ana@email.com' }))
    mockFetch(() => json(204, null))

    render(<App />)

    expect(await screen.findByRole('heading', { name: /nova senha/i })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com')
  })
})

describe('reenvio do código de ativação', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const abrirAtivacao = () => {
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'ativacao', email: 'novo@email.com' }))
    render(<App />)
  }

  it('chama o endpoint com o e-mail e desabilita o botão com contagem regressiva', async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetch(() => json(202, { detail: 'ok' }))
    abrirAtivacao()

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    const [url, options] = chamadasAuth(fetchMock)[0]
    expect(url).toBe('http://localhost:8000/auth/reenviar-ativacao')
    expect(JSON.parse(options.body)).toEqual({ email: 'novo@email.com' })

    const botao = screen.getByRole('button', { name: 'Reenviar em 60s' })
    expect(botao).toBeDisabled()

    await passarSegundos(10)
    expect(screen.getByRole('button', { name: 'Reenviar em 50s' })).toBeDisabled()

    // Clique durante a contagem não faz nova chamada.
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar em 50s' }))
    expect(chamadasAuth(fetchMock)).toHaveLength(1)

    await passarSegundos(50)
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled()
  })

  it('exige o e-mail antes de reenviar', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('metamorfose:nav', JSON.stringify({ screen: 'ativacao' }))
    const fetchMock = mockFetch(() => json(202, {}))
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Reenviar' }))

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/e-mail/))
    expect(chamadasAuth(fetchMock)).toHaveLength(0)
  })

  it('trata 429 com mensagem clara e bloqueia o botão', async () => {
    vi.useFakeTimers()
    mockFetch(() => json(429, { detail: 'Too many requests' }))
    abrirAtivacao()

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/aguarde um minuto/i))
    expect(screen.getByRole('button', { name: 'Reenviar em 60s' })).toBeDisabled()
  })

  it('não inicia a contagem quando o envio falha por outro erro', async () => {
    vi.useFakeTimers()
    mockFetch(() => json(500, { detail: 'Falha interna' }))
    abrirAtivacao()

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    expect(window.alert).toHaveBeenCalledWith('Falha interna')
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled()
  })
})

import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, urlAtual } from '../test/rotas'
import { ADMIN, PROFESSOR, entrarComo, semSessao } from '../test/sessao'
import { lerSessao } from '../services/sessao'
import { processarGabarito } from '../services/scanService'

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

// API mínima: login (senha certa = "senha-correta"), /auth/me, cadastro de senha e turmas.
// `turmasStatus` simula o token recusado pela API.
let usuarioDoLogin
let turmasStatus

function mockApi() {
  usuarioDoLogin = PROFESSOR
  turmasStatus = 200
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = String(input).replace('http://localhost:8000', '')
    const corpo = options.body ? JSON.parse(options.body) : {}
    if (url === '/auth/login') {
      if (corpo.senha !== 'senha-correta') return json({ detail: 'E-mail ou senha inválidos.' }, 401)
      return json({ access_token: 'token-novo', token_type: 'bearer', expires_in: 3600 })
    }
    if (url === '/auth/me') return json(usuarioDoLogin)
    if (url === '/auth/ativar' || url === '/auth/redefinir-senha') {
      if (corpo.codigo !== '123456') return json({ detail: 'Código inválido ou expirado.' }, 400)
      return json(null, 204)
    }
    if (url === '/auth/esqueci-senha' || url === '/auth/reenviar-ativacao') return json({ detail: 'ok' }, 202)
    if (url === '/turmas') return turmasStatus === 200 ? json([]) : json({ detail: 'Token de acesso inválido ou ausente.' }, turmasStatus)
    // Demais listas (simulados, usuários...) vazias: estes testes só olham a autenticação
    return json([])
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function preencherLogin(user, email, senha) {
  await user.type(await screen.findByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), senha)
  await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))
}

async function preencherCodigoESenha(user, { codigo = '123456', senha = 'senha-correta', confirmacao = senha } = {}) {
  await user.type(screen.getByLabelText('Código de Verificação'), codigo)
  await user.type(screen.getByLabelText('Nova Senha'), senha)
  await user.type(screen.getByLabelText('Confirmar Senha'), confirmacao)
}

beforeEach(() => {
  mockApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('rota privada sem sessão vai para o login e, depois de entrar, volta para ela', async () => {
    const user = userEvent.setup()
    semSessao()
    const router = renderApp('/simulados')

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')

    await preencherLogin(user, 'pedro@unesp.br', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Meus Simulados' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/simulados')
    expect(lerSessao()).toMatchObject({ token: 'token-novo', usuario: { email: 'pedro@unesp.br' } })
  })

  it('senha errada mostra o erro da API e não cria sessão', async () => {
    const user = userEvent.setup()
    semSessao()
    const router = renderApp('/login')

    await preencherLogin(user, 'pedro@unesp.br', 'senha-errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(urlAtual(router)).toBe('/login')
    expect(lerSessao()).toBeNull()
  })

  it('não chama a API com e-mail ou senha em branco', async () => {
    const user = userEvent.setup()
    semSessao()
    renderApp('/login')

    await user.click(await screen.findByRole('button', { name: /acessar plataforma/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o e-mail e a senha.')
    expect(global.fetch).not.toHaveBeenCalledWith('http://localhost:8000/auth/login', expect.anything())
  })

  it('servidor fora do ar mostra mensagem de conexão', async () => {
    const user = userEvent.setup()
    semSessao()
    global.fetch.mockImplementation(async () => {
      throw new TypeError('Failed to fetch')
    })
    renderApp('/login')

    await preencherLogin(user, 'pedro@unesp.br', 'senha-correta')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor')
  })

  it('o admin entra direto no painel admin', async () => {
    const user = userEvent.setup()
    semSessao()
    usuarioDoLogin = ADMIN
    const router = renderApp('/login')

    await preencherLogin(user, 'admin@escola.com', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/admin')
  })
})

describe('sessão', () => {
  it('as chamadas à API levam o token da sessão', async () => {
    entrarComo(PROFESSOR, 'token-do-pedro')
    renderApp('/turmas')

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/turmas',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-do-pedro' }) }),
    ))
  })

  it('o professor não abre as telas de admin', async () => {
    entrarComo(PROFESSOR)
    const router = renderApp('/admin/professores/novo')

    expect(await screen.findByRole('heading', { name: 'Olá, Prof. Pedro' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/painel')
    expect(global.fetch).not.toHaveBeenCalledWith('http://localhost:8000/usuarios', expect.anything())
  })

  it('token recusado pela API (401) encerra a sessão e volta para o login', async () => {
    entrarComo(PROFESSOR)
    turmasStatus = 401
    const router = renderApp('/turmas')

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
    expect(lerSessao()).toBeNull()
  })

  it('sessão vencida é descartada', async () => {
    entrarComo(PROFESSOR)
    localStorage.setItem('metamorfose.sessao', JSON.stringify({ ...lerSessao(), expiraEm: Date.now() - 1 }))
    const router = renderApp('/turmas')

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/login')
  })

  it('sair limpa a sessão e as telas privadas voltam a pedir login', async () => {
    const user = userEvent.setup()
    entrarComo(PROFESSOR)
    const router = renderApp('/perfil')

    await user.click(await screen.findByRole('button', { name: /sair da conta/i }))

    expect(await screen.findByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
    expect(lerSessao()).toBeNull()

    await act(() => router.navigate('/turmas'))
    await waitFor(() => expect(urlAtual(router)).toBe('/login'))
    expect(screen.getByRole('heading', { name: 'Metamorfose' })).toBeInTheDocument()
  })

  it('o escaneamento envia o token ao scan_service', async () => {
    entrarComo(PROFESSOR, 'token-do-pedro')
    global.fetch.mockImplementation(async () => json({ respostas: {} }))

    await processarGabarito(new File(['x'], 'cartao.jpg', { type: 'image/jpeg' }), 10)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/processar?num_questoes=10',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-do-pedro' }) }),
    )
  })
})

describe('primeiro acesso', () => {
  it('ativa a conta com o código e já entra na plataforma', async () => {
    const user = userEvent.setup()
    semSessao()
    const router = renderApp('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'pedro@unesp.br')
    await user.click(screen.getByRole('button', { name: 'Ativar conta' }))
    expect(await screen.findByRole('heading', { name: 'Ativar Conta' })).toBeInTheDocument()
    // O e-mail digitado no login vem preenchido
    expect(screen.getByLabelText('E-mail')).toHaveValue('pedro@unesp.br')

    await preencherCodigoESenha(user)
    await user.click(screen.getByRole('button', { name: /ativar e acessar/i }))

    expect(await screen.findByRole('heading', { name: 'Olá, Prof. Pedro' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/painel')
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/auth/ativar', expect.objectContaining({
      body: JSON.stringify({ email: 'pedro@unesp.br', codigo: '123456', senha: 'senha-correta' }),
    }))
  })

  it('senhas diferentes não chamam a API', async () => {
    const user = userEvent.setup()
    semSessao()
    renderApp('/ativacao')

    await user.type(await screen.findByLabelText('E-mail'), 'pedro@unesp.br')
    await preencherCodigoESenha(user, { senha: 'senha-correta', confirmacao: 'outra-senha' })
    await user.click(screen.getByRole('button', { name: /ativar e acessar/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem.')
    expect(global.fetch).not.toHaveBeenCalledWith('http://localhost:8000/auth/ativar', expect.anything())
  })

  it('código errado mostra o erro da API', async () => {
    const user = userEvent.setup()
    semSessao()
    renderApp('/ativacao')

    await user.type(await screen.findByLabelText('E-mail'), 'pedro@unesp.br')
    await preencherCodigoESenha(user, { codigo: '000000' })
    await user.click(screen.getByRole('button', { name: /ativar e acessar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou expirado.')
  })

  it('reenviar pede um código novo para o e-mail informado', async () => {
    const user = userEvent.setup()
    semSessao()
    renderApp('/ativacao')

    await user.type(await screen.findByLabelText('E-mail'), 'pedro@unesp.br')
    await user.click(screen.getByRole('button', { name: 'Reenviar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('enviamos um novo código')
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/auth/reenviar-ativacao', expect.objectContaining({
      body: JSON.stringify({ email: 'pedro@unesp.br' }),
    }))
  })
})

describe('esqueci minha senha', () => {
  it('pede o código, redefine a senha e já entra na plataforma', async () => {
    const user = userEvent.setup()
    semSessao()
    const router = renderApp('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'pedro@unesp.br')
    await user.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))
    expect(await screen.findByRole('heading', { name: 'Esqueceu a senha?' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/recuperar-senha')
    expect(screen.getByLabelText('E-mail')).toHaveValue('pedro@unesp.br')

    await user.click(screen.getByRole('button', { name: /enviar código/i }))
    expect(await screen.findByRole('heading', { name: 'Redefinir Senha' })).toBeInTheDocument()
    expect(urlAtual(router)).toBe('/redefinir-senha')
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/auth/esqueci-senha', expect.objectContaining({
      body: JSON.stringify({ email: 'pedro@unesp.br' }),
    }))

    await preencherCodigoESenha(user)
    await user.click(screen.getByRole('button', { name: /redefinir e acessar/i }))

    expect(await screen.findByRole('heading', { name: 'Olá, Prof. Pedro' })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/auth/redefinir-senha', expect.objectContaining({
      body: JSON.stringify({ email: 'pedro@unesp.br', codigo: '123456', senha: 'senha-correta' }),
    }))
  })

  it('o link com ?email= já preenche o e-mail', async () => {
    semSessao()
    renderApp('/redefinir-senha?email=pedro%40unesp.br')

    expect(await screen.findByLabelText('E-mail')).toHaveValue('pedro@unesp.br')
  })
})

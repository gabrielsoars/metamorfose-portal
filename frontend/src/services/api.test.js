import { requestJson } from './api.js'

const respostaErro = (status, payload) => ({
  ok: false,
  status,
  json: async () => payload,
})

describe('requestJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('usa o detail em texto como mensagem de erro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respostaErro(400, { detail: 'Código inválido.' })))

    await expect(requestJson('/auth/ativar')).rejects.toThrow('Código inválido.')
  })

  it('transforma o detail em lista (422) em texto legível', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respostaErro(422, {
      detail: [
        { type: 'string_too_short', loc: ['body', 'senha'], msg: 'String should have at least 8 characters' },
        { type: 'string_pattern_mismatch', loc: ['body', 'codigo'], msg: 'String should match pattern' },
      ],
    })))

    const erro = await requestJson('/auth/redefinir-senha').catch((e) => e)

    expect(erro.message).toBe('String should have at least 8 characters; String should match pattern')
    expect(erro.message).not.toContain('[object Object]')
  })

  it('usa a mensagem padrão quando a resposta de erro não tem detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respostaErro(500, {})))

    await expect(requestJson('/x')).rejects.toThrow('Endpoint não disponível: /x')
  })
})

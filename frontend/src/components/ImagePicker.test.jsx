import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ImagePicker } from './ImagePicker.jsx'
import { prepararImagem, validarImagem } from './imagemUtils.js'

function mockPointerCoarse(coarse) {
  window.matchMedia = vi.fn((query) => ({
    matches: coarse && query === '(pointer: coarse)',
    media: query,
  }))
}

function enviarArquivo(input, arquivo) {
  fireEvent.change(input, { target: { files: [arquivo] } })
}

describe('ImagePicker', () => {
  beforeEach(() => {
    window.alert = vi.fn()
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    // jsdom não decodifica imagem (onload nunca dispara): simula falha e o arquivo segue como está.
    vi.stubGlobal('Image', class {
      set src(_valor) {
        queueMicrotask(() => this.onerror?.())
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no desktop mostra só "Anexar foto" e não oferece câmera', () => {
    mockPointerCoarse(false)
    render(<ImagePicker onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /anexar foto/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tirar foto/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('input-camera')).not.toBeInTheDocument()
    expect(document.querySelector('input[capture]')).toBeNull()
  })

  it('no celular mostra "Tirar foto" com capture=environment e "Anexar da galeria" sem capture', () => {
    mockPointerCoarse(true)
    render(<ImagePicker onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /tirar foto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anexar da galeria/i })).toBeInTheDocument()
    expect(screen.getByTestId('input-camera')).toHaveAttribute('capture', 'environment')
    expect(screen.getByTestId('input-galeria')).not.toHaveAttribute('capture')
  })

  it('rejeita arquivo que não é imagem, avisa e não chama onSelect', async () => {
    mockPointerCoarse(false)
    const onSelect = vi.fn()
    render(<ImagePicker onSelect={onSelect} />)

    enviarArquivo(screen.getByTestId('input-galeria'), new File(['x'], 'notas.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/imagem/i)))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('rejeita imagem acima do limite de tamanho', async () => {
    mockPointerCoarse(false)
    const onSelect = vi.fn()
    render(<ImagePicker onSelect={onSelect} />)

    const grande = new File(['x'], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(grande, 'size', { value: 30 * 1024 * 1024 })
    enviarArquivo(screen.getByTestId('input-galeria'), grande)

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/muito grande/i)))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('devolve o File quando a imagem é válida (por input e por arrastar e soltar)', async () => {
    mockPointerCoarse(false)
    const onSelect = vi.fn()
    render(<ImagePicker onSelect={onSelect} />)

    const foto = new File(['x'], 'foto.png', { type: 'image/png' })
    enviarArquivo(screen.getByTestId('input-galeria'), foto)
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    expect(onSelect.mock.calls[0][0]).toBeInstanceOf(File)

    fireEvent.drop(screen.getByTestId('image-picker'), { dataTransfer: { files: [foto] } })
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(2))
  })

  it('mostra "Processando..." e desabilita os botões enquanto o chamador processa', () => {
    mockPointerCoarse(false)
    render(<ImagePicker onSelect={vi.fn()} processing />)

    expect(screen.getByRole('button', { name: /processando/i })).toBeDisabled()
  })

  it('com prévia mostra a imagem e o botão "Refazer"', () => {
    mockPointerCoarse(false)
    render(<ImagePicker onSelect={vi.fn()} previewUrl="blob:previa" />)

    expect(screen.getByAltText(/gabarito enviado/i)).toHaveAttribute('src', 'blob:previa')
    expect(screen.getByRole('button', { name: /refazer/i })).toBeInTheDocument()
  })
})

describe('imagemUtils', () => {
  it('validarImagem aceita imagens (inclusive HEIC sem type) e recusa o resto', () => {
    expect(validarImagem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(validarImagem(new File(['x'], 'IMG_1.HEIC', { type: '' }))).toBeNull()
    expect(validarImagem(new File(['x'], 'a.txt', { type: 'text/plain' }))).not.toBeNull()
    expect(validarImagem(new File(['x'], 'sem-tipo.bin', { type: '' }))).not.toBeNull()
  })

  describe('prepararImagem', () => {
    let dimensoes

    beforeEach(() => {
      dimensoes = { w: 4000, h: 3000 }
      URL.createObjectURL = vi.fn(() => 'blob:fake')
      URL.revokeObjectURL = vi.fn()
      vi.stubGlobal('Image', class {
        set src(_valor) {
          this.naturalWidth = dimensoes.w
          this.naturalHeight = dimensoes.h
          queueMicrotask(() => this.onload?.())
        }
      })
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() })
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
        cb(new Blob(['jpeg'], { type: 'image/jpeg' }))
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('reduz foto grande para lado maior de 2000 px, em JPEG', async () => {
      const original = new File(['x'], 'foto.heic', { type: 'image/heic' })
      const resultado = await prepararImagem(original)

      expect(resultado).not.toBe(original)
      expect(resultado.type).toBe('image/jpeg')
      expect(resultado.name).toBe('foto.jpg')
    })

    it('mantém o canvas na proporção original', async () => {
      const criado = []
      const criar = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = criar(tag)
        if (tag === 'canvas') criado.push(el)
        return el
      })

      await prepararImagem(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))

      expect(criado[0].width).toBe(2000)
      expect(criado[0].height).toBe(1500)
    })

    it('não mexe em foto que já cabe no limite', async () => {
      dimensoes = { w: 1200, h: 900 }
      const original = new File(['x'], 'pequena.jpg', { type: 'image/jpeg' })

      expect(await prepararImagem(original)).toBe(original)
    })

    it('devolve o original quando o navegador não decodifica a imagem', async () => {
      vi.stubGlobal('Image', class {
        set src(_valor) {
          queueMicrotask(() => this.onerror?.())
        }
      })
      const original = new File(['x'], 'foto.heic', { type: 'image/heic' })

      expect(await prepararImagem(original)).toBe(original)
    })
  })
})

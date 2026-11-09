import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { prepararImagem, validarImagem } from './imagemUtils.js';

// Celular: "Tirar foto" (câmera traseira) e "Anexar da galeria".
// Desktop: "Anexar foto" e arrastar e soltar, sem câmera.
// Valida o arquivo, reduz fotos grandes e devolve o File em `onSelect`.
// Quem chama decide o que fazer com ele (ex.: enviar ao scan) e controla `previewUrl` e `processing`.
function ehCelular() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

export function ImagePicker({ onSelect, previewUrl = null, processing = false, className = '' }) {
  const [celular] = useState(ehCelular);
  const [preparando, setPreparando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const cameraInput = useRef(null);
  const galeriaInput = useRef(null);

  const ocupado = processing || preparando;

  const receberArquivo = async (arquivo) => {
    if (!arquivo) return;
    const erro = validarImagem(arquivo);
    if (erro) {
      window.alert(erro);
      return;
    }

    setPreparando(true);
    try {
      const pronto = await prepararImagem(arquivo);
      await onSelect(pronto);
    } catch (error) {
      window.alert(error.message || 'Não foi possível processar a imagem.');
    } finally {
      setPreparando(false);
    }
  };

  const handleInput = (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    receberArquivo(arquivo);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setArrastando(false);
    if (ocupado) return;
    receberArquivo(event.dataTransfer?.files?.[0]);
  };

  const btn = 'bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-white/30 transition-colors disabled:opacity-60';

  return (
    <div
      data-testid="image-picker"
      className={`bg-gray-900 w-full h-48 relative flex items-center justify-center overflow-hidden shrink-0 ${arrastando ? 'ring-2 ring-inset ring-white/70' : ''} ${className}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!ocupado) setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Gabarito enviado" className="h-full w-full object-contain" />
      ) : (
        <p className="text-xs font-semibold text-white/60">
          {ocupado ? 'Processando...' : celular ? 'Nenhuma foto enviada' : 'Arraste a foto do gabarito aqui'}
        </p>
      )}

      <input ref={galeriaInput} type="file" accept="image/*" className="hidden" data-testid="input-galeria" onChange={handleInput} />
      {celular && (
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" data-testid="input-camera" onChange={handleInput} />
      )}

      <div className="absolute bottom-3 right-3 flex gap-2">
        {celular && (
          <button type="button" onClick={() => cameraInput.current?.click()} disabled={ocupado} className={btn}>
            <Camera size={14} /> {previewUrl ? 'Refazer foto' : 'Tirar foto'}
          </button>
        )}
        <button type="button" onClick={() => galeriaInput.current?.click()} disabled={ocupado} className={btn}>
          {celular ? <ImageIcon size={14} /> : <RefreshCw size={14} />}
          {ocupado ? 'Processando...' : celular ? 'Anexar da galeria' : previewUrl ? 'Refazer' : 'Anexar foto'}
        </button>
      </div>
    </div>
  );
}

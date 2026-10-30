export const TAMANHO_MAX_MB = 25;
export const LADO_MAX_PX = 2000;

const EXTENSOES_IMAGEM = /\.(jpe?g|png|webp|heic|heif)$/i;

// Retorna a mensagem de erro, ou null se o arquivo é aceitável.
// HEIC costuma chegar sem `type` (depende do navegador), então a extensão também vale.
export function validarImagem(arquivo) {
  const ehImagem = arquivo.type
    ? arquivo.type.startsWith('image/')
    : EXTENSOES_IMAGEM.test(arquivo.name || '');
  if (!ehImagem) return 'Arquivo inválido. Envie uma imagem (JPG, PNG, WebP ou HEIC).';
  if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) {
    return `A imagem é muito grande. O limite é de ${TAMANHO_MAX_MB} MB.`;
  }
  return null;
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

// Reduz fotos grandes de celular (lado maior > ladoMax) para JPEG antes do envio.
// Se o navegador não conseguir decodificar o arquivo (ex.: HEIC fora do Safari),
// devolve o original para o servidor tentar ler.
export async function prepararImagem(arquivo, ladoMax = LADO_MAX_PX) {
  let img;
  try {
    img = await carregarImagem(arquivo);
  } catch {
    return arquivo;
  }

  const maior = Math.max(img.naturalWidth, img.naturalHeight);
  if (!maior || maior <= ladoMax) return arquivo;

  const escala = ladoMax / maior;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return arquivo;

  const nome = `${(arquivo.name || 'foto').replace(/\.[^.]+$/, '')}.jpg`;
  return new File([blob], nome, { type: 'image/jpeg' });
}

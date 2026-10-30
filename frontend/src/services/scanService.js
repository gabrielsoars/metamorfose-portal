const SCAN_BASE_URL = import.meta.env.VITE_SCAN_URL || 'http://localhost:8001';

// Não usa requestJson: ele força Content-Type: application/json, o que quebra o upload.
// Sem definir o Content-Type, o navegador monta o multipart com o boundary correto.
export async function processarGabarito(arquivo, numQuestoes) {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const query = numQuestoes ? `?num_questoes=${numQuestoes}` : '';
  const response = await fetch(`${SCAN_BASE_URL}/processar${query}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = 'Não foi possível processar a imagem.';
    try {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') detail = payload.detail;
    } catch {
      // Mantém a mensagem padrão.
    }
    throw new Error(detail);
  }

  return response.json();
}

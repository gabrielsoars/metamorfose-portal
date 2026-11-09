// Sessão do usuário logado: { token, expiraEm (ms), usuario: { id, nome, email, tipo, ... } }.
// Fica no localStorage para sobreviver ao F5. Sessão vencida é descartada na leitura.

const CHAVE = 'metamorfose.sessao';
export const EVENTO_SESSAO_ENCERRADA = 'metamorfose:sessao-encerrada';

export const TIPO_ADMIN = 0;

export function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE));
    if (sessao?.token && sessao.expiraEm > Date.now()) return sessao;
  } catch {
    // Valor corrompido ou storage indisponível: trata como sem sessão.
  }
  limparSessao();
  return null;
}

export function gravarSessao(sessao) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    // Sem storage a sessão vale só até o F5.
  }
}

export function limparSessao() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar.
  }
}

// Token recusado pela API (expirou ou o usuário foi desativado): o app volta para o login.
export function encerrarSessao() {
  limparSessao();
  window.dispatchEvent(new Event(EVENTO_SESSAO_ENCERRADA));
}

export const ehAdmin = (usuario) => usuario?.tipo === TIPO_ADMIN;

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, obterUsuarioLogado } from '../services/authService.js';
import { EVENTO_SESSAO_ENCERRADA, ehAdmin, gravarSessao, lerSessao, limparSessao } from '../services/sessao.js';
import { rotas } from './rotas.js';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao);

  // Token recusado pela API em qualquer tela: sai da sessão (a RotaPrivada leva ao login).
  useEffect(() => {
    const encerrar = () => setSessao(null);
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
    return () => window.removeEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const { access_token: token, expires_in: expiraEmSegundos } = await login(email, senha);
    const usuario = await obterUsuarioLogado(token);
    const nova = { token, expiraEm: Date.now() + expiraEmSegundos * 1000, usuario };
    gravarSessao(nova);
    setSessao(nova);
    return nova;
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setSessao(null);
  }, []);

  const valor = useMemo(() => ({ sessao, entrar, sair }), [sessao, entrar, sair]);
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  return useContext(SessaoContext);
}

// Tela inicial de cada perfil.
export const rotaInicial = (usuario) => (ehAdmin(usuario) ? rotas.admin : rotas.painel());

// Botões "Sair": encerra a sessão e substitui a tela atual pelo login.
export function useSair() {
  // Sem provider (tela renderizada sozinha, como nos testes), só limpa o storage.
  const contexto = useSessao();
  const navigate = useNavigate();
  return () => {
    if (contexto) contexto.sair();
    else limparSessao();
    navigate(rotas.login, { replace: true });
  };
}

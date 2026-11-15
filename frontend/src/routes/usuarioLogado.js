import { useSessao } from './sessao.jsx';
import { lerSessao } from '../services/sessao.js';

// Nome, inicial, e-mail e matéria do usuário logado, para cabeçalhos e perfil.
// Sem provider (tela renderizada sozinha, como nos testes), lê direto do storage.
export function useUsuarioLogado() {
  const usuario = useSessao()?.sessao?.usuario ?? lerSessao()?.usuario;
  const nome = usuario?.nome?.trim() || 'Professor';
  return {
    nome,
    primeiroNome: nome.split(/\s+/)[0],
    inicial: nome.charAt(0).toUpperCase(),
    email: usuario?.email || '',
    materia: usuario?.materia || '',
  };
}

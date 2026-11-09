import { ativarConta, reenviarAtivacao } from '../../services/authService.js';
import { FormCodigoSenha } from './FormCodigoSenha.jsx';

export function AtivacaoScreen() {
  return (
    <FormCodigoSenha
      titulo="Ativar Conta"
      descricao="Enviamos um código para o seu e-mail. Insira-o abaixo e crie sua senha definitiva."
      textoBotao="Ativar e Acessar"
      confirmar={ativarConta}
      reenviar={reenviarAtivacao}
      avisoReenvio="Se a conta estiver pendente de ativação, enviamos um novo código."
    />
  );
}

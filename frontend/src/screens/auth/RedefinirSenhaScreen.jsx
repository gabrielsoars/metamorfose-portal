import { esqueciSenha, redefinirSenha } from '../../services/authService.js';
import { FormCodigoSenha } from './FormCodigoSenha.jsx';

export function RedefinirSenhaScreen() {
  return (
    <FormCodigoSenha
      titulo="Redefinir Senha"
      descricao="Enviamos um código para o seu e-mail. Insira-o abaixo e escolha uma nova senha."
      textoBotao="Redefinir e Acessar"
      confirmar={redefinirSenha}
      reenviar={esqueciSenha}
      avisoReenvio="Se o e-mail estiver cadastrado, enviamos um novo código."
    />
  );
}

import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';
import { esqueciSenha } from '../../services/authService.js';
import { OrangeBtn, Input } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { Alerta, mensagemDeErro, useEmailInicial } from './FormCodigoSenha.jsx';

export function RecuperarSenhaScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(useEmailInicial());
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErro('Informe o seu e-mail.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await esqueciSenha(email.trim());
      navigate(rotas.redefinirSenha, { state: { email: email.trim() } });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  };

  return (
    <AppShell variant="auth">
      <main className="flex-1 flex flex-col p-6 md:p-8">
        <button
          type="button"
          onClick={() => navigate(rotas.login)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors mt-4 md:mt-0 mb-6 w-fit"
        >
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </button>

        <form noValidate onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Esqueceu a senha?</h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.
          </p>

          <div className="space-y-5">
            <Input label="E-mail" type="email" placeholder="professor@unesp.br" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Alerta>{erro}</Alerta>
            <div className="pt-2">
              <OrangeBtn type="submit" disabled={enviando}>
                Enviar código <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </form>
      </main>
    </AppShell>
  );
}

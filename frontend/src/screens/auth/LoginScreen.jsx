import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { C } from '../../data/constants.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';
import { rotaInicial, useSessao } from '../../routes/sessao.jsx';
import { OrangeBtn, Input } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { Alerta, mensagemDeErro, useEmailInicial } from './FormCodigoSenha.jsx';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { entrar } = useSessao();
  const [email, setEmail] = useState(useEmailInicial());
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const { usuario } = await entrar(email.trim(), senha);
      // Volta para a tela que pediu o login (link copiado, sessão vencida) ou vai para o início do perfil.
      const de = location.state?.de;
      navigate(de ? de.pathname + de.search : rotaInicial(usuario), { replace: true });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  };

  return (
    <AppShell variant="auth">
      <main className="flex-1 flex flex-col p-6 md:p-8">
        <form noValidate onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center mt-12 md:mt-0">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border-2 border-black lg:hidden"
            style={{ background: C.yellow }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 8c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z" />
              <path d="M12 12c2 2 4 2 6 0" />
            </svg>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">Metamorfose</h1>
          <p className="text-gray-500 mb-8 font-medium lg:text-lg">Plataforma de Correção de Simulados</p>

          <div className="space-y-5">
            <Input label="E-mail" type="email" placeholder="professor@unesp.br" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="senha-login" className="block text-sm font-semibold text-gray-900">Senha</label>
                <button
                  type="button"
                  className="text-sm font-bold transition-colors"
                  style={{ color: C.orange }}
                  onClick={() => navigate(rotas.recuperarSenha, { state: { email: email.trim() } })}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                id="senha-login"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none transition-colors"
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <Alerta>{erro}</Alerta>

            <div className="pt-2">
              <OrangeBtn type="submit" disabled={enviando}>
                Acessar Plataforma <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Primeiro acesso?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={() => navigate(rotas.ativacao, { state: { email: email.trim() } })}>
              Ativar conta
            </button>
          </p>
        </div>
      </main>
    </AppShell>
  );
}

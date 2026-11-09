import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C } from '../../data/constants.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';
import { rotaInicial, useSessao } from '../../routes/sessao.jsx';
import { OrangeBtn, Input } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';

export const mensagemDeErro = (erro) =>
  erro?.status ? erro.message : 'Não foi possível conectar ao servidor. Tente novamente.';

export function Alerta({ children }) {
  if (!children) return null;
  return <p role="alert" className="text-sm font-semibold text-red-600">{children}</p>;
}

export function Aviso({ children }) {
  if (!children) return null;
  return <p role="status" className="text-sm font-semibold text-green-700">{children}</p>;
}

// E-mail vindo da tela anterior (state) ou de um link (?email=).
export function useEmailInicial() {
  const location = useLocation();
  return location.state?.email ?? new URLSearchParams(location.search).get('email') ?? '';
}

// Código recebido por e-mail + nova senha. Usado na ativação (primeiro acesso) e na redefinição de senha.
// Depois de `confirmar` dar certo, já entra com a senha nova.
export function FormCodigoSenha({ titulo, descricao, textoBotao, confirmar, reenviar, avisoReenvio }) {
  const navigate = useNavigate();
  const { entrar } = useSessao();
  const [email, setEmail] = useState(useEmailInicial());
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const validar = () => {
    if (!email.trim()) return 'Informe o seu e-mail.';
    if (!/^\d{6}$/.test(codigo)) return 'O código tem 6 dígitos.';
    if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (senha.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
    if (senha !== confirmacao) return 'As senhas não conferem.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAviso('');
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await confirmar(email.trim(), codigo, senha);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
      return;
    }
    try {
      const { usuario } = await entrar(email.trim(), senha);
      navigate(rotaInicial(usuario), { replace: true });
    } catch {
      // Senha já definida; se o login automático falhar, a pessoa entra pela tela de login.
      navigate(rotas.login, { replace: true, state: { email: email.trim() } });
    }
  };

  const handleReenviar = async () => {
    setErro('');
    setAviso('');
    if (!email.trim()) {
      setErro('Informe o seu e-mail para receber um novo código.');
      return;
    }
    try {
      await reenviar(email.trim());
      setAviso(avisoReenvio);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{titulo}</h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">{descricao}</p>

          <div className="space-y-5">
            <Input label="E-mail" type="email" placeholder="professor@unesp.br" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div>
              <label htmlFor="codigo-verificacao" className="block text-sm font-semibold text-gray-900 mb-1">Código de Verificação</label>
              <input
                id="codigo-verificacao"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none transition-colors text-center text-2xl tracking-[0.5em] font-mono font-bold text-gray-700"
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <Input label="Nova Senha" type="password" placeholder="Mínimo de 8 caracteres" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <Input label="Confirmar Senha" type="password" placeholder="Repita sua nova senha" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />

            <Alerta>{erro}</Alerta>
            <Aviso>{aviso}</Aviso>

            <div className="pt-2">
              <OrangeBtn type="submit" disabled={enviando}>
                {textoBotao} <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Não recebeu o código?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={handleReenviar}>Reenviar</button>
          </p>
        </div>
      </main>
    </AppShell>
  );
}

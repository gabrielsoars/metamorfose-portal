import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';
import { redefinirSenha } from '../../services/authService.js';
import { AuthField } from './AuthField.jsx';

const SENHA_MIN = 8;

export function RedefinirSenhaScreen({ go, email, onEmailChange }) {
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (loading) return;
    const emailLimpo = email.trim();
    if (!emailLimpo.includes('@')) {
      window.alert('Informe o e-mail da sua conta.');
      return;
    }
    if (!/^\d{6}$/.test(codigo)) {
      window.alert('O código tem 6 dígitos.');
      return;
    }
    if (senha.length < SENHA_MIN) {
      window.alert(`A nova senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      window.alert('A confirmação da senha não confere com a nova senha.');
      return;
    }
    setLoading(true);
    try {
      await redefinirSenha({ email: emailLimpo, codigo, senha });
      go('login', 'Senha redefinida com sucesso. Entre com a nova senha.');
    } catch (error) {
      window.alert(error.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <main className="flex flex-col h-full p-6 sm:p-8 overflow-y-auto">
        <button
          type="button"
          onClick={() => go('recuperar-senha')}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors mt-4 sm:mt-0 mb-6 w-fit"
        >
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </button>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova Senha</h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Digite o código de 6 dígitos enviado ao seu e-mail e escolha uma nova senha.
          </p>

          <div className="space-y-5">
            <AuthField
              label="E-mail"
              type="email"
              placeholder="professor@unesp.br"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
            <AuthField
              label="Código de Verificação"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono font-bold text-gray-700"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            />
            <AuthField
              label="Nova Senha"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <AuthField
              label="Confirmar Senha"
              type="password"
              placeholder="Repita sua nova senha"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />

            <div className="pt-2">
              <OrangeBtn onClick={salvar}>
                {loading ? 'Salvando...' : 'Redefinir Senha'} <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Código expirado ou não chegou?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={() => go('recuperar-senha')}>
              Pedir outro código
            </button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

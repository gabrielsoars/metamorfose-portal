import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';
import { esqueciSenha } from '../../services/authService.js';
import { AuthField } from './AuthField.jsx';

export function RecuperarSenhaScreen({ go, email, onEmailChange }) {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const solicitar = async () => {
    if (loading) return;
    const emailLimpo = email.trim();
    if (!emailLimpo.includes('@')) {
      window.alert('Informe o e-mail da sua conta.');
      return;
    }
    setLoading(true);
    try {
      await esqueciSenha(emailLimpo);
      setEnviado(true);
    } catch (error) {
      window.alert(error.message || 'Não foi possível solicitar a recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <main className="flex flex-col h-full p-6 sm:p-8">
        <button
          type="button"
          onClick={() => go('login')}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors mt-4 sm:mt-0 mb-6 w-fit"
        >
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </button>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Senha</h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Informe o e-mail da sua conta. Vamos enviar um código de 6 dígitos para você criar uma nova senha.
          </p>

          <div className="space-y-5">
            <AuthField
              label="E-mail"
              type="email"
              placeholder="professor@unesp.br"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />

            {enviado && (
              <p role="status" className="text-sm font-medium rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3">
                Se o e-mail existir, enviamos instruções.
              </p>
            )}

            <div className="pt-2">
              {enviado ? (
                <OrangeBtn onClick={() => go('redefinir-senha')}>
                  Já tenho o código <ArrowRight size={20} />
                </OrangeBtn>
              ) : (
                <OrangeBtn onClick={solicitar}>
                  {loading ? 'Enviando...' : 'Enviar código'} <ArrowRight size={20} />
                </OrangeBtn>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Já tem um código?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={() => go('redefinir-senha')}>
              Informar código
            </button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

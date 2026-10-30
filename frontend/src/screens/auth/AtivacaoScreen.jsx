import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn, Input } from '../../components/ui.jsx';
import { reenviarAtivacao } from '../../services/authService.js';
import { AuthField } from './AuthField.jsx';
import { useCooldown } from './useCooldown.js';

const COOLDOWN_REENVIO_SEGUNDOS = 60;

export function AtivacaoScreen({ go, email = '', onEmailChange = () => {} }) {
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState('');
  const [restante, setRestante] = useCooldown();

  const reenviar = async () => {
    if (loading || restante > 0) return;
    const emailLimpo = email.trim();
    if (!emailLimpo.includes('@')) {
      window.alert('Informe o e-mail da sua conta para reenviar o código.');
      return;
    }
    setLoading(true);
    setAviso('');
    try {
      await reenviarAtivacao(emailLimpo);
      setAviso('Se o e-mail estiver pendente de ativação, enviamos um novo código.');
      setRestante(COOLDOWN_REENVIO_SEGUNDOS);
    } catch (error) {
      if (error.status === 429) {
        window.alert('Muitos pedidos de código. Aguarde um minuto e tente novamente.');
        setRestante(COOLDOWN_REENVIO_SEGUNDOS);
      } else {
        window.alert(error.message || 'Não foi possível reenviar o código.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <main className="flex flex-col h-full p-6 sm:p-8 overflow-y-auto">
        <button
          type="button"
          onClick={() => go('login')}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors mt-4 sm:mt-0 mb-6 w-fit"
        >
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </button>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ativar Conta</h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Enviamos um código para o seu e-mail. Insira-o abaixo e crie sua senha definitiva.
          </p>

          <div className="space-y-5">
            <AuthField
              label="E-mail"
              type="email"
              placeholder="professor@unesp.br"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Código de Verificação</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none transition-colors text-center text-2xl tracking-[0.5em] font-mono font-bold text-gray-700"
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <Input label="Nova Senha" type="password" placeholder="Mínimo de 8 caracteres" />
            <Input label="Confirmar Senha" type="password" placeholder="Repita sua nova senha" />

            <div className="pt-2">
              <OrangeBtn onClick={() => go('prof-dashboard')}>
                Ativar e Acessar <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          {aviso && <p role="status" className="text-green-700 text-sm font-medium mb-2">{aviso}</p>}
          <p className="text-gray-600 text-sm font-medium">
            Não recebeu o código?{' '}
            <button
              type="button"
              onClick={reenviar}
              disabled={restante > 0}
              className="font-bold hover:underline disabled:no-underline disabled:cursor-not-allowed"
              style={{ color: restante > 0 ? '#9ca3af' : C.orange }}
            >
              {restante > 0 ? `Reenviar em ${restante}s` : 'Reenviar'}
            </button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn, Input } from '../../components/ui.jsx';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';

export function AtivacaoScreen() {
  const navigate = useNavigate();
  return (
    <MobileShell>
      <main className="flex flex-col h-full p-6 sm:p-8">
        <button
          type="button"
          onClick={() => navigate(rotas.login)}
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
              <OrangeBtn onClick={() => navigate(rotas.painel(), { replace: true })}>
                Ativar e Acessar <ArrowRight size={20} />
              </OrangeBtn>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Não recebeu o código?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }}>Reenviar</button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

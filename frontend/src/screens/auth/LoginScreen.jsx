import { ArrowRight } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn, Input } from '../../components/ui.jsx';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';

export function LoginScreen() {
  const navigate = useNavigate();
  return (
    <MobileShell>
      <main className="flex flex-col h-full p-6 sm:p-8">
        <div className="flex-1 flex flex-col justify-center mt-12 sm:mt-0">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border-2 border-black"
            style={{ background: C.yellow }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 8c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z" />
              <path d="M12 12c2 2 4 2 6 0" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Metamorfose</h1>
          <p className="text-gray-500 mb-8 font-medium">Plataforma de Correção de Simulados</p>

          <div className="space-y-5">
            <Input label="E-mail" type="email" placeholder="professor@unesp.br" />
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-900">Senha</label>
                <button type="button" className="text-sm font-bold transition-colors" style={{ color: C.orange }}>Esqueceu a senha?</button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none transition-colors"
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div className="pt-2 space-y-3">
              <OrangeBtn onClick={() => navigate(rotas.painel(), { replace: true })}>
                Acessar Plataforma <ArrowRight size={20} />
              </OrangeBtn>
              <button
                type="button"
                className="w-full text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                style={{ background: '#1a1a2e' }}
                onClick={() => navigate(rotas.admin, { replace: true })}
              >
                Entrar como Admin <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Primeiro acesso?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={() => navigate(rotas.ativacao)}>
              Ativar conta
            </button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

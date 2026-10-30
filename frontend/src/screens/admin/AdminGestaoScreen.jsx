import { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { C } from '../../data/constants.js';
import { atualizarUsuario } from '../../services/usuariosService.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';

export function AdminGestaoScreen({ professor, onRefresh }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(Boolean(professor?.active ?? true));
  const [nome, setNome] = useState(professor?.name || '');
  const [email, setEmail] = useState(professor?.email || '');
  const [materia, setMateria] = useState(professor?.subject || 'Matemática');
  const [tipo, setTipo] = useState(String(professor?.tipo ?? 1));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!professor) return;
    setActive(Boolean(professor.active));
    setNome(professor.name || '');
    setEmail(professor.email || '');
    setMateria(professor.subject || 'Matemática');
    setTipo(String(professor.tipo ?? 1));
  }, [professor]);

  async function handleSave() {
    if (!professor) return navigate(rotas.admin);

    setSaving(true);
    try {
      await atualizarUsuario(professor.id, {
        nome,
        email,
        materia,
        tipo: Number(tipo),
        ativo: active,
      });

      if (onRefresh) await onRefresh();
      navigate(rotas.admin, { replace: true });
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar o professor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileShell>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30" onClick={() => navigate(rotas.admin)} />

      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.12)]" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Editar Professor</h2>
            <button type="button" onClick={() => navigate(rotas.admin)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Nome Completo</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">E-mail Institucional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Disciplina</label>
              <div className="relative">
                <select value={materia} onChange={(e) => setMateria(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium appearance-none">
                  <option>Matemática</option>
                  <option>Física</option>
                  <option>Biologia</option>
                  <option>História</option>
                  <option>Química</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Tipo de Acesso</label>
              <div className="relative">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium appearance-none">
                  <option value="1">Professor</option>
                  <option value="0">Administrador</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Status da Conta</p>
                <p className="text-xs text-gray-500 mt-0.5">Permite o login na plataforma</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={active} onChange={() => setActive(!active)} />
                <div
                  className="w-11 h-6 rounded-full relative transition-colors"
                  style={{ background: active ? C.orange : '#d1d5db' }}
                >
                  <div
                    className="absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
                    style={{ left: active ? 'calc(100% - 22px)' : '2px' }}
                  />
                </div>
                <span className="ml-3 text-sm font-bold" style={{ color: active ? C.orange : '#9ca3af' }}>
                  {active ? 'Ativo' : 'Inativo'}
                </span>
              </label>
            </div>

            <OrangeBtn onClick={handleSave}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </OrangeBtn>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

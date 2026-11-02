import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { criarUsuario } from '../../services/usuariosService.js';
import { OrangeBtn, Sheet } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';

export function AdminCadastroScreen({ go, onRefresh }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [materia, setMateria] = useState('Matemática');
  const [tipo, setTipo] = useState('1');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      await criarUsuario({
        nome,
        email,
        materia,
        tipo: Number(tipo),
        ativo: true,
      });

      if (onRefresh) await onRefresh();
      go('admin-home');
    } catch (error) {
      window.alert(error.message || 'Não foi possível criar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell variant="admin">
      <Sheet onClose={() => go('admin-home')} labelledBy="admin-cadastro-titulo">
        <div className="px-6 pb-8 pt-2 md:pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 id="admin-cadastro-titulo" className="text-xl font-bold text-gray-900">Novo Cadastro</h2>
            <button type="button" aria-label="Fechar" onClick={() => go('admin-home')} className="w-10 h-10 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Nome Completo</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">E-mail Institucional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@unesp.br" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
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

            <OrangeBtn onClick={handleCreate}>{saving ? 'Criando...' : 'Criar Conta'}</OrangeBtn>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}

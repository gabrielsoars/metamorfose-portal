import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowLeft, X, Plus, Search, Bell, LogOut,
  LayoutDashboard, Users, FileText, User, ChevronRight,
  Camera, Check, Clock, AlertTriangle, Info, ChevronDown,
  TrendingUp, Edit2, RefreshCw, SlidersHorizontal,
  UserPlus, Trash2, Calendar, KeyRound, Save
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const C = {
  orange: "#c45615",
  orangeHover: "#a6470f",
  yellow: "#fbc94e",
  light: "#fff2eb",
};

const FALLBACK_PROFESSORS = [
  { id: 1, name: 'Igor Questionaldo', email: 'igor@unesp.br', subject: 'Matemática', active: true, initial: 'I' },
  { id: 2, name: 'Marina Silva', email: 'marina@unesp.br', subject: 'Biologia', active: true, initial: 'M' },
  { id: 3, name: 'Pedro Alves', email: 'pedro@unesp.br', subject: 'Física', active: false, initial: 'P' },
  { id: 4, name: 'Carla Menezes', email: 'carla@unesp.br', subject: 'História', active: true, initial: 'C' },
];

const FALLBACK_TURMAS = [
  { id: 1, code: 'EXT', name: 'Extensivo Noturno', alunos: 45, empty: false },
  { id: 2, code: 'INT', name: 'Intensivo Sábado', alunos: 28, empty: false },
  { id: 3, code: 'MAT', name: 'Reforço Matemática', alunos: 0, empty: true },
];

const FALLBACK_ALUNOS = [
  { id: 1, name: 'Ana Clara Silva', matricula: '2024001', initial: 'A' },
  { id: 2, name: 'Bruno Costa Santos', matricula: '2024002', initial: 'B' },
  { id: 3, name: 'Carlos Eduardo Ferreira', matricula: '2024003', initial: 'C' },
  { id: 4, name: 'Daniela Oliveira', matricula: '2024004', initial: 'D' },
  { id: 5, name: 'Eduardo Lima', matricula: '2024005', initial: 'E' },
];

export const normalizeUsuario = (usuario) => ({
  id: usuario.id,
  name: usuario.nome || usuario.name || 'Usuário',
  email: usuario.email || '',
  subject: usuario.materia || usuario.subject || 'Sem disciplina',
  active: usuario.ativo !== false,
  initial: (usuario.nome || usuario.name || 'U').charAt(0).toUpperCase(),
  tipo: usuario.tipo ?? 1,
});

export const normalizeTurma = (turma) => {
  const alunos = Number.isFinite(Number(turma.alunos)) ? Number(turma.alunos) : null;

  return {
    id: turma.id,
    code: (turma.nome || turma.name || 'T').split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase() || 'TUR',
    name: turma.nome || turma.name || 'Turma',
    alunos: alunos ?? 0,
    empty: alunos === 0,
    turno: turma.turno || 'Manhã',
    ano: turma.ano || 2026,
  };
};

export const normalizeAluno = (aluno) => ({
  id: aluno.id,
  name: aluno.nome || aluno.name || 'Aluno',
  matricula: String(aluno.matricula || aluno.id || '0000'),
  initial: (aluno.nome || aluno.name || 'A').charAt(0).toUpperCase(),
});

async function requestJson(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers: {
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Endpoint não disponível: ${path}`;
    try {
      const payload = await response.json();
      detail = payload?.detail ? String(payload.detail) : detail;
    } catch (error) {
      detail = detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function MobileShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-0 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md h-screen sm:h-[820px] bg-gray-50 sm:rounded-2xl sm:shadow-2xl flex flex-col relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function OrangeBtn({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${className}`}
      style={{ background: C.orange }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
    >
      {children}
    </button>
  );
}

function Input({ label, type = "text", placeholder, defaultValue, className = "" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${className}`}
        style={{ '--tw-ring-color': C.orange }}
        onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function BottomNav({ active, onNav }) {
  const items = [
    { key: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { key: 'turmas', label: 'Turmas', icon: Users },
    { key: 'simulados', label: 'Simulados', icon: FileText },
    { key: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30">
      <div className="flex justify-between items-center px-2 py-1 h-16">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <Icon size={22} style={{ color: isActive ? C.orange : '#9ca3af' }} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold" style={{ color: isActive ? C.orange : '#6b7280' }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function LoginScreen({ go }) {
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
              <OrangeBtn onClick={() => go('prof-dashboard')}>
                Acessar Plataforma <ArrowRight size={20} />
              </OrangeBtn>
              <button
                type="button"
                className="w-full text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                style={{ background: '#1a1a2e' }}
                onClick={() => go('admin-home')}
              >
                Entrar como Admin <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-4">
          <p className="text-gray-600 text-sm font-medium">
            Primeiro acesso?{' '}
            <button type="button" className="font-bold hover:underline" style={{ color: C.orange }} onClick={() => go('ativacao')}>
              Ativar conta
            </button>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}

function AtivacaoScreen({ go }) {
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
              <OrangeBtn onClick={() => go('prof-dashboard')}>
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

function AdminHomeScreen({ go, professors }) {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = (professors || FALLBACK_PROFESSORS).filter((p) => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === '' || p.subject === subject;
    const matchStatus = statusFilter === 'todos' ? true : statusFilter === 'ativo' ? p.active : !p.active;
    return matchName && matchSubject && matchStatus;
  });

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.orange }}>Painel Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        </div>
        <button
          type="button"
          onClick={() => go('login')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="bg-white px-6 py-4 border-b border-gray-100 z-10 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar professor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border border-transparent outline-none text-sm font-medium focus:bg-white transition-all"
            onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium text-gray-700 appearance-none"
            >
              <option value="">Todas as matérias</option>
              <option value="Matemática">Matemática</option>
              <option value="Física">Física</option>
              <option value="Biologia">Biologia</option>
              <option value="História">História</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium text-gray-700 appearance-none"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-8" style={{ scrollbarWidth: 'none' }}>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum professor encontrado</p>
          </div>
        )}
        {filtered.map((prof) => (
          <button
            key={prof.id}
            type="button"
            onClick={() => go('admin-gestao', prof)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all hover:shadow-md"
            style={{ borderColor: '#f3f4f6', opacity: prof.active ? 1 : 0.65 }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3f4f6')}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm shrink-0"
              style={{ background: prof.active ? C.yellow : '#e5e7eb', color: prof.active ? '#000' : '#6b7280' }}
            >
              {prof.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 leading-tight truncate" style={{ textDecoration: prof.active ? 'none' : 'line-through' }}>
                  {prof.name}
                </h3>
                {!prof.active && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{prof.email}</p>
            </div>
            <ChevronRight size={20} className="text-gray-300 shrink-0" />
          </button>
        ))}
        <div className="h-20" />
      </div>

      <button
        type="button"
        onClick={() => go('admin-cadastro')}
        className="absolute bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>
    </MobileShell>
  );
}

function AdminGestaoScreen({ go, professor, onRefresh }) {
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
    if (!professor) return go('admin-home');

    setSaving(true);
    try {
      await requestJson(`/usuarios/${professor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome,
          email,
          materia,
          tipo: Number(tipo),
          ativo: active,
        }),
      });

      if (onRefresh) await onRefresh();
      go('admin-home');
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar o professor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileShell>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30" onClick={() => go('admin-home')} />

      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.12)]" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Editar Professor</h2>
            <button type="button" onClick={() => go('admin-home')} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
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

function AdminCadastroScreen({ go, onRefresh }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [materia, setMateria] = useState('Matemática');
  const [tipo, setTipo] = useState('1');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      await requestJson('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nome,
          email,
          materia,
          tipo: Number(tipo),
          ativo: true,
        }),
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
    <MobileShell>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30" onClick={() => go('admin-home')} />

      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.12)]" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Novo Cadastro</h2>
            <button type="button" onClick={() => go('admin-home')} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
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
      </div>
    </MobileShell>
  );
}

function ProfDashboardScreen({ go, turmas }) {
  const bars = [
    { month: 'Mar', pct: 45, height: 48 },
    { month: 'Abr', pct: 52, height: 64 },
    { month: 'Mai', pct: 48, height: 52 },
    { month: 'Jun', pct: 68, height: 96, current: true },
  ];

  const critical = [
    { q: 'Questão 12', pct: 82, color: '#ef4444' },
    { q: 'Questão 24', sub: 'Física', pct: 65, color: '#f97316' },
    { q: 'Questão 08', sub: 'Matemática', pct: 58, color: '#f97316' },
  ];

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>
            P
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Visão Geral</p>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Olá, Prof. Pedro</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="relative w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full border border-white" style={{ background: C.orange }} />
          </button>
          <button
            type="button"
            onClick={() => go('login')}
            className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10 space-y-2">
        <div className="flex gap-2">
          {[
            ['Todas as Turmas', 'Extensivo Noturno', 'Intensivo Sábado'],
            ['Último Simulado', '1º Simulado ENEM', 'Prova Diagnóstica']
          ].map((opts, i) => (
            <div key={i} className="relative flex-1">
              <select className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700 appearance-none">
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-24" style={{ scrollbarWidth: 'none' }}>
        <div className="rounded-2xl p-5 text-white shadow-md relative overflow-hidden" style={{ background: C.orange }}>
          <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Média de Acertos</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black leading-none">68%</h2>
            <span className="flex items-center text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md mb-1">
              <TrendingUp size={12} className="mr-1" /> +5%
            </span>
          </div>
          <p className="text-white/70 text-[10px] mt-2 font-medium">Comparado ao simulado anterior</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Atenção: Alto índice de erro</h3>
            <button type="button" className="text-[10px] font-bold uppercase hover:underline" style={{ color: C.orange }}>Ver todas</button>
          </div>
          <div className="space-y-4">
            {critical.map(({ q, sub, pct, color }) => (
              <div key={q}>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-xs font-bold text-gray-800">
                    {q} {sub && <span className="text-[9px] text-gray-400 font-normal ml-1">({sub})</span>}
                  </p>
                  <p className="text-xs font-bold" style={{ color }}>{pct}% erraram</p>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Desempenho por Simulado</h3>
          <div className="h-32 flex items-end gap-3 px-2">
            {bars.map(({ month, pct, height, current }) => (
              <div key={month} className="flex-1 flex flex-col items-center group">
                <span className="text-[10px] font-bold mb-1" style={{ color: current ? C.orange : '#9ca3af' }}>{pct}%</span>
                <div className="w-full rounded-t-md transition-colors" style={{ height, background: current ? C.yellow : '#e5e7eb' }} />
                <p className="text-[9px] font-bold mt-2" style={{ color: current ? C.orange : '#9ca3af' }}>{month}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="dashboard" onNav={(tab) => {
        if (tab === 'turmas') go('prof-turmas');
        else if (tab === 'simulados') go('simulados-lista');
        else if (tab === 'perfil') go('prof-perfil');
      }} />
    </MobileShell>
  );
}

function TurmasScreen({ go, turmas, onRefresh }) {
  const [search, setSearch] = useState('');
  const filtered = (turmas || FALLBACK_TURMAS).filter((t) => (t.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Gestão de Alunos</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Minhas Turmas</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>P</div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar turma por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {filtered.map((turma) => (
          <button
            key={turma.id}
            type="button"
            onClick={() => go('turma-detalhes', turma)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all hover:shadow-md"
            style={{ borderColor: turma.empty ? '#d1d5db' : '#f3f4f6', borderStyle: turma.empty ? 'dashed' : 'solid' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = turma.empty ? '#d1d5db' : '#f3f4f6')}
          >
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center font-bold" style={{ color: C.orange }}>
              <span className="text-sm leading-none">{turma.code}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{turma.name}</h3>
              {turma.empty ? (
                <div className="flex items-center gap-1.5 mt-1" style={{ color: C.orange }}>
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="text-xs font-bold">Adicionar Alunos</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                  <Users size={14} />
                  <span className="text-xs font-semibold">{turma.alunos} Alunos</span>
                </div>
              )}
            </div>
            {!turma.empty && <ChevronRight size={20} className="text-gray-300" />}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go('turma-cadastro')}
        className="absolute bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>

      <BottomNav active="turmas" onNav={(tab) => {
        if (tab === 'dashboard') go('prof-dashboard');
        else if (tab === 'simulados') go('simulados-lista');
        else if (tab === 'perfil') go('prof-perfil');
      }} />
    </MobileShell>
  );
}

function TurmaDetalhesScreen({ go, turma, turmas, onRefresh }) {
  const [search, setSearch] = useState('');
  const [list, setList] = useState(FALLBACK_ALUNOS);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [newAluno, setNewAluno] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!turma || !turma.id) return;

    let isMounted = true;

    fetch(`${API_BASE_URL}/turmas/${turma.id}/alunos`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Endpoint de alunos inexistente');
        }
        return response.json();
      })
      .then((alunos) => {
        if (!isMounted) return;
        setList((Array.isArray(alunos) ? alunos : FALLBACK_ALUNOS).map(normalizeAluno));
      })
      .catch(() => {
        if (isMounted) {
          setList(FALLBACK_ALUNOS);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [turma]);

  const filtered = list.filter((a) => (a.name || '').toLowerCase().includes(search.toLowerCase()));
  const editingAluno = list.find((a) => a.id === editingId) ?? null;

  function openEdit(aluno) {
    setEditingId(aluno.id);
    setEditName(aluno.name);
    setEditMatricula(aluno.matricula);
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await requestJson(`/alunos/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome: editName }),
      });

      setList((l) => l.map((a) => a.id === editingId ? { ...a, name: editName, matricula: editMatricula || a.matricula, initial: editName.charAt(0).toUpperCase() } : a));
      setEditingId(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      window.alert(error.message || 'Não foi possível atualizar o aluno.');
    }
  }

  async function handleAddAluno() {
    if (!turma || !newAluno.trim()) return;
    try {
      const created = await requestJson(`/turmas/${turma.id}/alunos`, {
        method: 'POST',
        body: JSON.stringify({ nome: newAluno.trim() }),
      });

      setList((prev) => [...prev, normalizeAluno(created)]);
      setNewAluno('');
      setShowAddForm(false);
      if (onRefresh) await onRefresh();
    } catch (error) {
      window.alert(error.message || 'Não foi possível adicionar o aluno.');
    }
  }

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('prof-turmas')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{turma?.name || 'Turma'}</h1>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.orange }}>{list.length} Alunos Matriculados</p>
        </div>
        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-8" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          onClick={() => setShowAddForm((value) => !value)}
          className="w-full text-white p-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          style={{ background: C.orange }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
        >
          <UserPlus size={24} />
          <span className="text-sm font-bold">Adicionar Aluno Manualmente</span>
        </button>

        {showAddForm && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Nome do aluno</label>
            <input value={newAluno} onChange={(e) => setNewAluno(e.target.value)} placeholder="Digite o nome do aluno" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
            <OrangeBtn onClick={handleAddAluno}>Salvar aluno</OrangeBtn>
          </div>
        )}

        <hr className="border-gray-200" />

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-sm font-medium"
            onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Ordem Alfabética</p>
          {filtered.map((aluno) => (
            <div key={aluno.id} className="flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">{aluno.initial}</div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight truncate">{aluno.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Matrícula: {aluno.matricula}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => openEdit(aluno)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-50 transition-colors" style={{ color: C.orange }}>
                  <Edit2 size={15} />
                </button>
                <button type="button" onClick={() => setList((l) => l.filter((a) => a.id !== aluno.id))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingAluno && (
        <>
          <div className="absolute inset-0 bg-black/50 z-30" onClick={() => setEditingId(null)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.12)]" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8 pt-2">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Editar Aluno</p>
                  <h2 className="text-xl font-bold text-gray-900">{editingAluno.name}</h2>
                </div>
                <button type="button" onClick={() => setEditingId(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium"
                    onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium"
                    onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <OrangeBtn onClick={saveEdit}>
                  <Save size={18} /> Salvar Alterações
                </OrangeBtn>
              </div>
            </div>
          </div>
        </>
      )}
    </MobileShell>
  );
}

const simuladosList = [
  { id: 1, title: '1º Simulado ENEM - Maio', date: '05 de Maio de 2026', turmas: ['Extensivo', 'Intensivo'], highlight: true },
  { id: 2, title: 'Prova Diagnóstica - Exatas', date: '12 de Março de 2026', turmas: ['Reforço Matemática'], highlight: false },
];

function SimuladosListaScreen({ go }) {
  const [search, setSearch] = useState('');
  const filtered = simuladosList.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Gestão de Provas</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Meus Simulados</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>P</div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar simulado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium"
          />
        </div>
        <button type="button" className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors">
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {filtered.map((sim) => (
          <button
            key={sim.id}
            type="button"
            onClick={() => go('simulado-painel')}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 text-left group transition-all hover:shadow-md"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3f4f6')}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mt-1 shrink-0 border"
              style={{
                background: sim.highlight ? `${C.yellow}33` : '#f9fafb',
                borderColor: sim.highlight ? `${C.yellow}66` : '#f3f4f6',
                color: sim.highlight ? C.orange : '#9ca3af',
              }}
            >
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">{sim.title}</h3>
              <div className="flex items-center gap-1.5 text-gray-500 mb-2.5">
                <Calendar size={12} strokeWidth={2.5} />
                <span className="text-[11px] font-semibold uppercase tracking-wide">{sim.date}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sim.turmas.map((t) => (
                  <span key={t} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">{t}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 self-center group-hover:text-orange-400 transition-colors" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go('simulado-criar')}
        className="absolute bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>

      <BottomNav active="simulados" onNav={(tab) => {
        if (tab === 'dashboard') go('prof-dashboard');
        else if (tab === 'turmas') go('prof-turmas');
        else if (tab === 'perfil') go('prof-perfil');
      }} />
    </MobileShell>
  );
}

function SimuladoCriarScreen({ go }) {
  const [selectedTurmas, setSelectedTurmas] = useState([]);

  const toggleTurma = (val) => setSelectedTurmas((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);

  const turmaOptions = [
    { val: 'extensivo', label: 'Extensivo Noturno', count: 45 },
    { val: 'intensivo', label: 'Intensivo Sábado', count: 28 },
    { val: 'reforco', label: 'Reforço Matemática', count: 0 },
  ];

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('simulados-lista')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Passo 1 de 2</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Novo Simulado</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-36" style={{ scrollbarWidth: 'none' }}>
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black" style={{ background: C.yellow }}>1</span>
            Dados da Prova
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Título do Simulado</label>
            <input
              type="text"
              placeholder="Ex: 1º Simulado ENEM"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-800 font-medium"
              onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Data de Aplicação</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-800 font-medium appearance-none"
              onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </section>

        <hr className="border-gray-200" />

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black" style={{ background: C.yellow }}>2</span>
              Turmas Participantes
            </h2>
            <p className="text-xs text-gray-500 mt-2">Selecione quais turmas realizaram esta prova.</p>
          </div>
          <div className="space-y-3">
            {turmaOptions.map(({ val, label, count }) => {
              const checked = selectedTurmas.includes(val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleTurma(val)}
                  className="w-full p-4 rounded-xl flex items-center justify-between transition-all border-2"
                  style={{ background: checked ? C.light : '#fff', borderColor: checked ? C.orange : '#f3f4f6' }}
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">{label}</h3>
                    <p className="text-xs mt-0.5" style={{ color: count > 0 ? '#6b7280' : '#9ca3af' }}>
                      {count > 0 ? `${count} alunos` : 'Turma vazia'}
                    </p>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: checked ? C.orange : '#d1d5db', background: checked ? C.orange : 'transparent' }}
                  >
                    {checked && <Check size={14} color="#fff" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <p className="text-xs text-center text-gray-500 mb-3 font-medium">Próxima etapa: Escanear o gabarito oficial</p>
        <OrangeBtn onClick={() => go('simulado-gabarito')}>
          <Camera size={22} /> Abrir Câmera e Continuar
        </OrangeBtn>
      </div>
    </MobileShell>
  );
}

const alunos = [
  { id: 1, name: 'Ana Clara Silva', corrected: true, nota: '32/40' },
  { id: 2, name: 'Bruno Costa Santos', corrected: false },
  { id: 3, name: 'Carlos Eduardo Ferreira', corrected: false },
  { id: 4, name: 'Daniela Oliveira', corrected: false },
  { id: 5, name: 'Eduardo Lima', corrected: false },
];

function SimuladoPainelScreen({ go }) {
  const [search, setSearch] = useState('');
  const filtered = alunos.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const corrected = alunos.filter((a) => a.corrected).length;
  const pct = Math.round((corrected / alunos.length) * 100);

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('prof-dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Extensivo Noturno</p>
          <h1 className="text-base font-bold text-gray-900 leading-tight truncate">1º Simulado ENEM</h1>
        </div>
        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>
      </header>

      <div className="bg-white px-6 py-4 border-b border-gray-100 z-10 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Progresso da Turma</h2>
            <p className="text-xs text-gray-500 mt-0.5">{corrected} de {alunos.length} provas corrigidas</p>
          </div>
          <span className="text-sm font-bold" style={{ color: C.orange }}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: C.orange }} />
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-8" style={{ scrollbarWidth: 'none' }}>
        {filtered.map((aluno) => (
          <div key={aluno.id} className="bg-white p-4 rounded-2xl border shadow-sm relative overflow-hidden" style={{ borderColor: aluno.corrected ? '#d1fae5' : '#e5e7eb' }}>
            {aluno.corrected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />}
            <div className="flex items-center justify-between" style={{ marginLeft: aluno.corrected ? 8 : 0 }}>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">{aluno.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {aluno.corrected ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        <Check size={10} strokeWidth={3} /> Corrigido
                      </span>
                      <span className="text-xs font-bold text-gray-500">Nota: <span className="text-emerald-600">{aluno.nota}</span></span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <Clock size={10} strokeWidth={3} /> Pendente
                    </span>
                  )}
                </div>
              </div>
              {aluno.corrected ? (
                <button type="button" className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all">
                  <Edit2 size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go('escaneamento')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs shadow-sm active:scale-95 transition-all hover:text-white"
                  style={{ background: C.light, color: C.orange, borderColor: `${C.orange}33` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.orange; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.light; e.currentTarget.style.color = C.orange; }}
                >
                  <Camera size={16} /> Escanear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

function EscaneamentoScreen({ go }) {
  const [answers, setAnswers] = useState({ aq1: 'A', aq2: 'B' });

  const questions = [
    { key: 'aq1', num: '01', warn: 'Atenção: Em branco ou rasura' },
    { key: 'aq2', num: '02' },
    { key: 'aq3', num: '03', alert: true },
  ];

  const score = 35;

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('simulado-painel')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Aluno em Correção</p>
          <h1 className="text-base font-bold text-gray-900 truncate">Bruno Costa Santos</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="bg-gray-900 w-full h-48 relative flex items-center justify-center overflow-hidden shrink-0">
        <div className="w-2/3 h-[120%] bg-white rounded-md shadow-2xl opacity-80 flex flex-col items-center pt-4 transform rotate-2">
          <div className="w-1/2 h-1 bg-gray-300 mb-2 rounded" />
          <div className="w-2/3 h-1 bg-gray-300 mb-6 rounded" />
          <div className="grid grid-cols-5 gap-1 w-3/4">
            {[1, 0, 0, 0, 0, 0, 1, 0, 0, 0].map((filled, i) => (
              <div key={i} className="w-2 h-2 rounded-full border border-gray-400" style={{ background: filled ? '#1f2937' : 'transparent', marginTop: i >= 5 ? 4 : 0 }} />
            ))}
          </div>
        </div>
        <button type="button" className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-white/30 transition-colors">
          <RefreshCw size={14} /> Refazer Foto
        </button>
      </div>

      <div className="bg-yellow-50 px-6 py-2.5 border-b border-yellow-100 flex items-center gap-2 shrink-0">
        <AlertTriangle size={16} className="text-yellow-600" />
        <p className="text-xs text-yellow-700 font-semibold">Revise as alternativas lidas pelo sistema.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-32" style={{ scrollbarWidth: 'none' }}>
        {questions.map(({ key, num, alert }) => (
          <div key={key}>
            <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm relative" style={{ background: alert ? '#fef2f2' : '#fff', borderColor: alert ? '#fecaca' : '#f3f4f6' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: alert ? '#fee2e2' : '#f9fafb', color: alert ? '#b91c1c' : '#374151' }}>
                {num}
              </div>
              <div className="flex gap-1.5">
                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                  <label key={opt} className="cursor-pointer">
                    <input
                      type="radio"
                      name={key}
                      value={opt}
                      className="sr-only"
                      checked={answers[key] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [key]: opt }))}
                    />
                    <div
                      className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: answers[key] === opt ? '#1f2937' : '#fff',
                        borderColor: answers[key] === opt ? '#1f2937' : alert ? '#fecaca' : '#e5e7eb',
                        color: answers[key] === opt ? '#fff' : '#6b7280',
                      }}
                    >
                      {opt}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {alert && <p className="text-[10px] font-bold text-red-500 mt-1 ml-2 uppercase tracking-wider">Atenção: Em branco ou rasura</p>}
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500">Nota Calculada:</p>
          <p className="text-lg font-black text-emerald-600">{score} / 40 <span className="text-xs font-bold text-emerald-600/70 ml-1">acertos</span></p>
        </div>
        <OrangeBtn onClick={() => go('simulado-gabarito')}>
          Confirmar e Salvar <Check size={20} />
        </OrangeBtn>
      </div>
    </MobileShell>
  );
}

function GabaritoScreen({ go }) {
  const [answers, setAnswers] = useState({ q1: 'A', q2: 'C', q3: 'NULA', q4: 'E' });

  const questions = [
    { key: 'q1', num: '01' },
    { key: 'q2', num: '02' },
    { key: 'q3', num: '03', nulled: true },
    { key: 'q4', num: '04' },
  ];

  const nulledCount = Object.values(answers).filter((v) => v === 'NULA').length;

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('simulado-painel')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Leitura Concluída</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Revisar Gabarito</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="px-6 py-3 border-b border-orange-100 flex items-start gap-3" style={{ background: C.light }}>
        <Info size={20} className="shrink-0 mt-0.5" style={{ color: C.orange }} />
        <p className="text-xs font-medium leading-relaxed" style={{ color: C.orange }}>
          As alternativas abaixo foram identificadas pela câmera. Altere caso o sistema tenha lido alguma resposta incorretamente.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32" style={{ scrollbarWidth: 'none' }}>
        <div className="flex justify-between items-center mb-2 px-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questão</p>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Alternativas</span>
            <span className="text-[10px] font-bold text-red-400 uppercase ml-2">Anular</span>
          </div>
        </div>

        {questions.map(({ key, num }) => {
          const isNulled = answers[key] === 'NULA';
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl border shadow-sm" style={{ background: isNulled ? '#fef2f2' : '#fff', borderColor: isNulled ? '#fecaca' : '#f3f4f6' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: isNulled ? '#fee2e2' : '#f3f4f6', color: isNulled ? '#b91c1c' : '#374151' }}>
                {num}
              </div>
              <div className="flex gap-1.5">
                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                  <label key={opt} className="cursor-pointer">
                    <input type="radio" name={key} value={opt} className="sr-only" checked={answers[key] === opt} onChange={() => setAnswers((p) => ({ ...p, [key]: opt }))} />
                    <div
                      className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: answers[key] === opt ? C.orange : '#fff',
                        borderColor: answers[key] === opt ? C.orange : '#e5e7eb',
                        color: answers[key] === opt ? '#fff' : '#6b7280',
                      }}
                    >
                      {opt}
                    </div>
                  </label>
                ))}
                <div className="w-px h-6 bg-gray-200 self-center mx-0.5" />
                <label className="cursor-pointer">
                  <input type="radio" name={key} value="NULA" className="sr-only" checked={answers[key] === 'NULA'} onChange={() => setAnswers((p) => ({ ...p, [key]: 'NULA' }))} />
                  <div
                    className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: answers[key] === 'NULA' ? '#ef4444' : '#fff',
                      borderColor: answers[key] === 'NULA' ? '#ef4444' : '#e5e7eb',
                      color: answers[key] === 'NULA' ? '#fff' : '#f87171',
                    }}
                  >
                    N
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500">Total processado: <span className="text-gray-900">40 questões</span></p>
          {nulledCount > 0 && <p className="text-xs font-bold text-red-500">{nulledCount} Anulada{nulledCount > 1 ? 's' : ''}</p>}
        </div>
        <OrangeBtn onClick={() => go('simulado-painel')}>
          Salvar Gabarito Oficial <Check size={20} />
        </OrangeBtn>
      </div>
    </MobileShell>
  );
}

function TurmaCadastroScreen({ go }) {
  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('prof-turmas')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Cadastro</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Nova Turma</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 p-6 space-y-6">
        <div className="rounded-xl p-4 flex gap-3 border" style={{ background: `${C.yellow}33`, borderColor: `${C.yellow}88` }}>
          <Info size={20} className="shrink-0" style={{ color: C.orange }} />
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Crie a turma primeiro. Você poderá adicionar a lista de alunos (CSV ou manual) na próxima tela.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Nome de Identificação</label>
          <input
            type="text"
            placeholder="Ex: Extensivo Noturno - 2026"
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none text-gray-800 font-medium"
            onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <OrangeBtn onClick={() => go('prof-turmas')}>Salvar Turma</OrangeBtn>
      </div>
    </MobileShell>
  );
}

function ProfPerfilScreen({ go }) {
  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-6 px-6 shadow-sm z-20 flex flex-col items-center justify-center border-b border-gray-100">
        <div className="w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-black font-black text-2xl mb-3" style={{ background: C.yellow }}>
          P
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-none">Prof. Pedro</h1>
        <p className="text-xs font-medium text-gray-500 mt-1">pedro@unesp.br</p>
        <span className="mt-2 inline-block px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
          Professor • Matemática
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28" style={{ scrollbarWidth: 'none' }}>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Configurações da Conta</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <KeyRound size={16} />
                </div>
                <span className="text-sm font-bold text-gray-700">Alterar Senha</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button type="button" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <Info size={16} />
                </div>
                <span className="text-sm font-bold text-gray-700">Suporte e Ajuda</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <button type="button" onClick={() => go('login')} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 active:scale-[0.98] transition-all">
          <LogOut size={20} /> Sair da Conta
        </button>
      </div>

      <BottomNav active="perfil" onNav={(tab) => {
        if (tab === 'dashboard') go('prof-dashboard');
        else if (tab === 'turmas') go('prof-turmas');
        else if (tab === 'simulados') go('simulados-lista');
      }} />
    </MobileShell>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [usuarios, setUsuarios] = useState(FALLBACK_PROFESSORS);
  const [turmas, setTurmas] = useState(FALLBACK_TURMAS);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [selectedTurma, setSelectedTurma] = useState(null);

  const loadData = async () => {
    try {
      const [usuariosResponse, turmasResponse] = await Promise.all([
        requestJson('/usuarios').catch(() => FALLBACK_PROFESSORS),
        requestJson('/turmas').catch(() => FALLBACK_TURMAS),
      ]);

      setUsuarios((Array.isArray(usuariosResponse) ? usuariosResponse : FALLBACK_PROFESSORS).map(normalizeUsuario));
      setTurmas((Array.isArray(turmasResponse) ? turmasResponse : FALLBACK_TURMAS).map(normalizeTurma));
    } catch {
      setUsuarios(FALLBACK_PROFESSORS);
      setTurmas(FALLBACK_TURMAS);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const go = (s, payload = null) => {
    setSelectedProfessor(s === 'admin-gestao' ? payload : null);
    setSelectedTurma(s === 'turma-detalhes' ? payload : null);
    setScreen(s);
  };

  switch (screen) {
    case 'login':
      return <LoginScreen go={go} />;
    case 'ativacao':
      return <AtivacaoScreen go={go} />;
    case 'admin-home':
      return <AdminHomeScreen go={go} professors={usuarios} onRefresh={loadData} />;
    case 'admin-gestao':
      return <AdminGestaoScreen go={go} professor={selectedProfessor} onRefresh={loadData} />;
    case 'admin-cadastro':
      return <AdminCadastroScreen go={go} onRefresh={loadData} />;
    case 'prof-dashboard':
      return <ProfDashboardScreen go={go} turmas={turmas} />;
    case 'prof-turmas':
      return <TurmasScreen go={go} turmas={turmas} onRefresh={loadData} />;
    case 'turma-detalhes':
      return <TurmaDetalhesScreen go={go} turma={selectedTurma} turmas={turmas} onRefresh={loadData} />;
    case 'turma-cadastro':
      return <TurmaCadastroScreen go={go} onRefresh={loadData} />;
    case 'simulados-lista':
      return <SimuladosListaScreen go={go} />;
    case 'simulado-criar':
      return <SimuladoCriarScreen go={go} />;
    case 'simulado-painel':
      return <SimuladoPainelScreen go={go} />;
    case 'escaneamento':
      return <EscaneamentoScreen go={go} />;
    case 'simulado-gabarito':
      return <GabaritoScreen go={go} />;
    case 'prof-perfil':
      return <ProfPerfilScreen go={go} />;
    default:
      return <LoginScreen go={go} />;
  }
}

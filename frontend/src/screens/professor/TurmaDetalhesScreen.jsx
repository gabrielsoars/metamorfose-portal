import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Search, Edit2, UserPlus, Trash2, Save } from 'lucide-react';
import { C, FALLBACK_ALUNOS } from '../../data/constants.js';
import { atualizarAluno, criarAluno, excluirAluno, listarAlunosDaTurma, normalizeAluno } from '../../services/alunosService.js';
import { excluirTurma } from '../../services/turmasService.js';
import { OrangeBtn, Sheet } from '../../components/ui.jsx';
import { useEscape } from '../../components/hooks.js';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER, HEADER_TOP } from '../../components/layout.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

// Colunas da tabela de alunos no desktop (avatar, nome, matrícula, ações).
const COLUNAS = 'lg:grid-cols-[2.5rem_minmax(0,1fr)_10rem_6rem]';

export function TurmaDetalhesScreen({ go, turma, turmas, onRefresh }) {
  const [search, setSearch] = useState('');
  const [list, setList] = useState(FALLBACK_ALUNOS);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newAluno, setNewAluno] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  // Exclusão pendente de confirmação: { tipo: 'turma' } ou { tipo: 'aluno', aluno }.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const menuBtn = useRef(null);

  // Esc fecha o menu ⋮ e devolve o foco ao botão.
  useEscape(() => {
    setMenuOpen(false);
    menuBtn.current?.focus();
  }, menuOpen);

  useEffect(() => {
    if (!turma || !turma.id) return;

    let isMounted = true;

    listarAlunosDaTurma(turma.id)
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
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await atualizarAluno(editingId, { nome: editName });

      setList((l) => l.map((a) => a.id === editingId ? { ...a, name: editName, initial: editName.charAt(0).toUpperCase() } : a));
      setEditingId(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      window.alert(error.message || 'Não foi possível atualizar o aluno.');
    }
  }

  async function handleAddAluno() {
    if (!turma || !newAluno.trim()) return;
    try {
      const created = await criarAluno(turma.id, { nome: newAluno.trim() });

      setList((prev) => [...prev, normalizeAluno(created)]);
      setNewAluno('');
      setShowAddForm(false);
      if (onRefresh) await onRefresh();
    } catch (error) {
      window.alert(error.message || 'Não foi possível adicionar o aluno.');
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !turma) return;
    setDeleting(true);
    try {
      if (pendingDelete.tipo === 'turma') {
        await excluirTurma(turma.id);
        if (onRefresh) await onRefresh();
        go('prof-turmas');
        return;
      }
      await excluirAluno(pendingDelete.aluno.id);
      setList((l) => l.filter((a) => a.id !== pendingDelete.aluno.id));
      setPendingDelete(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      setPendingDelete(null);
      window.alert(error.message || (pendingDelete.tipo === 'turma' ? 'Não foi possível excluir a turma.' : 'Não foi possível excluir o aluno.'));
    } finally {
      setDeleting(false);
    }
  }

  const confirmCopy = pendingDelete?.tipo === 'turma'
    ? {
      title: 'Excluir turma',
      message: `Excluir a turma ${turma?.name}? Isso apaga ${list.length === 1 ? '1 aluno' : `${list.length} alunos`} e as respostas deles, e não pode ser desfeito.`,
    }
    : {
      title: 'Excluir aluno',
      message: `Excluir o aluno ${pendingDelete?.aluno?.name}? Isso apaga também as respostas dele em todos os simulados e não pode ser desfeito.`,
    };

  // Itens do menu ⋮ do cabeçalho. Novas ações entram aqui.
  const menuItems = [
    { key: 'editar', label: 'Editar turma', icon: Edit2, onClick: () => go('turma-editar', turma) },
    { key: 'excluir', label: 'Excluir turma', icon: Trash2, danger: true, onClick: () => setPendingDelete({ tipo: 'turma' }) },
  ];

  return (
    <AppShell go={go} active="turmas" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 ${GUTTER} shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => go('prof-turmas')} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{turma?.name || 'Turma'}</h1>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.orange }}>{list.length} Alunos Matriculados</p>
        </div>
        {/* Menu ⋮ ancorado no botão (popover), em qualquer largura. */}
        <div className="relative">
        <button ref={menuBtn} type="button" aria-label="Mais opções" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div role="menu" className="absolute right-0 top-12 z-40 min-w-[11rem] bg-white rounded-xl border border-gray-100 shadow-lg py-1">
            {menuItems.map(({ key, label, icon: Icon, danger, onClick }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onClick(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-gray-50 text-left ${danger ? 'text-red-600' : 'text-gray-800'}`}
              >
                <Icon size={16} style={danger ? undefined : { color: C.orange }} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
        </div>
      </header>

      <div className={`flex-1 overflow-y-auto p-6 space-y-5 pb-8 ${GUTTER}`} style={{ scrollbarWidth: 'none' }}>
        {/* Celular: botão, formulário, busca (empilhados). Desktop: busca e botão na mesma linha, formulário abaixo. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <button
          type="button"
          onClick={() => setShowAddForm((value) => !value)}
          className="w-full text-white p-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all lg:order-2 lg:w-auto lg:px-5 lg:py-2.5 lg:rounded-xl"
          style={{ background: C.orange }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
        >
          <UserPlus size={24} />
          <span className="text-sm font-bold">Adicionar Aluno Manualmente</span>
        </button>

        {showAddForm && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3 lg:order-3 lg:basis-full">
            <label className="block text-sm font-semibold text-gray-900">Nome do aluno</label>
            <input value={newAluno} onChange={(e) => setNewAluno(e.target.value)} placeholder="Digite o nome do aluno" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium" />
            <OrangeBtn onClick={handleAddAluno}>Salvar aluno</OrangeBtn>
          </div>
        )}

        <hr className="border-gray-200 lg:hidden" />

        <div className="relative lg:order-1 lg:flex-1">
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
        </div>

        <div className="space-y-3 lg:space-y-0 lg:bg-white lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm lg:overflow-hidden lg:divide-y lg:divide-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 lg:hidden">Ordem Alfabética</p>
          <div className={`hidden lg:grid ${COLUNAS} gap-3 items-center px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400`}>
            <span />
            <span>Aluno (ordem alfabética)</span>
            <span>Matrícula</span>
            <span className="text-right">Ações</span>
          </div>
          {filtered.map((aluno) => (
            <div key={aluno.id} className={`flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm lg:grid ${COLUNAS} lg:gap-3 lg:px-5 lg:py-2.5 lg:rounded-none lg:border-0 lg:shadow-none lg:hover:bg-gray-50`}>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">{aluno.initial}</div>
              <div className="ml-3 flex-1 min-w-0 lg:contents">
                <p className="text-sm font-bold text-gray-900 leading-tight truncate">{aluno.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 lg:mt-0 lg:text-sm"><span className="lg:hidden">Matrícula: </span>{aluno.matricula}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 lg:justify-end">
                <button type="button" onClick={() => openEdit(aluno)} aria-label={`Editar aluno ${aluno.name}`} className="w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-orange-50 transition-colors" style={{ color: C.orange }}>
                  <Edit2 size={15} />
                </button>
                <button type="button" aria-label={`Excluir aluno ${aluno.name}`} onClick={() => setPendingDelete({ tipo: 'aluno', aluno })} className="w-11 h-11 md:w-9 md:h-9 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={confirmCopy.title}
          message={confirmCopy.message}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {editingAluno && (
        <Sheet onClose={() => setEditingId(null)} labelledBy="editar-aluno-titulo">
            <div className="px-6 pb-8 pt-2 md:pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Editar Aluno</p>
                  <h2 id="editar-aluno-titulo" className="text-xl font-bold text-gray-900">{editingAluno.name}</h2>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setEditingId(null)} className="w-10 h-10 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
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
                  {/* A API não guarda matrícula: o valor exibido é o id do aluno, então o campo é só leitura. */}
                  <input
                    type="text"
                    value={editingAluno.matricula}
                    readOnly
                    aria-readonly="true"
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 outline-none text-gray-500 font-medium cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Gerada pelo sistema, não pode ser alterada.</p>
                </div>
                <OrangeBtn onClick={saveEdit}>
                  <Save size={18} /> Salvar Alterações
                </OrangeBtn>
              </div>
            </div>
        </Sheet>
      )}
    </AppShell>
  );
}

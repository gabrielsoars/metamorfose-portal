import { useState } from 'react';
import { ArrowLeft, Info, ChevronDown } from 'lucide-react';
import { C } from '../../data/constants.js';
import { atualizarTurma, criarTurma, normalizeTurma } from '../../services/turmasService.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';

const inputClass = 'w-full px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none text-gray-800 font-medium';
const onFocus = (e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; };
const onBlur = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

// Sem `turma` cadastra uma turma nova; com `turma` edita a turma existente.
export function TurmaCadastroScreen({ go, turma, onRefresh }) {
  const editando = Boolean(turma);
  const [nome, setNome] = useState(turma?.name ?? '');
  const [ano, setAno] = useState(String(turma?.ano ?? '2026'));
  const [turno, setTurno] = useState(turma?.turno ?? 'Manhã');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    if (!nome.trim() || !Number(ano)) {
      window.alert('Preencha o nome e o ano da turma.');
      return;
    }

    setSaving(true);
    try {
      const dados = { nome: nome.trim(), ano: Number(ano), turno };
      if (editando) {
        const atualizada = await atualizarTurma(turma.id, dados);
        if (onRefresh) await onRefresh();
        // A resposta do PATCH não traz a contagem de alunos: mantém a que a turma já tinha.
        go('turma-detalhes', { ...normalizeTurma(atualizada), alunos: turma.alunos, empty: turma.empty });
      } else {
        const criada = await criarTurma(dados);
        if (onRefresh) await onRefresh();
        go('turma-detalhes', normalizeTurma(criada));
      }
    } catch (error) {
      window.alert(error.message || (editando ? 'Não foi possível atualizar a turma.' : 'Não foi possível criar a turma.'));
      setSaving(false);
    }
  }

  return (
    <AppShell go={go} active="turmas" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 ${GUTTER_FORM} shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => (editando ? go('turma-detalhes', turma) : go('prof-turmas'))} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>{editando ? 'Edição' : 'Cadastro'}</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{editando ? 'Editar Turma' : 'Nova Turma'}</h1>
        </div>
        <div className="w-11 h-11 md:w-10 md:h-10" />
      </header>

      <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${GUTTER_FORM}`}>
        {!editando && (
          <div className="rounded-xl p-4 flex gap-3 border" style={{ background: `${C.yellow}33`, borderColor: `${C.yellow}88` }}>
            <Info size={20} className="shrink-0" style={{ color: C.orange }} />
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              Crie a turma primeiro. Você poderá adicionar a lista de alunos (CSV ou manual) na próxima tela.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Nome de Identificação</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Extensivo Noturno - 2026"
            className={inputClass}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-900 mb-1">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className={inputClass}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-900 mb-1">Turno</label>
            <div className="relative">
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className={`${inputClass} appearance-none`}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option>Manhã</option>
                <option>Tarde</option>
                <option>Noite</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <OrangeBtn onClick={handleSave}>{saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Salvar Turma'}</OrangeBtn>
      </div>
    </AppShell>
  );
}

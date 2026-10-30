import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { atualizarSimulado, obterGabarito } from '../../services/simuladosService.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';

const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-800 font-medium';
const onFocus = (e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; };
const onBlur = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

export function SimuladoEditarScreen({ go, simulado, turmas = [] }) {
  const [titulo, setTitulo] = useState(simulado.titulo);
  const [data, setData] = useState(simulado.data_aplicacao || '');
  const [totalQuestoes, setTotalQuestoes] = useState(String(simulado.total_questoes));
  const [selectedTurmas, setSelectedTurmas] = useState(() => simulado.turmas.map((t) => t.id));
  const [saving, setSaving] = useState(false);

  const toggleTurma = (id) => setSelectedTurmas((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  // Ao reduzir, as questões acima do novo total deixam de valer. Pede confirmação se alguma delas já tem gabarito.
  async function confirmarReducao(novoTotal) {
    if (novoTotal >= simulado.total_questoes) return true;
    let comGabarito = null;
    try {
      const itens = await obterGabarito(simulado.id);
      comGabarito = (Array.isArray(itens) ? itens : []).filter((g) => g.num_questao > novoTotal).length;
    } catch {
      // Sem conseguir consultar o gabarito, pede confirmação do mesmo jeito.
    }
    if (comGabarito === 0) return true;
    const detalhe = comGabarito === null
      ? 'Se alguma delas já tiver gabarito ou correções, será ignorada.'
      : `${comGabarito} delas já têm gabarito cadastrado e serão ignoradas.`;
    return window.confirm(
      `Reduzir de ${simulado.total_questoes} para ${novoTotal} questões? As questões acima de ${novoTotal} deixam de valer. ${detalhe}`,
    );
  }

  async function handleSave() {
    if (saving) return;
    const novoTotal = Number(totalQuestoes);
    if (!titulo.trim() || !data || !Number.isInteger(novoTotal) || novoTotal < 1) {
      window.alert('Preencha o título, a data e o número de questões.');
      return;
    }

    setSaving(true);
    try {
      if (!(await confirmarReducao(novoTotal))) {
        setSaving(false);
        return;
      }
      const atualizado = await atualizarSimulado(simulado.id, {
        titulo: titulo.trim(),
        data_aplicacao: data,
        total_questoes: novoTotal,
        turmas_ids: selectedTurmas,
      });
      go('simulado-painel', atualizado);
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar o simulado.');
      setSaving(false);
    }
  }

  return (
    <AppShell go={go} active="simulados" mobileNav={false}>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" aria-label="Voltar" onClick={() => go('simulado-painel')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate" style={{ color: C.orange }}>{simulado.titulo}</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Editar Simulado</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-36" style={{ scrollbarWidth: 'none' }}>
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Dados da Prova</h2>
          <div>
            <label htmlFor="simulado-titulo" className="block text-sm font-semibold text-gray-900 mb-1">Título do Simulado</label>
            <input
              id="simulado-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClass}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="simulado-data" className="block text-sm font-semibold text-gray-900 mb-1">Data de Aplicação</label>
              <input
                id="simulado-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={`${inputClass} appearance-none`}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="w-28">
              <label htmlFor="simulado-questoes" className="block text-sm font-semibold text-gray-900 mb-1">Questões</label>
              <input
                id="simulado-questoes"
                type="number"
                min="1"
                value={totalQuestoes}
                onChange={(e) => setTotalQuestoes(e.target.value)}
                className={inputClass}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">Questões novas ficam sem gabarito até você cadastrá-lo.</p>
        </section>

        <hr className="border-gray-200" />

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Turmas Participantes</h2>
            <p className="text-xs text-gray-500 mt-2">Selecione quais turmas realizaram esta prova.</p>
          </div>
          <div className="space-y-3">
            {turmas.length === 0 && (
              <p className="text-sm text-gray-400 font-medium">Nenhuma turma cadastrada.</p>
            )}
            {turmas.map((turma) => {
              const checked = selectedTurmas.includes(turma.id);
              return (
                <button
                  key={turma.id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleTurma(turma.id)}
                  className="w-full p-4 rounded-xl flex items-center justify-between transition-all border-2"
                  style={{ background: checked ? C.light : '#fff', borderColor: checked ? C.orange : '#f3f4f6' }}
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">{turma.name}</h3>
                    <p className="text-xs mt-0.5 text-gray-500">{turma.turno} · {turma.ano}</p>
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
        <OrangeBtn onClick={handleSave}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </OrangeBtn>
      </div>
    </AppShell>
  );
}

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { criarSimulado } from '../../services/simuladosService.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';

const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-800 font-medium';
const onFocus = (e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 2px ${C.orange}33`; };
const onBlur = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

export function SimuladoCriarScreen({ go, turmas = [] }) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [totalQuestoes, setTotalQuestoes] = useState('10');
  const [selectedTurmas, setSelectedTurmas] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleTurma = (id) => setSelectedTurmas((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  async function handleSave() {
    if (saving) return;
    if (!titulo.trim() || !data || !(Number(totalQuestoes) >= 1)) {
      window.alert('Preencha o título, a data e o número de questões.');
      return;
    }

    setSaving(true);
    try {
      const criado = await criarSimulado({
        titulo: titulo.trim(),
        data_aplicacao: data,
        total_questoes: Number(totalQuestoes),
        turmas_ids: selectedTurmas,
      });
      go('simulado-gabarito', criado);
    } catch (error) {
      window.alert(error.message || 'Não foi possível criar o simulado.');
      setSaving(false);
    }
  }

  return (
    <AppShell go={go} active="simulados" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 ${GUTTER_FORM} shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => go('simulados-lista')} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Passo 1 de 2</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Novo Simulado</h1>
        </div>
        <div className="w-11 h-11 md:w-10 md:h-10" />
      </header>

      <div className={`flex-1 overflow-y-auto p-6 space-y-8 pb-36 ${GUTTER_FORM}`} style={{ scrollbarWidth: 'none' }}>
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black" style={{ background: C.yellow }}>1</span>
            Dados da Prova
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Título do Simulado</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 1º Simulado ENEM"
              className={inputClass}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Data de Aplicação</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={`${inputClass} appearance-none`}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Questões</label>
              <input
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
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
            {turmas.length === 0 && (
              <p className="text-sm text-gray-400 font-medium">Nenhuma turma cadastrada.</p>
            )}
            {turmas.map((turma) => {
              const checked = selectedTurmas.includes(turma.id);
              return (
                <button
                  key={turma.id}
                  type="button"
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

      <div className={`absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 ${GUTTER_FORM} shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30`}>
        <p className="text-xs text-center text-gray-500 mb-3 font-medium">Próxima etapa: cadastrar o gabarito oficial</p>
        <OrangeBtn onClick={handleSave}>
          {saving ? 'Salvando...' : <>Salvar e Continuar <ArrowRight size={20} /></>}
        </OrangeBtn>
      </div>
    </AppShell>
  );
}

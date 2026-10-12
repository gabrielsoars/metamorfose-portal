import { useState } from 'react';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

export function SimuladoCriarScreen({ go }) {
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

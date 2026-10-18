import { useState } from 'react';
import { X, Info, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

export function GabaritoScreen({ go }) {
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

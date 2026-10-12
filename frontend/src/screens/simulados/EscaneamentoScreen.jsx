import { useState } from 'react';
import { X, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { C } from '../../data/constants.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

export function EscaneamentoScreen({ go }) {
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

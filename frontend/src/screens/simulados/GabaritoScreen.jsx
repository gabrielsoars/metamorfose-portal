import { useEffect, useState } from 'react';
import { X, Info, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterGabarito, salvarGabarito } from '../../services/simuladosService.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

export function GabaritoScreen({ go, simulado }) {
  // Respostas marcadas, indexadas pelo número da questão: { 1: 'A', 2: 'C' }
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const simuladoId = simulado?.id;

  useEffect(() => {
    if (!simuladoId) return undefined;
    let isMounted = true;

    obterGabarito(simuladoId)
      .then((itens) => {
        if (!isMounted) return;
        const salvas = {};
        (Array.isArray(itens) ? itens : []).forEach((item) => {
          salvas[item.num_questao] = item.alt_correta;
        });
        setAnswers(salvas);
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar o gabarito.');
      });

    return () => {
      isMounted = false;
    };
  }, [simuladoId]);

  if (!simulado) {
    return (
      <MobileShell>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
          <p className="text-sm font-medium text-gray-500">Nenhum simulado selecionado.</p>
          <OrangeBtn onClick={() => go('simulados-lista')}>Voltar para os simulados</OrangeBtn>
        </div>
      </MobileShell>
    );
  }

  const numeros = Array.from({ length: simulado.total_questoes }, (_, i) => i + 1);

  const handleSave = async () => {
    if (saving) return;
    const itens = Object.entries(answers).map(([num, alt]) => ({ num_questao: Number(num), alt_correta: alt }));
    if (itens.length === 0) {
      window.alert('Marque a alternativa correta de pelo menos uma questão.');
      return;
    }

    setSaving(true);
    try {
      await salvarGabarito(simulado.id, itens);
      go('simulado-painel');
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar o gabarito.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('simulado-painel')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Gabarito Oficial</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Revisar Gabarito</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="px-6 py-3 border-b border-orange-100 flex items-start gap-3" style={{ background: C.light }}>
        <Info size={20} className="shrink-0 mt-0.5" style={{ color: C.orange }} />
        <p className="text-xs font-medium leading-relaxed" style={{ color: C.orange }}>
          Marque a alternativa correta de cada questão.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32" style={{ scrollbarWidth: 'none' }}>
        <div className="flex justify-between items-center mb-2 px-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questão</p>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Alternativas</span>
        </div>

        {numeros.map((num) => (
          <div key={num} className="flex items-center justify-between p-3 rounded-xl border shadow-sm bg-white" style={{ borderColor: '#f3f4f6' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#f3f4f6', color: '#374151' }}>
              {String(num).padStart(2, '0')}
            </div>
            <div className="flex gap-1.5">
              {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                <label key={opt} className="cursor-pointer">
                  <input type="radio" name={`q${num}`} value={opt} className="sr-only" checked={answers[num] === opt} onChange={() => setAnswers((p) => ({ ...p, [num]: opt }))} />
                  <div
                    className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: answers[num] === opt ? C.orange : '#fff',
                      borderColor: answers[num] === opt ? C.orange : '#e5e7eb',
                      color: answers[num] === opt ? '#fff' : '#6b7280',
                    }}
                  >
                    {opt}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500">Total de questões: <span className="text-gray-900">{simulado.total_questoes} questões</span></p>
        </div>
        <OrangeBtn onClick={handleSave}>
          {saving ? 'Salvando...' : 'Salvar Gabarito Oficial'} <Check size={20} />
        </OrangeBtn>
      </div>
    </MobileShell>
  );
}

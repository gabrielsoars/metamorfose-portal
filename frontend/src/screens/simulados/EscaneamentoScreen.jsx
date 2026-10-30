import { useEffect, useRef, useState } from 'react';
import { X, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterGabarito } from '../../services/simuladosService.js';
import { processarGabarito } from '../../services/scanService.js';
import { MobileShell, OrangeBtn } from '../../components/ui.jsx';

const AVISO_STATUS = {
  sem_resposta: 'Atenção: Em branco ou rasura',
  multipla_marcacao: 'Atenção: Múltipla marcação',
};

export function EscaneamentoScreen({ go, simulado, aluno }) {
  // Respostas e status do scan, indexados pelo número da questão.
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanTotal, setScanTotal] = useState(null);
  // Gabarito oficial: null enquanto carrega, depois a lista de { num_questao, alt_correta, anulada }.
  const [gabarito, setGabarito] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let isMounted = true;

    obterGabarito(simulado.id)
      .then((itens) => {
        if (isMounted) setGabarito(Array.isArray(itens) ? itens : []);
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar o gabarito oficial.');
      });

    return () => {
      isMounted = false;
    };
  }, [simulado.id]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const total = simulado.total_questoes;
  const numeros = Array.from({ length: total }, (_, i) => i + 1);
  // Só conta questão que tem gabarito oficial. Questão anulada vale acerto para todos, como no backend.
  const totalGabarito = gabarito ? gabarito.length : 0;
  const acertos = gabarito
    ? gabarito.filter((g) => g.anulada || answers[g.num_questao] === g.alt_correta).length
    : 0;

  const handleFile = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    setProcessing(true);
    try {
      const resultado = await processarGabarito(arquivo, total);
      const lidas = {};
      const status = {};
      resultado.questoes.forEach((q) => {
        if (q.questao > total) return;
        if (q.resposta) lidas[q.questao] = q.resposta;
        status[q.questao] = q.status;
      });
      setAnswers(lidas);
      setStatuses(status);
      setScanTotal(resultado.total_questoes);
      setPreview(URL.createObjectURL(arquivo));
    } catch (error) {
      window.alert(error.message || 'Não foi possível processar a imagem.');
    } finally {
      setProcessing(false);
    }
  };

  const banner = processing
    ? 'Processando...'
    : scanTotal === null
      ? 'Envie a foto do gabarito preenchido pelo aluno.'
      : scanTotal !== total
        ? `O scan leu ${scanTotal} questões, mas o simulado tem ${total}. As não lidas ficam em branco.`
        : 'Revise as alternativas lidas pelo sistema.';

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('simulado-painel')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Aluno em Correção</p>
          <h1 className="text-base font-bold text-gray-900 truncate">{aluno.name}</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="bg-gray-900 w-full h-48 relative flex items-center justify-center overflow-hidden shrink-0">
        {preview ? (
          <img src={preview} alt="Gabarito enviado" className="h-full w-full object-contain" />
        ) : (
          <p className="text-xs font-semibold text-white/60">Nenhuma foto enviada</p>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={processing}
          className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-white/30 transition-colors"
        >
          <RefreshCw size={14} /> {processing ? 'Processando...' : preview ? 'Refazer Foto' : 'Enviar foto'}
        </button>
      </div>

      <div className="bg-yellow-50 px-6 py-2.5 border-b border-yellow-100 flex items-center gap-2 shrink-0">
        <AlertTriangle size={16} className="text-yellow-600" />
        <p className="text-xs text-yellow-700 font-semibold">{banner}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-32" style={{ scrollbarWidth: 'none' }}>
        {numeros.map((num) => {
          const aviso = AVISO_STATUS[statuses[num]];
          return (
            <div key={num}>
              <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm relative" style={{ background: aviso ? '#fef2f2' : '#fff', borderColor: aviso ? '#fecaca' : '#f3f4f6' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: aviso ? '#fee2e2' : '#f9fafb', color: aviso ? '#b91c1c' : '#374151' }}>
                  {String(num).padStart(2, '0')}
                </div>
                <div className="flex gap-1.5">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <label key={opt} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`q${num}`}
                        value={opt}
                        className="sr-only"
                        checked={answers[num] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [num]: opt }))}
                      />
                      <div
                        className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: answers[num] === opt ? '#1f2937' : '#fff',
                          borderColor: answers[num] === opt ? '#1f2937' : aviso ? '#fecaca' : '#e5e7eb',
                          color: answers[num] === opt ? '#fff' : '#6b7280',
                        }}
                      >
                        {opt}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {aviso && <p className="text-[10px] font-bold text-red-500 mt-1 ml-2 uppercase tracking-wider">{aviso}</p>}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500">Nota Calculada:</p>
          {gabarito === null ? (
            <p className="text-lg font-black text-gray-300">—</p>
          ) : totalGabarito === 0 ? (
            <p className="text-xs font-bold text-orange-500">Cadastre o gabarito oficial</p>
          ) : (
            <p className="text-lg font-black text-emerald-600">{acertos} / {totalGabarito} <span className="text-xs font-bold text-emerald-600/70 ml-1">acertos</span></p>
          )}
        </div>
        <OrangeBtn onClick={() => go('simulado-painel')}>
          Concluir <Check size={20} />
        </OrangeBtn>
      </div>
    </MobileShell>
  );
}

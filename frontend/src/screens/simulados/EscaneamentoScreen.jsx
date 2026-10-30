import { useEffect, useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterGabarito, obterCorrecaoAluno, respostasSalvas, montarRespostas, salvarRespostasAluno } from '../../services/simuladosService.js';
import { processarGabarito } from '../../services/scanService.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';
import { ImagePicker } from '../../components/ImagePicker.jsx';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    obterGabarito(simulado.id)
      .then((itens) => {
        if (isMounted) setGabarito((Array.isArray(itens) ? itens : []).filter((g) => g.num_questao <= simulado.total_questoes));
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar o gabarito oficial.');
      });

    return () => {
      isMounted = false;
    };
  }, [simulado.id, simulado.total_questoes]);

  // Aluno já corrigido: carrega as respostas salvas (sem sobrescrever o que o scan já preencheu).
  useEffect(() => {
    let isMounted = true;

    obterCorrecaoAluno(simulado.id, aluno.id)
      .then((correcao) => {
        const salvas = respostasSalvas(correcao);
        if (isMounted && Object.keys(salvas).length) {
          setAnswers((prev) => (Object.keys(prev).length ? prev : salvas));
        }
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar as respostas salvas.');
      });

    return () => {
      isMounted = false;
    };
  }, [simulado.id, aluno.id]);

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

  // O ImagePicker já validou e reduziu o arquivo; aqui só envia ao scan.
  // Se o scan falhar, o erro sobe e o ImagePicker mostra o alerta.
  const handleFile = async (arquivo) => {
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
    } finally {
      setProcessing(false);
    }
  };

  const handleConcluir = async () => {
    if (saving) return;
    if (!gabarito || gabarito.length === 0) {
      window.alert('Cadastre o gabarito oficial antes de concluir a correção.');
      return;
    }
    if (Object.keys(answers).length === 0) {
      window.alert('Envie a foto ou marque ao menos uma resposta antes de concluir.');
      return;
    }

    setSaving(true);
    try {
      await salvarRespostasAluno(simulado.id, aluno.id, montarRespostas(gabarito, answers, total));
      go('simulado-painel');
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar a correção.');
      setSaving(false);
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
    <AppShell go={go} active="simulados" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => go('simulado-painel')} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Aluno em Correção</p>
          <h1 className="text-base font-bold text-gray-900 truncate">{aluno.name}</h1>
        </div>
        <div className="w-11 h-11 md:w-10 md:h-10" />
      </header>

      {/* Desktop: foto ocupa a coluna da esquerda inteira; aviso, respostas e nota ficam na da direita. */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
      <ImagePicker onSelect={handleFile} previewUrl={preview} processing={processing} className="lg:row-span-3 lg:h-full" />

      <div className={`bg-yellow-50 px-6 py-2.5 ${GUTTER_FORM} border-b border-yellow-100 flex items-center gap-2 shrink-0 lg:col-start-2`}>
        <AlertTriangle size={16} className="text-yellow-600" />
        <p className="text-xs text-yellow-700 font-semibold">{banner}</p>
      </div>

      <div className={`flex-1 overflow-y-auto p-6 space-y-3 pb-32 ${GUTTER_FORM} lg:col-start-2 lg:pb-6`} style={{ scrollbarWidth: 'none' }}>
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
                        className="w-9 h-9 md:w-8 md:h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
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

      <div className={`absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 ${GUTTER_FORM} shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30 lg:static lg:col-start-2`}>
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
        <OrangeBtn onClick={handleConcluir}>
          {saving ? 'Salvando...' : 'Concluir'} <Check size={20} />
        </OrangeBtn>
      </div>
      </div>
    </AppShell>
  );
}

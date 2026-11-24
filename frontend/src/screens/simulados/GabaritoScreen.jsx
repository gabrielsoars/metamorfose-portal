import { useEffect, useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { C } from '../../data/constants.js';
import { obterGabarito, salvarGabarito } from '../../services/simuladosService.js';
import { processarGabarito } from '../../services/scanService.js';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';
import { OrangeBtn } from '../../components/ui.jsx';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER_FORM, HEADER_TOP } from '../../components/layout.js';
import { ImagePicker } from '../../components/ImagePicker.jsx';
import { mostrarErro } from '../../components/avisosEstado.js';

const AVISO_STATUS = {
  sem_resposta: 'Atenção: Em branco ou rasura',
  multipla_marcacao: 'Atenção: Múltipla marcação',
};

export function GabaritoScreen({ simulado }) {
  const navigate = useNavigate();
  // Respostas e status do scan, indexados pelo número da questão: { 1: 'A', 2: 'C' }
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanTotal, setScanTotal] = useState(null);
  const [saving, setSaving] = useState(false);
  const simuladoId = simulado?.id;
  const totalQuestoes = simulado?.total_questoes;

  useEffect(() => {
    if (!simuladoId) return undefined;
    let isMounted = true;

    obterGabarito(simuladoId)
      .then((itens) => {
        if (!isMounted) return;
        const salvas = {};
        (Array.isArray(itens) ? itens : []).forEach((item) => {
          // Questões acima do total atual (simulado reduzido) ficam fora; o backend recusaria salvá-las.
          if (item.num_questao > totalQuestoes) return;
          if (item.alt_correta) salvas[item.num_questao] = item.alt_correta;
        });
        if (Object.keys(salvas).length) {
          setAnswers((prev) => (Object.keys(prev).length ? prev : salvas));
        }
      })
      .catch((error) => {
        if (isMounted) mostrarErro(error.message || 'Não foi possível carregar o gabarito.');
      });

    return () => {
      isMounted = false;
    };
  }, [simuladoId, totalQuestoes]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!simulado) {
    return (
      <AppShell active="simulados" mobileNav={false}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
          <p className="text-sm font-medium text-gray-500">Nenhum simulado selecionado.</p>
          <OrangeBtn onClick={() => navigate(rotas.simulados)}>Voltar para os simulados</OrangeBtn>
        </div>
      </AppShell>
    );
  }

  const total = simulado.total_questoes;
  const numeros = Array.from({ length: total }, (_, i) => i + 1);
  const marcadas = numeros.filter((num) => Boolean(answers[num])).length;

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

  const selecionarAlternativa = (num, opt) => {
    setAnswers((prev) => ({ ...prev, [num]: opt }));
    setStatuses((prev) => (prev[num] ? { ...prev, [num]: 'ok' } : prev));
  };

  const handleSave = async () => {
    if (saving) return;
    const itens = numeros
      .filter((num) => Boolean(answers[num]))
      .map((num) => ({ num_questao: num, alt_correta: answers[num] }));
    if (itens.length === 0) {
      mostrarErro('Marque a alternativa correta de pelo menos uma questão.');
      return;
    }

    setSaving(true);
    try {
      await salvarGabarito(simulado.id, itens);
      navigate(rotas.simulado(simulado.id), { replace: true });
    } catch (error) {
      mostrarErro(error.message || 'Não foi possível salvar o gabarito.');
    } finally {
      setSaving(false);
    }
  };

  const banner = processing
    ? 'Processando...'
    : scanTotal === null
      ? 'Envie a foto do gabarito oficial ou marque a alternativa correta de cada questão.'
      : scanTotal !== total
        ? `O scan leu ${scanTotal} questões, mas o simulado tem ${total}. As não lidas ficam em branco.`
        : 'Revise as alternativas lidas pelo sistema.';

  return (
    <AppShell active="simulados" mobileNav={false}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100`}>
        <button type="button" onClick={() => navigate(rotas.simulado(simulado.id))} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Gabarito Oficial</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Revisar Gabarito</h1>
        </div>
        <div className="w-11 h-11 md:w-10 md:h-10" />
      </header>

      {/* Desktop: foto ocupa a coluna da esquerda inteira; aviso, respostas e ação ficam na da direita. */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        <ImagePicker onSelect={handleFile} previewUrl={preview} processing={processing} className="lg:row-span-3 lg:h-full" />

        <div className={`bg-yellow-50 px-6 py-2.5 ${GUTTER_FORM} border-b border-yellow-100 flex items-center gap-2 shrink-0 lg:col-start-2`}>
          <AlertTriangle size={16} className="text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-700 font-semibold">{banner}</p>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 space-y-3 pb-32 ${GUTTER_FORM} lg:col-start-2 lg:pb-6`} style={{ scrollbarWidth: 'none' }}>
          <div className="flex justify-between items-center mb-2 px-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questão</p>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Alternativas</span>
          </div>

          {numeros.map((num) => {
            const aviso = AVISO_STATUS[statuses[num]];
            return (
              <div key={num}>
                <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm relative" style={{ background: aviso ? '#fef2f2' : '#fff', borderColor: aviso ? '#fecaca' : '#f3f4f6' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: aviso ? '#fee2e2' : '#f3f4f6', color: aviso ? '#b91c1c' : '#374151' }}>
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
                          onChange={() => selecionarAlternativa(num, opt)}
                        />
                        <div
                          className="w-9 h-9 md:w-8 md:h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                          style={{
                            background: answers[num] === opt ? C.orange : '#fff',
                            borderColor: answers[num] === opt ? C.orange : aviso ? '#fecaca' : '#e5e7eb',
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
            <p className="text-xs font-bold text-gray-500">Total de questões: <span className="text-gray-900">{total} questões</span></p>
            <p className="text-xs font-bold" style={{ color: marcadas === total ? '#059669' : C.orange }}>
              {marcadas} / {total} marcadas
            </p>
          </div>
          <OrangeBtn onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar Gabarito Oficial'} <Check size={20} />
          </OrangeBtn>
        </div>
      </div>
    </AppShell>
  );
}

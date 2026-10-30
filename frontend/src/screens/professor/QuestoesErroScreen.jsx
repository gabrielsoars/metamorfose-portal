import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { C } from '../../data/constants.js';
import { listarSimulados, carregarQuestoesComErro } from '../../services/simuladosService.js';
import { listarTurmas } from '../../services/turmasService.js';
import { AppShell } from '../../components/AppShell.jsx';
import { GUTTER, HEADER_TOP } from '../../components/layout.js';

// Simulados que têm a turma (todos, se nenhuma turma estiver escolhida), do mais recente para o mais antigo.
const simuladosDaTurma = (simulados, turmaId) =>
  simulados
    .filter((s) => !turmaId || (s.turmas || []).some((t) => String(t.id) === String(turmaId)))
    .sort((a, b) => String(b.data_aplicacao).localeCompare(String(a.data_aplicacao)) || b.id - a.id);

const corDoPercentual = (pct) => (pct >= 70 ? '#ef4444' : pct >= 40 ? '#f97316' : '#eab308');

// Filtros (turma e simulado reais, vindos da API) e questões com maior erro do simulado escolhido.
// `onChange` recebe o filtro novo para quem precisar guardá-lo (ex.: sobreviver ao refresh).
export function useQuestoesErro(filtroInicial, onChange) {
  const [simulados, setSimulados] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [carregandoFiltros, setCarregandoFiltros] = useState(true);
  const [turmaId, setTurmaId] = useState(filtroInicial?.turmaId ?? '');
  const [simuladoEscolhido, setSimuladoEscolhido] = useState(filtroInicial?.simuladoId ?? '');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([listarSimulados(), listarTurmas()])
      .then(([listaSimulados, listaTurmas]) => {
        if (!isMounted) return;
        setSimulados(Array.isArray(listaSimulados) ? listaSimulados : []);
        setTurmas(Array.isArray(listaTurmas) ? listaTurmas : []);
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar simulados e turmas.');
      })
      .finally(() => {
        if (isMounted) setCarregandoFiltros(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const simuladosVisiveis = simuladosDaTurma(simulados, turmaId);
  const simulado = simuladosVisiveis.find((s) => String(s.id) === String(simuladoEscolhido)) || simuladosVisiveis[0] || null;
  const chave = simulado ? `${simulado.id}:${turmaId}` : null;

  useEffect(() => {
    if (!simulado) return undefined;
    let isMounted = true;
    carregarQuestoesComErro(simulado, turmaId)
      .then((dados) => {
        if (isMounted) setResultado({ chave, ...dados });
      })
      .catch((error) => {
        if (!isMounted) return;
        window.alert(error.message || 'Não foi possível carregar as questões.');
        setResultado({ chave, erro: true });
      });
    return () => {
      isMounted = false;
    };
    // `simulado` só muda de identidade quando a lista é recarregada; a chave basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const escolherTurma = (novaTurma) => {
    const visiveis = simuladosDaTurma(simulados, novaTurma);
    const atual = visiveis.find((s) => s.id === simulado?.id) || visiveis[0];
    setTurmaId(novaTurma);
    setSimuladoEscolhido(atual ? String(atual.id) : '');
    onChange?.({ turmaId: novaTurma, simuladoId: atual ? String(atual.id) : '' });
  };

  const escolherSimulado = (novoSimulado) => {
    setSimuladoEscolhido(novoSimulado);
    onChange?.({ turmaId, simuladoId: novoSimulado });
  };

  return {
    turmas,
    simulados: simuladosVisiveis,
    todosSimulados: simulados,
    simulado,
    turmaId,
    filtro: { turmaId, simuladoId: simulado ? String(simulado.id) : '' },
    carregandoFiltros,
    carregando: !!simulado && resultado?.chave !== chave,
    resultado: resultado?.chave === chave ? resultado : null,
    escolherTurma,
    escolherSimulado,
  };
}

function Select({ label, value, onChange, disabled, children }) {
  return (
    <div className="relative flex-1 min-w-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700 appearance-none truncate disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

export function FiltrosQuestoes({ q }) {
  return (
    <div className="flex gap-2">
      <Select label="Turma" value={q.turmaId} onChange={q.escolherTurma}>
        <option value="">Todas as Turmas</option>
        {q.turmas.map((t) => <option key={t.id} value={String(t.id)}>{t.nome}</option>)}
      </Select>
      <Select label="Simulado" value={q.simulado ? String(q.simulado.id) : ''} onChange={q.escolherSimulado} disabled={!q.simulado}>
        {q.simulado
          ? q.simulados.map((s) => <option key={s.id} value={String(s.id)}>{s.titulo}</option>)
          : <option value="">{q.carregandoFiltros ? 'Carregando...' : 'Nenhum simulado'}</option>}
      </Select>
    </div>
  );
}

// Lista de questões (ou o estado vazio/carregando que se aplica). `limite` corta o topo da lista.
// `tabela`: no desktop vira tabela (questão | barra | percentual), usada na tela "Ver todas".
export function QuestoesErroLista({ q, limite, tabela = false }) {
  let mensagem = null;
  if (q.carregandoFiltros) mensagem = 'Carregando...';
  else if (!q.simulado) {
    mensagem = q.todosSimulados.length === 0 ? 'Nenhum simulado cadastrado ainda.' : 'Nenhum simulado para esta turma.';
  } else if (q.carregando) mensagem = 'Calculando...';
  else if (q.resultado?.erro) mensagem = 'Não foi possível carregar as questões.';
  else if (q.resultado.corrigidos === 0) mensagem = 'Nenhuma prova corrigida neste simulado ainda.';
  else if (q.resultado.questoes.length === 0) mensagem = 'Nenhuma questão com dados para este simulado.';

  if (mensagem) return <p className="text-xs text-gray-400 text-center py-4">{mensagem}</p>;

  const questoes = limite ? q.resultado.questoes.slice(0, limite) : q.resultado.questoes;
  return (
    <div className={`space-y-4 ${tabela ? 'lg:space-y-0 lg:divide-y lg:divide-gray-100' : ''}`}>
      {tabela && (
        <div className="hidden lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_7rem] lg:gap-6 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <span>Questão</span>
          <span>Índice de erro</span>
          <span className="text-right">Erraram</span>
        </div>
      )}
      {questoes.map(({ questao, erros, total, pct }) => {
        const color = corDoPercentual(pct);
        return (
          <div key={questao} className={tabela ? 'lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_7rem] lg:items-center lg:gap-6 lg:py-3' : undefined}>
            <div className={`flex justify-between items-end mb-1 ${tabela ? 'lg:contents' : ''}`}>
              <p className={`text-xs font-bold text-gray-800 ${tabela ? 'lg:order-1 lg:text-sm' : ''}`}>
                Questão {String(questao).padStart(2, '0')}
                <span className="text-[9px] text-gray-400 font-normal ml-1">({erros} de {total} alunos)</span>
              </p>
              <p className={`text-xs font-bold ${tabela ? 'lg:order-3 lg:text-right lg:text-sm' : ''}`} style={{ color }}>{pct}% erraram</p>
            </div>
            <div className={`w-full bg-gray-100 h-2 rounded-full overflow-hidden ${tabela ? 'lg:order-2 lg:h-3' : ''}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QuestoesErroScreen({ go, filtro }) {
  const q = useQuestoesErro(filtro, (novo) => go('questoes-erro', novo));

  return (
    <AppShell go={go} active="dashboard" onNav={(tab) => {
      if (tab === 'dashboard') go('prof-dashboard', q.filtro);
      else if (tab === 'turmas') go('prof-turmas');
      else if (tab === 'simulados') go('simulados-lista');
      else if (tab === 'perfil') go('prof-perfil');
    }}>
      <header className={`bg-white ${HEADER_TOP} pb-4 px-4 ${GUTTER} shadow-sm z-20 flex items-center border-b border-gray-100`}>
        <button type="button" onClick={() => go('prof-dashboard', q.filtro)} aria-label="Voltar" className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Desempenho</p>
          <h1 className="text-base font-bold text-gray-900 leading-tight">Questões com maior erro</h1>
        </div>
      </header>

      <div className={`bg-white px-6 py-4 ${GUTTER} border-b border-gray-100 z-10 lg:[&>div]:max-w-2xl`}>
        <FiltrosQuestoes q={q} />
      </div>

      <div className={`flex-1 overflow-y-auto p-6 pb-8 ${GUTTER}`} style={{ scrollbarWidth: 'none' }}>
        {q.resultado && q.resultado.corrigidos > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            Baseado em {q.resultado.corrigidos} {q.resultado.corrigidos === 1 ? 'prova corrigida' : 'provas corrigidas'}.
          </p>
        )}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <QuestoesErroLista q={q} tabela />
        </div>
      </div>
    </AppShell>
  );
}

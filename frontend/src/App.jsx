import { useEffect, useState } from 'react';
import { FALLBACK_PROFESSORS, FALLBACK_TURMAS } from './data/constants.js';
import { listarUsuarios, normalizeUsuario } from './services/usuariosService.js';
import { listarTurmas, normalizeTurma } from './services/turmasService.js';
import { obterSimulado } from './services/simuladosService.js';
import { listarAlunosDaTurma, normalizeAluno } from './services/alunosService.js';
import { LoginScreen, AtivacaoScreen } from './screens/auth/index.js';
import { AdminHomeScreen, AdminGestaoScreen, AdminCadastroScreen } from './screens/admin/index.js';
import { ProfDashboardScreen, TurmasScreen, TurmaDetalhesScreen, TurmaCadastroScreen, ProfPerfilScreen } from './screens/professor/index.js';
import { SimuladosListaScreen, SimuladoCriarScreen, SimuladoEditarScreen, SimuladoPainelScreen, EscaneamentoScreen, GabaritoScreen } from './screens/simulados/index.js';
export { normalizeUsuario } from './services/usuariosService.js';
export { normalizeTurma } from './services/turmasService.js';
export { normalizeAluno } from './services/alunosService.js';

// Guarda a tela atual e os ids selecionados para que um refresh (F5) não volte ao login.
const NAV_STORAGE_KEY = 'metamorfose:nav';

// Telas que trabalham sobre um simulado selecionado.
const SIMULADO_SCREENS = ['simulado-painel', 'simulado-editar', 'simulado-gabarito', 'escaneamento'];

// Telas que trabalham sobre uma turma selecionada.
const TURMA_SCREENS = ['turma-detalhes', 'turma-editar'];

function readSavedNav() {
  try {
    return JSON.parse(sessionStorage.getItem(NAV_STORAGE_KEY)) || { screen: 'login' };
  } catch {
    return { screen: 'login' };
  }
}

function saveNav(nav) {
  try {
    if (nav.screen === 'login') sessionStorage.removeItem(NAV_STORAGE_KEY);
    else sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(nav));
  } catch {
    // Sem sessionStorage o app funciona normalmente, só não restaura a tela.
  }
}

export default function App() {
  const [savedNav] = useState(readSavedNav);
  const [screen, setScreen] = useState(savedNav.screen);
  const [usuarios, setUsuarios] = useState(FALLBACK_PROFESSORS);
  const [turmas, setTurmas] = useState(FALLBACK_TURMAS);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [selectedSimulado, setSelectedSimulado] = useState(null);
  const [selectedAluno, setSelectedAluno] = useState(null);

  const loadData = async () => {
    try {
      const [usuariosResponse, turmasResponse] = await Promise.all([
        listarUsuarios().catch(() => FALLBACK_PROFESSORS),
        listarTurmas().catch(() => FALLBACK_TURMAS),
      ]);

      const listaUsuarios = (Array.isArray(usuariosResponse) ? usuariosResponse : FALLBACK_PROFESSORS).map(normalizeUsuario);
      const listaTurmas = (Array.isArray(turmasResponse) ? turmasResponse : FALLBACK_TURMAS).map(normalizeTurma);
      setUsuarios(listaUsuarios);
      setTurmas(listaTurmas);
      return { usuarios: listaUsuarios, turmas: listaTurmas };
    } catch {
      setUsuarios(FALLBACK_PROFESSORS);
      setTurmas(FALLBACK_TURMAS);
      return { usuarios: FALLBACK_PROFESSORS, turmas: FALLBACK_TURMAS };
    }
  };

  useEffect(() => {
    loadData().then(async ({ usuarios: listaUsuarios, turmas: listaTurmas }) => {
      // Após um refresh, recupera o item selecionado pelo id salvo. Se ele não existir mais, volta para a tela anterior.
      if (savedNav.screen === 'admin-gestao') {
        const professor = listaUsuarios.find((u) => u.id === savedNav.professorId);
        if (professor) setSelectedProfessor(professor);
        else setScreen('admin-home');
      }
      if (TURMA_SCREENS.includes(savedNav.screen)) {
        const turma = listaTurmas.find((t) => t.id === savedNav.turmaId);
        if (turma) setSelectedTurma(turma);
        else setScreen('prof-turmas');
      }
      if (SIMULADO_SCREENS.includes(savedNav.screen)) {
        const simulado = savedNav.simuladoId ? await obterSimulado(savedNav.simuladoId).catch(() => null) : null;
        if (!simulado) {
          setScreen('simulados-lista');
        } else {
          setSelectedSimulado(simulado);
          if (savedNav.screen === 'escaneamento') {
            // O aluno não tem endpoint próprio: procura nos alunos das turmas do simulado.
            const porTurma = await Promise.all(
              simulado.turmas.map((t) => listarAlunosDaTurma(t.id).catch(() => [])),
            );
            const aluno = porTurma.flat().map(normalizeAluno).find((a) => a.id === savedNav.alunoId);
            if (aluno) setSelectedAluno(aluno);
            else setScreen('simulado-painel');
          }
        }
      }
    });
  }, [savedNav]);

  // Telas que dependem de um item selecionado ficam em branco até a restauração terminar,
  // para não exibir dados de fallback por um instante.
  const isRestoringSelection =
    (screen === 'admin-gestao' && !selectedProfessor) ||
    (TURMA_SCREENS.includes(screen) && !selectedTurma) ||
    (SIMULADO_SCREENS.includes(screen) && !selectedSimulado) ||
    (screen === 'escaneamento' && !selectedAluno);

  useEffect(() => {
    if (isRestoringSelection) return;
    saveNav({
      screen,
      professorId: selectedProfessor?.id ?? null,
      turmaId: selectedTurma?.id ?? null,
      simuladoId: selectedSimulado?.id ?? null,
      alunoId: selectedAluno?.id ?? null,
    });
  }, [screen, selectedProfessor, selectedTurma, selectedSimulado, selectedAluno, isRestoringSelection]);

  const go = (s, payload = null) => {
    setSelectedProfessor(s === 'admin-gestao' ? payload : null);
    setSelectedTurma(TURMA_SCREENS.includes(s) ? payload : null);
    // O simulado continua selecionado enquanto a navegação fica entre as telas dele.
    // No escaneamento o payload é o aluno, não o simulado.
    if (!SIMULADO_SCREENS.includes(s)) setSelectedSimulado(null);
    else if (payload && s !== 'escaneamento') setSelectedSimulado(payload);
    setSelectedAluno(s === 'escaneamento' ? payload : null);
    setScreen(s);
  };

  if (isRestoringSelection) return null;

  switch (screen) {
    case 'login':
      return <LoginScreen go={go} />;
    case 'ativacao':
      return <AtivacaoScreen go={go} />;
    case 'admin-home':
      return <AdminHomeScreen go={go} professors={usuarios} onRefresh={loadData} />;
    case 'admin-gestao':
      return <AdminGestaoScreen go={go} professor={selectedProfessor} onRefresh={loadData} />;
    case 'admin-cadastro':
      return <AdminCadastroScreen go={go} onRefresh={loadData} />;
    case 'prof-dashboard':
      return <ProfDashboardScreen go={go} turmas={turmas} />;
    case 'prof-turmas':
      return <TurmasScreen go={go} turmas={turmas} onRefresh={loadData} />;
    case 'turma-detalhes':
      return <TurmaDetalhesScreen go={go} turma={selectedTurma} turmas={turmas} onRefresh={loadData} />;
    case 'turma-cadastro':
      return <TurmaCadastroScreen go={go} onRefresh={loadData} />;
    case 'turma-editar':
      return <TurmaCadastroScreen go={go} turma={selectedTurma} onRefresh={loadData} />;
    case 'simulados-lista':
      return <SimuladosListaScreen go={go} />;
    case 'simulado-criar':
      return <SimuladoCriarScreen go={go} turmas={turmas} />;
    case 'simulado-editar':
      return <SimuladoEditarScreen go={go} simulado={selectedSimulado} turmas={turmas} />;
    case 'simulado-painel':
      return <SimuladoPainelScreen go={go} simulado={selectedSimulado} />;
    case 'escaneamento':
      return <EscaneamentoScreen go={go} simulado={selectedSimulado} aluno={selectedAluno} />;
    case 'simulado-gabarito':
      return <GabaritoScreen go={go} simulado={selectedSimulado} />;
    case 'prof-perfil':
      return <ProfPerfilScreen go={go} />;
    default:
      return <LoginScreen go={go} />;
  }
}

import { useEffect, useState } from 'react';
import { FALLBACK_PROFESSORS, FALLBACK_TURMAS } from './data/constants.js';
import { listarUsuarios, normalizeUsuario } from './services/usuariosService.js';
import { listarTurmas, normalizeTurma } from './services/turmasService.js';
import { LoginScreen, AtivacaoScreen } from './screens/auth/index.js';
import { AdminHomeScreen, AdminGestaoScreen, AdminCadastroScreen } from './screens/admin/index.js';
import { ProfDashboardScreen, TurmasScreen, TurmaDetalhesScreen, TurmaCadastroScreen, ProfPerfilScreen } from './screens/professor/index.js';
import { SimuladosListaScreen, SimuladoCriarScreen, SimuladoPainelScreen, EscaneamentoScreen, GabaritoScreen } from './screens/simulados/index.js';
export { normalizeUsuario } from './services/usuariosService.js';
export { normalizeTurma } from './services/turmasService.js';
export { normalizeAluno } from './services/alunosService.js';

// Guarda a tela atual e os ids selecionados para que um refresh (F5) não volte ao login.
const NAV_STORAGE_KEY = 'metamorfose:nav';

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
    loadData().then(({ usuarios: listaUsuarios, turmas: listaTurmas }) => {
      // Após um refresh, recupera o item selecionado pelo id salvo. Se ele não existir mais, volta para a tela anterior.
      if (savedNav.screen === 'admin-gestao') {
        const professor = listaUsuarios.find((u) => u.id === savedNav.professorId);
        if (professor) setSelectedProfessor(professor);
        else setScreen('admin-home');
      }
      if (savedNav.screen === 'turma-detalhes') {
        const turma = listaTurmas.find((t) => t.id === savedNav.turmaId);
        if (turma) setSelectedTurma(turma);
        else setScreen('prof-turmas');
      }
    });
  }, [savedNav]);

  // Telas que dependem de um item selecionado ficam em branco até a restauração terminar,
  // para não exibir dados de fallback por um instante.
  const isRestoringSelection =
    (screen === 'admin-gestao' && !selectedProfessor) ||
    (screen === 'turma-detalhes' && !selectedTurma);

  useEffect(() => {
    if (isRestoringSelection) return;
    saveNav({
      screen,
      professorId: selectedProfessor?.id ?? null,
      turmaId: selectedTurma?.id ?? null,
    });
  }, [screen, selectedProfessor, selectedTurma, isRestoringSelection]);

  const go = (s, payload = null) => {
    setSelectedProfessor(s === 'admin-gestao' ? payload : null);
    setSelectedTurma(s === 'turma-detalhes' ? payload : null);
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
    case 'simulados-lista':
      return <SimuladosListaScreen go={go} />;
    case 'simulado-criar':
      return <SimuladoCriarScreen go={go} />;
    case 'simulado-painel':
      return <SimuladoPainelScreen go={go} />;
    case 'escaneamento':
      return <EscaneamentoScreen go={go} />;
    case 'simulado-gabarito':
      return <GabaritoScreen go={go} />;
    case 'prof-perfil':
      return <ProfPerfilScreen go={go} />;
    default:
      return <LoginScreen go={go} />;
  }
}

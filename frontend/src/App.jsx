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

export default function App() {
  const [screen, setScreen] = useState('login');
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

      setUsuarios((Array.isArray(usuariosResponse) ? usuariosResponse : FALLBACK_PROFESSORS).map(normalizeUsuario));
      setTurmas((Array.isArray(turmasResponse) ? turmasResponse : FALLBACK_TURMAS).map(normalizeTurma));
    } catch {
      setUsuarios(FALLBACK_PROFESSORS);
      setTurmas(FALLBACK_TURMAS);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const go = (s, payload = null) => {
    setSelectedProfessor(s === 'admin-gestao' ? payload : null);
    setSelectedTurma(s === 'turma-detalhes' ? payload : null);
    setScreen(s);
  };

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

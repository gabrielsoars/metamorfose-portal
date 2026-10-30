import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FALLBACK_PROFESSORS, FALLBACK_TURMAS } from './data/constants.js';
import { listarUsuarios, normalizeUsuario } from './services/usuariosService.js';
import { listarTurmas, normalizeTurma } from './services/turmasService.js';
import { LoginScreen, AtivacaoScreen } from './screens/auth/index.js';
import { AdminHomeScreen, AdminGestaoScreen, AdminCadastroScreen } from './screens/admin/index.js';
import { ProfDashboardScreen, TurmasScreen, TurmaDetalhesScreen, TurmaCadastroScreen, ProfPerfilScreen } from './screens/professor/index.js';
import { QuestoesErroScreen } from './screens/professor/QuestoesErroScreen.jsx';
import { SimuladosListaScreen, SimuladoCriarScreen, SimuladoEditarScreen, SimuladoPainelScreen, EscaneamentoScreen, GabaritoScreen, BoletimScreen } from './screens/simulados/index.js';
import { rotas, filtroDaUrl } from './routes/rotas.js';
import { CarregaTurma, CarregaProfessor, CarregaSimulado, CarregaAluno } from './routes/carregadores.jsx';
export { normalizeUsuario } from './services/usuariosService.js';
export { normalizeTurma } from './services/turmasService.js';
export { normalizeAluno } from './services/alunosService.js';

// Etapa 1 do P-14: as telas ainda navegam com go(tela, payload); o adaptador traduz o nome
// da tela para a URL. O id que faltar no payload vem da URL atual (ex.: go('simulado-painel')
// a partir da correção usa o :simuladoId da rota). Na etapa 2 as telas passam a usar
// navigate/<Link> direto e este adaptador sai.
const URL_DA_TELA = {
  login: () => rotas.login,
  ativacao: () => rotas.ativacao,
  'recuperar-senha': () => rotas.recuperarSenha,
  'redefinir-senha': () => rotas.redefinirSenha,
  'admin-home': () => rotas.admin,
  'admin-cadastro': () => rotas.professorNovo,
  'admin-gestao': ({ payload }) => rotas.professor(payload.id),
  'prof-dashboard': ({ payload }) => rotas.painel(payload),
  'questoes-erro': ({ payload }) => rotas.questoesErro(payload),
  'prof-turmas': () => rotas.turmas,
  'turma-cadastro': () => rotas.turmaNova,
  'turma-detalhes': ({ payload, params }) => rotas.turma(payload?.id ?? params.turmaId),
  'turma-editar': ({ payload, params }) => rotas.turmaEditar(payload?.id ?? params.turmaId),
  'simulados-lista': () => rotas.simulados,
  'simulado-criar': () => rotas.simuladoNovo,
  'simulado-painel': ({ payload, params }) => rotas.simulado(payload?.id ?? params.simuladoId),
  'simulado-editar': ({ payload, params }) => rotas.simuladoEditar(payload?.id ?? params.simuladoId),
  'simulado-gabarito': ({ payload, params }) => rotas.simuladoGabarito(payload?.id ?? params.simuladoId),
  // Nas telas de aluno o payload é o aluno; o simulado vem da URL.
  escaneamento: ({ payload, params }) => rotas.correcao(params.simuladoId, payload?.id ?? params.alunoId),
  'aluno-boletim': ({ payload, params }) => rotas.boletim(params.simuladoId, payload?.id ?? params.alunoId),
  'prof-perfil': () => rotas.perfil,
};

function useGo() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  return (tela, payload = null) => {
    const url = URL_DA_TELA[tela]({ payload, params });
    // Mudar só o filtro da mesma tela não cria uma entrada nova no histórico.
    navigate(url, { replace: url.split('?')[0] === location.pathname });
  };
}

function ComGo({ children }) {
  return children(useGo());
}

function ComFiltro({ children }) {
  const [searchParams] = useSearchParams();
  return children(filtroDaUrl(searchParams));
}

export default function App() {
  const [usuarios, setUsuarios] = useState(FALLBACK_PROFESSORS);
  const [turmas, setTurmas] = useState(FALLBACK_TURMAS);

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
    loadData();
  }, []);

  // As telas de um registro têm `key` própria: ao trocar de tela o carregador é montado de novo
  // e busca o registro atualizado (ex.: o painel depois de editar o simulado).
  return (
    <Routes>
      <Route path={rotas.inicio} element={<Navigate to={rotas.login} replace />} />
      <Route path={rotas.login} element={<ComGo>{(go) => <LoginScreen go={go} />}</ComGo>} />
      <Route path={rotas.ativacao} element={<ComGo>{(go) => <AtivacaoScreen go={go} />}</ComGo>} />

      <Route path={rotas.admin} element={<ComGo>{(go) => <AdminHomeScreen go={go} professors={usuarios} onRefresh={loadData} />}</ComGo>} />
      <Route path={rotas.professorNovo} element={<ComGo>{(go) => <AdminCadastroScreen go={go} onRefresh={loadData} />}</ComGo>} />
      <Route
        path="/admin/professores/:professorId"
        element={<CarregaProfessor key="admin-gestao">{(professor) => <ComGo>{(go) => <AdminGestaoScreen go={go} professor={professor} onRefresh={loadData} />}</ComGo>}</CarregaProfessor>}
      />

      <Route path="/painel" element={<ComFiltro>{(filtro) => <ComGo>{(go) => <ProfDashboardScreen go={go} filtro={filtro} />}</ComGo>}</ComFiltro>} />
      <Route path="/painel/questoes-erro" element={<ComFiltro>{(filtro) => <ComGo>{(go) => <QuestoesErroScreen go={go} filtro={filtro} />}</ComGo>}</ComFiltro>} />

      <Route path={rotas.turmas} element={<ComGo>{(go) => <TurmasScreen go={go} turmas={turmas} onRefresh={loadData} />}</ComGo>} />
      <Route path={rotas.turmaNova} element={<ComGo>{(go) => <TurmaCadastroScreen go={go} onRefresh={loadData} />}</ComGo>} />
      <Route
        path="/turmas/:turmaId"
        element={<CarregaTurma key="turma-detalhes">{(turma) => <ComGo>{(go) => <TurmaDetalhesScreen go={go} turma={turma} turmas={turmas} onRefresh={loadData} />}</ComGo>}</CarregaTurma>}
      />
      <Route
        path="/turmas/:turmaId/editar"
        element={<CarregaTurma key="turma-editar">{(turma) => <ComGo>{(go) => <TurmaCadastroScreen go={go} turma={turma} onRefresh={loadData} />}</ComGo>}</CarregaTurma>}
      />

      <Route path={rotas.simulados} element={<ComGo>{(go) => <SimuladosListaScreen go={go} />}</ComGo>} />
      <Route path={rotas.simuladoNovo} element={<ComGo>{(go) => <SimuladoCriarScreen go={go} turmas={turmas} />}</ComGo>} />
      <Route
        path="/simulados/:simuladoId"
        element={<CarregaSimulado key="simulado-painel">{(simulado) => <ComGo>{(go) => <SimuladoPainelScreen go={go} simulado={simulado} />}</ComGo>}</CarregaSimulado>}
      />
      <Route
        path="/simulados/:simuladoId/editar"
        element={<CarregaSimulado key="simulado-editar">{(simulado) => <ComGo>{(go) => <SimuladoEditarScreen go={go} simulado={simulado} turmas={turmas} />}</ComGo>}</CarregaSimulado>}
      />
      <Route
        path="/simulados/:simuladoId/gabarito"
        element={<CarregaSimulado key="simulado-gabarito">{(simulado) => <ComGo>{(go) => <GabaritoScreen go={go} simulado={simulado} />}</ComGo>}</CarregaSimulado>}
      />
      <Route
        path="/simulados/:simuladoId/alunos/:alunoId/correcao"
        element={
          <CarregaSimulado key="escaneamento">
            {(simulado) => (
              <CarregaAluno simulado={simulado}>
                {(aluno) => <ComGo>{(go) => <EscaneamentoScreen go={go} simulado={simulado} aluno={aluno} />}</ComGo>}
              </CarregaAluno>
            )}
          </CarregaSimulado>
        }
      />
      <Route
        path="/simulados/:simuladoId/alunos/:alunoId/boletim"
        element={
          <CarregaSimulado key="aluno-boletim">
            {(simulado) => (
              <CarregaAluno simulado={simulado}>
                {(aluno) => <ComGo>{(go) => <BoletimScreen go={go} simulado={simulado} aluno={aluno} />}</ComGo>}
              </CarregaAluno>
            )}
          </CarregaSimulado>
        }
      />

      <Route path={rotas.perfil} element={<ComGo>{(go) => <ProfPerfilScreen go={go} />}</ComGo>} />

      {/* Como antes do roteador, qualquer outra tela cai no login. */}
      <Route path="*" element={<Navigate to={rotas.login} replace />} />
    </Routes>
  );
}

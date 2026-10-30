import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FALLBACK_PROFESSORS, FALLBACK_TURMAS } from './data/constants.js';
import { listarUsuarios, normalizeUsuario } from './services/usuariosService.js';
import { listarTurmas, normalizeTurma } from './services/turmasService.js';
import { LoginScreen, AtivacaoScreen } from './screens/auth/index.js';
import { AdminHomeScreen, AdminGestaoScreen, AdminCadastroScreen } from './screens/admin/index.js';
import { ProfDashboardScreen, TurmasScreen, TurmaDetalhesScreen, TurmaCadastroScreen, ProfPerfilScreen } from './screens/professor/index.js';
import { QuestoesErroScreen } from './screens/professor/QuestoesErroScreen.jsx';
import { SimuladosListaScreen, SimuladoCriarScreen, SimuladoEditarScreen, SimuladoPainelScreen, EscaneamentoScreen, GabaritoScreen, BoletimScreen } from './screens/simulados/index.js';
import { NaoEncontradoScreen } from './screens/NaoEncontradoScreen.jsx';
import { rotas } from './routes/rotas.js';
import { useTitulo } from './routes/titulo.js';
import { RotaPrivada } from './routes/RotaPrivada.jsx';
import { CarregaTurma, CarregaProfessor, CarregaSimulado, CarregaAluno } from './routes/carregadores.jsx';
export { normalizeUsuario } from './services/usuariosService.js';
export { normalizeTurma } from './services/turmasService.js';
export { normalizeAluno } from './services/alunosService.js';

// Tela sem registro na URL: só define o título da aba.
function Pagina({ titulo, children }) {
  useTitulo(titulo);
  return children;
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

  // Uma rota por tela (mapa de URLs do P-14). As telas de um registro têm `key` própria: ao trocar
  // de tela o carregador é montado de novo e busca o registro atualizado (ex.: o painel depois de
  // editar o simulado), em vez de reaproveitar o da tela anterior.
  return (
    <Routes>
      {/* Sem login real, o início é o login. Com autenticação, a raiz pode ir para a home do perfil. */}
      <Route path={rotas.inicio} element={<Navigate to={rotas.login} replace />} />
      <Route path={rotas.login} element={<Pagina titulo="Entrar"><LoginScreen /></Pagina>} />
      <Route path={rotas.ativacao} element={<Pagina titulo="Ativar conta"><AtivacaoScreen /></Pagina>} />

      <Route element={<RotaPrivada />}>
        <Route path={rotas.admin} element={<Pagina titulo="Usuários"><AdminHomeScreen professors={usuarios} onRefresh={loadData} /></Pagina>} />
        <Route path={rotas.professorNovo} element={<Pagina titulo="Novo professor"><AdminCadastroScreen onRefresh={loadData} /></Pagina>} />
        <Route
          path="/admin/professores/:professorId"
          element={
            <CarregaProfessor key="admin-gestao" titulo={(professor) => `Professor ${professor.name}`}>
              {(professor) => <AdminGestaoScreen professor={professor} onRefresh={loadData} />}
            </CarregaProfessor>
          }
        />

        <Route path="/painel" element={<Pagina titulo="Início"><ProfDashboardScreen /></Pagina>} />
        <Route path="/painel/questoes-erro" element={<Pagina titulo="Questões com maior erro"><QuestoesErroScreen /></Pagina>} />

        <Route path={rotas.turmas} element={<Pagina titulo="Minhas turmas"><TurmasScreen turmas={turmas} onRefresh={loadData} /></Pagina>} />
        <Route path={rotas.turmaNova} element={<Pagina titulo="Nova turma"><TurmaCadastroScreen onRefresh={loadData} /></Pagina>} />
        <Route
          path="/turmas/:turmaId"
          element={
            <CarregaTurma key="turma-detalhes" titulo={(turma) => `Turma ${turma.name}`}>
              {(turma) => <TurmaDetalhesScreen turma={turma} turmas={turmas} onRefresh={loadData} />}
            </CarregaTurma>
          }
        />
        <Route
          path="/turmas/:turmaId/editar"
          element={
            <CarregaTurma key="turma-editar" titulo={(turma) => `Editar turma ${turma.name}`}>
              {(turma) => <TurmaCadastroScreen turma={turma} onRefresh={loadData} />}
            </CarregaTurma>
          }
        />

        <Route path={rotas.simulados} element={<Pagina titulo="Meus simulados"><SimuladosListaScreen /></Pagina>} />
        <Route path={rotas.simuladoNovo} element={<Pagina titulo="Novo simulado"><SimuladoCriarScreen turmas={turmas} /></Pagina>} />
        <Route
          path="/simulados/:simuladoId"
          element={
            <CarregaSimulado key="simulado-painel" titulo={(simulado) => simulado.titulo}>
              {(simulado) => <SimuladoPainelScreen simulado={simulado} />}
            </CarregaSimulado>
          }
        />
        <Route
          path="/simulados/:simuladoId/editar"
          element={
            <CarregaSimulado key="simulado-editar" titulo={(simulado) => `Editar ${simulado.titulo}`}>
              {(simulado) => <SimuladoEditarScreen simulado={simulado} turmas={turmas} />}
            </CarregaSimulado>
          }
        />
        <Route
          path="/simulados/:simuladoId/gabarito"
          element={
            <CarregaSimulado key="simulado-gabarito" titulo={(simulado) => `Gabarito de ${simulado.titulo}`}>
              {(simulado) => <GabaritoScreen simulado={simulado} />}
            </CarregaSimulado>
          }
        />
        <Route
          path="/simulados/:simuladoId/alunos/:alunoId/correcao"
          element={
            <CarregaSimulado key="escaneamento">
              {(simulado) => (
                <CarregaAluno simulado={simulado} titulo={(aluno) => `Correção de ${aluno.name}`}>
                  {(aluno) => <EscaneamentoScreen simulado={simulado} aluno={aluno} />}
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
                <CarregaAluno simulado={simulado} titulo={(aluno) => `Boletim de ${aluno.name}`}>
                  {(aluno) => <BoletimScreen simulado={simulado} aluno={aluno} />}
                </CarregaAluno>
              )}
            </CarregaSimulado>
          }
        />

        <Route path={rotas.perfil} element={<Pagina titulo="Perfil"><ProfPerfilScreen /></Pagina>} />
      </Route>

      <Route path="*" element={<NaoEncontradoScreen />} />
    </Routes>
  );
}

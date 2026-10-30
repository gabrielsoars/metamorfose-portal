import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { MobileShell } from '../components/ui.jsx';
import { obterTurma, normalizeTurma } from '../services/turmasService.js';
import { obterUsuario, normalizeUsuario } from '../services/usuariosService.js';
import { obterSimulado, listarAlunosDoSimulado, normalizeAlunoSimulado } from '../services/simuladosService.js';
import { rotas } from './rotas.js';

// As telas de um registro (turma, simulado, aluno, professor) recebem o id pela URL.
// Estes componentes buscam o registro na API e só então renderizam a tela: `children(registro)`.

const ID_VALIDO = /^\d+$/;

function naoEncontrado(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 404;
  return erro;
}

// { registro } quando carregou, { erro } quando falhou e {} enquanto carrega.
function useRegistro(id, carregar) {
  const [estado, setEstado] = useState({ id: null });
  const idValido = ID_VALIDO.test(String(id));

  useEffect(() => {
    if (!idValido) return undefined;
    let isMounted = true;
    carregar(id)
      .then((registro) => {
        if (isMounted) setEstado({ id, registro });
      })
      .catch((erro) => {
        if (isMounted) setEstado({ id, erro });
      });
    return () => {
      isMounted = false;
    };
    // `carregar` é recriada a cada render; o registro só muda quando o id muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, idValido]);

  if (!idValido) return { erro: naoEncontrado('Endereço inválido.') };
  return estado.id === id ? estado : {};
}

function Carregando() {
  return (
    <MobileShell>
      <p className="p-6 text-sm font-semibold text-gray-500 text-center">Carregando...</p>
    </MobileShell>
  );
}

// Registro inexistente: volta para a tela pai (substituindo a entrada do histórico).
function Resultado({ estado, voltarPara, children }) {
  if (estado.erro) return <Navigate to={voltarPara} replace />;
  if (!estado.registro) return <Carregando />;
  return children(estado.registro);
}

export function CarregaTurma({ children }) {
  const { turmaId } = useParams();
  const estado = useRegistro(turmaId, (id) => obterTurma(id).then(normalizeTurma));
  return <Resultado estado={estado} voltarPara={rotas.turmas}>{children}</Resultado>;
}

export function CarregaProfessor({ children }) {
  const { professorId } = useParams();
  const estado = useRegistro(professorId, (id) => obterUsuario(id).then(normalizeUsuario));
  return <Resultado estado={estado} voltarPara={rotas.admin}>{children}</Resultado>;
}

export function CarregaSimulado({ children }) {
  const { simuladoId } = useParams();
  const estado = useRegistro(simuladoId, obterSimulado);
  return <Resultado estado={estado} voltarPara={rotas.simulados}>{children}</Resultado>;
}

// O aluno não tem endpoint próprio no simulado: procura na lista de alunos do simulado,
// o que também confirma que ele pertence a uma das turmas do simulado.
export function CarregaAluno({ simulado, children }) {
  const { alunoId } = useParams();
  const estado = useRegistro(alunoId, (id) =>
    listarAlunosDoSimulado(simulado.id).then((resposta) => {
      const aluno = (resposta?.alunos || []).find((a) => String(a.id) === String(id));
      if (!aluno) throw naoEncontrado('Aluno não encontrado nas turmas deste simulado.');
      return normalizeAlunoSimulado(aluno);
    }),
  );
  return <Resultado estado={estado} voltarPara={rotas.simulado(simulado.id)}>{children}</Resultado>;
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MobileShell } from '../components/ui.jsx';
import { NaoEncontradoScreen } from '../screens/NaoEncontradoScreen.jsx';
import { obterTurma, normalizeTurma } from '../services/turmasService.js';
import { obterUsuario, normalizeUsuario } from '../services/usuariosService.js';
import { obterSimulado, listarAlunosDoSimulado, normalizeAlunoSimulado } from '../services/simuladosService.js';
import { rotas } from './rotas.js';
import { useTitulo } from './titulo.js';

// As telas de um registro (turma, simulado, aluno, professor) recebem o id pela URL.
// Estes componentes buscam o registro na API e só então renderizam a tela: `children(registro)`.
// `titulo(registro)` define o título da aba. Registro inexistente mostra "não encontrado" com link de volta.

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

// `nome` e `inexistente` são o título e a mensagem de "não encontrado"; `oQue` completa a mensagem de erro de rede.
function Resultado({ estado, titulo, nome, inexistente, oQue, voltarPara, voltarTexto, children }) {
  useTitulo(estado.registro && titulo ? titulo(estado.registro) : undefined);

  if (estado.erro) {
    const naoExiste = estado.erro.status === 404;
    return (
      <NaoEncontradoScreen
        titulo={naoExiste ? nome : `Não foi possível carregar ${oQue}`}
        mensagem={naoExiste ? inexistente : estado.erro.message}
        voltarPara={voltarPara}
        voltarTexto={voltarTexto}
      />
    );
  }
  if (!estado.registro) return <Carregando />;
  return children(estado.registro);
}

export function CarregaTurma({ titulo, children }) {
  const { turmaId } = useParams();
  const estado = useRegistro(turmaId, (id) => obterTurma(id).then(normalizeTurma));
  return (
    <Resultado estado={estado} titulo={titulo} nome="Turma não encontrada" inexistente="Esta turma não existe ou foi excluída." oQue="a turma" voltarPara={rotas.turmas} voltarTexto="Voltar para as turmas">
      {children}
    </Resultado>
  );
}

export function CarregaProfessor({ titulo, children }) {
  const { professorId } = useParams();
  const estado = useRegistro(professorId, (id) => obterUsuario(id).then(normalizeUsuario));
  return (
    <Resultado estado={estado} titulo={titulo} nome="Professor não encontrado" inexistente="Este usuário não existe." oQue="o professor" voltarPara={rotas.admin} voltarTexto="Voltar para os usuários">
      {children}
    </Resultado>
  );
}

export function CarregaSimulado({ titulo, children }) {
  const { simuladoId } = useParams();
  const estado = useRegistro(simuladoId, obterSimulado);
  return (
    <Resultado estado={estado} titulo={titulo} nome="Simulado não encontrado" inexistente="Este simulado não existe ou foi excluído." oQue="o simulado" voltarPara={rotas.simulados} voltarTexto="Voltar para os simulados">
      {children}
    </Resultado>
  );
}

// O aluno não tem endpoint próprio no simulado: procura na lista de alunos do simulado,
// o que também confirma que ele pertence a uma das turmas do simulado.
export function CarregaAluno({ simulado, titulo, children }) {
  const { alunoId } = useParams();
  const estado = useRegistro(alunoId, (id) =>
    listarAlunosDoSimulado(simulado.id).then((resposta) => {
      const aluno = (resposta?.alunos || []).find((a) => String(a.id) === String(id));
      if (!aluno) throw naoEncontrado('Aluno não encontrado nas turmas deste simulado.');
      return normalizeAlunoSimulado(aluno);
    }),
  );
  return (
    <Resultado estado={estado} titulo={titulo} nome="Aluno não encontrado" inexistente="Este aluno não está nas turmas deste simulado." oQue="o aluno" voltarPara={rotas.simulado(simulado.id)} voltarTexto="Voltar para o simulado">
      {children}
    </Resultado>
  );
}

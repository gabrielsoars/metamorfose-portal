from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..models.simulado import Simulado, Gabarito, RespostaAluno, simulado_turma
from ..models.turma import Turma
from ..schemas.simulado import SimuladoCreate, GabaritoCreate

def criar_simulado(db: Session, simulado_in: SimuladoCreate, turmas: list[Turma]) -> Simulado:
    novo_simulado = Simulado(
        titulo = simulado_in.titulo,
        data_aplicacao = simulado_in.data_aplicacao,
        total_questoes = simulado_in.total_questoes,
        turmas = turmas
    )

    db.add(novo_simulado)
    db.commit()
    db.refresh(novo_simulado)
    return novo_simulado

def listar_simulado(db: Session) -> list[Simulado]:
    return db.query(Simulado).order_by(Simulado.data_aplicacao).all()

def obter_simulado(db: Session, simulado_id: int) -> Simulado | None:
    return db.query(Simulado).filter(Simulado.id == simulado_id).first()

def atualizar_simulado(
    db: Session,
    simulado: Simulado,
    dados_atualizacao: dict,
    novas_turmas: list[Turma] | None = None
) -> Simulado:
    for campo, valor in dados_atualizacao.items():
        if campo != "turmas_ids":
            setattr(simulado, campo, valor)

    if novas_turmas is not None:
        simulado.turmas = novas_turmas

    db.commit()
    db.refresh(simulado)
    return simulado

def obter_gabarito(db: Session, simulado_id: int) -> list[Gabarito]:
    return (
        db.query(Gabarito)
        .filter(Gabarito.simulado_id == simulado_id)
        .order_by(Gabarito.num_questao)
        .all()
    )

def salvar_gabarito(db: Session, simulado_id: int, itens: list[GabaritoCreate]) -> list[Gabarito]:
    existentes = {
        g.num_questao: g
        for g in db.query(Gabarito).filter(Gabarito.simulado_id == simulado_id).all()
    }

    for item in itens:
        alt = item.alt_correta.upper() if item.alt_correta is not None else None
        if item.num_questao in existentes:
            existente = existentes[item.num_questao]
            # Ao anular sem informar alternativa, a alternativa anterior é preservada
            # para permitir reativar a questão depois.
            if alt is not None:
                existente.alt_correta = alt
            if item.anulada is not None:
                existente.anulada = item.anulada
        else:
            novo_item = Gabarito(
                simulado_id=simulado_id,
                num_questao=item.num_questao,
                alt_correta=alt,
                anulada=bool(item.anulada),
            )
            db.add(novo_item)

    db.commit()
    return obter_gabarito(db, simulado_id)

def _query_alunos_do_simulado(db: Session, simulado_id: int):
    return (
        db.query(Aluno, Turma)
        .join(Turma, Turma.id == Aluno.turma_id)
        .join(simulado_turma, simulado_turma.c.turma_id == Turma.id)
        .filter(simulado_turma.c.simulado_id == simulado_id)
    )

def listar_alunos_do_simulado(db: Session, simulado_id: int) -> list[tuple[Aluno, Turma]]:
    return (
        _query_alunos_do_simulado(db, simulado_id)
        .order_by(Aluno.nome, Aluno.id)
        .all()
    )

def buscar_aluno_do_simulado(db: Session, simulado_id: int, aluno_id: int) -> tuple[Aluno, Turma] | None:
    return (
        _query_alunos_do_simulado(db, simulado_id)
        .filter(Aluno.id == aluno_id)
        .first()
    )

def listar_respostas(
    db: Session,
    simulado_id: int,
    aluno_id: int | None = None
) -> list[RespostaAluno]:
    query = (
        db.query(RespostaAluno)
        .join(Gabarito, Gabarito.id == RespostaAluno.questao_id)
        .filter(Gabarito.simulado_id == simulado_id)
    )
    if aluno_id is not None:
        query = query.filter(RespostaAluno.aluno_id == aluno_id)
    return query.order_by(RespostaAluno.aluno_id, Gabarito.num_questao).all()

def salvar_respostas(db: Session, aluno_id: int, respostas: dict[int, str | None]) -> None:
    """Insere ou atualiza as respostas do aluno. `respostas` mapeia gabarito.id -> alternativa."""
    existentes = {
        r.questao_id: r
        for r in db.query(RespostaAluno).filter(
            RespostaAluno.aluno_id == aluno_id,
            RespostaAluno.questao_id.in_(list(respostas.keys())),
        ).all()
    }

    for questao_id, resposta_marcada in respostas.items():
        if questao_id in existentes:
            existentes[questao_id].resposta_marcada = resposta_marcada
        else:
            db.add(RespostaAluno(
                aluno_id=aluno_id,
                questao_id=questao_id,
                resposta_marcada=resposta_marcada,
            ))

    db.commit()

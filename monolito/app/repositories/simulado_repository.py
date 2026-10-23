from sqlalchemy.orm import Session

from ..models.simulado import Simulado, Gabarito
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
        alt = item.alt_correta.upper()
        if item.num_questao in existentes:
            existentes[item.num_questao].alt_correta = alt
        else:
            novo_item = Gabarito(
                simulado_id=simulado_id,
                num_questao=item.num_questao,
                alt_correta=alt
            )
            db.add(novo_item)

    db.commit()
    return obter_gabarito(db, simulado_id)

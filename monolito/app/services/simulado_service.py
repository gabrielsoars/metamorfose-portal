from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..models.simulado import Simulado, Gabarito
from ..models.turma import Turma
from ..schemas.simulado import (
    SimuladoCreate,
    SimuladoUpdate,
    GabaritoCreate,
    RespostasAlunoUpdate,
    STATUS_CORRIGIDO,
    STATUS_NAO_CORRIGIDO,
)
from ..repositories import simulado_repository, turma_repository

class SimuladoNaoEncontrado(Exception):
    pass

class TurmaNaoEncontrada(Exception):
    pass

class GabaritoInvalido(Exception):
    pass

class AlunoNaoEncontradoNoSimulado(Exception):
    pass

class RespostasInvalidas(Exception):
    pass

def _validar_e_buscar_turmas(db: Session, turmas_ids: list[int]) -> list[Turma]:
    if not turmas_ids:
        return []
    turmas = turma_repository.buscar_turmas_por_ids(db, turmas_ids)
    if len(turmas) != len(set(turmas_ids)):
        encontrados = {t.id for t in turmas}
        faltantes = list(set(turmas_ids) - encontrados)
        raise TurmaNaoEncontrada(faltantes)
    return turmas

def criar_simulado(db: Session, simulado_in: SimuladoCreate) -> Simulado:
    turmas = _validar_e_buscar_turmas(db, simulado_in.turmas_ids)
    return simulado_repository.criar_simulado(db, simulado_in, turmas)

def listar_simulados(db: Session) -> list[Simulado]:
    return simulado_repository.listar_simulado(db)

def obter_simulado(db: Session, simulado_id: int) -> Simulado | None:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    return simulado

def atualizar_simulado(db: Session, simulado_id: int, simulado_in: SimuladoUpdate) -> Simulado:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    dados_atualizacao = simulado_in.model_dump(exclude_unset=True)

    novas_turmas = None
    if "turmas_ids" in dados_atualizacao:
        turmas_ids = dados_atualizacao["turmas_ids"]
        novas_turmas = _validar_e_buscar_turmas(db, turmas_ids) if turmas_ids else []

    return simulado_repository.atualizar_simulado(db, simulado, dados_atualizacao, novas_turmas)

def excluir_simulado(db: Session, simulado_id: int) -> None:
    """Exclui o simulado com gabarito, respostas e vínculos com turmas (alunos e turmas permanecem)."""
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    simulado_repository.excluir_simulado(db, simulado)

def obter_gabarito(db: Session, simulado_id: int) -> list[Gabarito]:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    return simulado_repository.obter_gabarito(db, simulado_id)

def salvar_gabarito(
    db: Session,
    simulado_id: int,
    gabarito_in: list[GabaritoCreate] | GabaritoCreate
) -> list[Gabarito]:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)

    itens = [gabarito_in] if isinstance(gabarito_in, GabaritoCreate) else gabarito_in

    if not itens:
        raise GabaritoInvalido("O gabarito não pode estar vazio.")

    numeros = [item.num_questao for item in itens]
    if len(numeros) != len(set(numeros)):
        raise GabaritoInvalido("Existem números de questões duplicados no gabarito enviado.")

    existentes = {g.num_questao: g for g in simulado_repository.obter_gabarito(db, simulado_id)}

    for item in itens:
        if item.num_questao < 1:
            raise GabaritoInvalido(f"Número de questão inválido: {item.num_questao}. Deve ser >= 1.")
        if simulado.total_questoes and item.num_questao > simulado.total_questoes:
            raise GabaritoInvalido(
                f"Questão {item.num_questao} excede o total de questões do simulado ({simulado.total_questoes})."
            )

        # Estado resultante da questão após aplicar o item enviado
        existente = existentes.get(item.num_questao)
        alt_final = item.alt_correta or (existente.alt_correta if existente else None)
        if item.anulada is not None:
            anulada_final = item.anulada
        else:
            anulada_final = existente.anulada if existente else False

        if not anulada_final and alt_final is None:
            raise GabaritoInvalido(
                f"Questão {item.num_questao}: informe a alternativa correta (A-E) "
                "ou marque a questão como anulada."
            )

    return simulado_repository.salvar_gabarito(db, simulado_id, itens)


def _buscar_simulado(db: Session, simulado_id: int) -> Simulado:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    return simulado

def _total_questoes(simulado: Simulado, gabarito: list[Gabarito]) -> int:
    return simulado.total_questoes or len(gabarito)

def _gabarito_dentro_do_total(simulado: Simulado, gabarito: list[Gabarito]) -> list[Gabarito]:
    """Ignora itens de gabarito acima do total de questões (sobras de quando o total foi reduzido)."""
    if not simulado.total_questoes:
        return gabarito
    return [g for g in gabarito if g.num_questao <= simulado.total_questoes]

def _questao_correta(questao: Gabarito, resposta: str | None) -> bool:
    """Questão anulada conta como acerto para todos; em branco ou sem resposta conta como erro."""
    if questao.anulada:
        return True
    return resposta is not None and resposta == questao.alt_correta

def _contar_acertos(gabarito: list[Gabarito], respostas: dict[int, str | None]) -> int:
    """Acerto derivado do gabarito atual."""
    return sum(1 for g in gabarito if _questao_correta(g, respostas.get(g.id)))

def _formatar_nota(acertos: int, total: int) -> str:
    return f"{acertos}/{total}"

def listar_alunos_do_simulado(db: Session, simulado_id: int) -> dict:
    simulado = _buscar_simulado(db, simulado_id)
    gabarito = _gabarito_dentro_do_total(simulado, simulado_repository.obter_gabarito(db, simulado_id))
    total = _total_questoes(simulado, gabarito)

    respostas_por_aluno: dict[int, dict[int, str | None]] = {}
    for r in simulado_repository.listar_respostas(db, simulado_id):
        respostas_por_aluno.setdefault(r.aluno_id, {})[r.questao_id] = r.resposta_marcada

    alunos = []
    for aluno, turma in simulado_repository.listar_alunos_do_simulado(db, simulado_id):
        respostas = respostas_por_aluno.get(aluno.id)
        corrigido = respostas is not None
        alunos.append({
            "id": aluno.id,
            "nome": aluno.nome,
            "turma_id": turma.id,
            "turma": turma.nome,
            "status": STATUS_CORRIGIDO if corrigido else STATUS_NAO_CORRIGIDO,
            "nota": _formatar_nota(_contar_acertos(gabarito, respostas), total) if corrigido else None,
        })

    return {"total": len(alunos), "alunos": alunos}

def _montar_correcao(db: Session, simulado: Simulado, aluno: Aluno) -> dict:
    gabarito = _gabarito_dentro_do_total(simulado, simulado_repository.obter_gabarito(db, simulado.id))
    total = _total_questoes(simulado, gabarito)
    respostas = {
        r.questao_id: r.resposta_marcada
        for r in simulado_repository.listar_respostas(db, simulado.id, aluno.id)
    }

    correcao = {
        "simulado_id": simulado.id,
        "aluno": aluno,
        "status": STATUS_NAO_CORRIGIDO,
        "acertos": None,
        "total_questoes": total,
        "nota": None,
        "detalhamento": [],
        "avisos": [],
    }
    if not respostas:
        return correcao

    detalhamento, avisos = [], []
    for g in gabarito:
        resposta = respostas.get(g.id)
        if g.anulada:
            avisos.append(f"Questão {g.num_questao}: anulada — contabilizada como acerto.")
        elif resposta is None:
            avisos.append(f"Questão {g.num_questao}: sem resposta marcada — contabilizada como erro.")
        detalhamento.append({
            "questao": g.num_questao,
            "resposta_aluno": resposta,
            "resposta_correta": g.alt_correta,
            "correto": _questao_correta(g, resposta),
            "anulada": g.anulada,
        })

    if len(gabarito) < total:
        avisos.append(
            f"Gabarito incompleto: {len(gabarito)} de {total} questões cadastradas. "
            "Questões sem gabarito são contabilizadas como erro."
        )

    acertos = _contar_acertos(gabarito, respostas)
    correcao.update({
        "status": STATUS_CORRIGIDO,
        "acertos": acertos,
        "nota": _formatar_nota(acertos, total),
        "detalhamento": detalhamento,
        "avisos": avisos,
    })
    return correcao

def _buscar_aluno_do_simulado(db: Session, simulado_id: int, aluno_id: int) -> Aluno:
    resultado = simulado_repository.buscar_aluno_do_simulado(db, simulado_id, aluno_id)
    if resultado is None:
        raise AlunoNaoEncontradoNoSimulado(aluno_id)
    aluno, _turma = resultado
    return aluno

def obter_correcao_aluno(db: Session, simulado_id: int, aluno_id: int) -> dict:
    simulado = _buscar_simulado(db, simulado_id)
    aluno = _buscar_aluno_do_simulado(db, simulado_id, aluno_id)
    return _montar_correcao(db, simulado, aluno)

def salvar_respostas_aluno(
    db: Session,
    simulado_id: int,
    aluno_id: int,
    respostas_in: RespostasAlunoUpdate
) -> dict:
    simulado = _buscar_simulado(db, simulado_id)
    aluno = _buscar_aluno_do_simulado(db, simulado_id, aluno_id)
    itens = respostas_in.respostas

    if not itens:
        raise RespostasInvalidas("A lista de respostas não pode estar vazia.")

    numeros = [item.questao for item in itens]
    if len(numeros) != len(set(numeros)):
        raise RespostasInvalidas("Existem números de questões duplicados nas respostas enviadas.")

    if simulado.total_questoes:
        excedentes = sorted(n for n in numeros if n > simulado.total_questoes)
        if excedentes:
            raise RespostasInvalidas(
                f"Questão(ões) {excedentes} excede(m) o total de questões do simulado ({simulado.total_questoes})."
            )

    gabarito_por_numero = {g.num_questao: g for g in simulado_repository.obter_gabarito(db, simulado_id)}
    sem_gabarito = sorted(n for n in numeros if n not in gabarito_por_numero)
    if sem_gabarito:
        raise RespostasInvalidas(
            f"Questão(ões) {sem_gabarito} sem gabarito cadastrado. "
            "O gabarito oficial deve ser cadastrado antes de registrar as respostas."
        )

    simulado_repository.salvar_respostas(
        db,
        aluno.id,
        {gabarito_por_numero[item.questao].id: item.resposta_marcada for item in itens},
    )
    return _montar_correcao(db, simulado, aluno)

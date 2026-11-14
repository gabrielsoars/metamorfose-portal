"""Estatísticas de desempenho dos simulados (dashboard do professor).

Todas as contas usam as mesmas regras da correção individual (`correcao.py`), para que
os números batam com o boletim: anulada conta como acerto, em branco conta como erro,
e só entram alunos corrigidos (com ao menos uma resposta salva) das turmas do simulado.
"""
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from ..models.simulado import Simulado
from ..repositories import simulado_repository
from .correcao import contar_acertos, gabarito_dentro_do_total, questao_correta, total_questoes
from .simulado_service import SimuladoNaoEncontrado


class TurmaNaoVinculada(Exception):
    pass


CASAS_DECIMAIS = 1


def _arredondar(valor: float | None) -> float | None:
    return None if valor is None else round(valor, CASAS_DECIMAIS)


def _media(valores: list[float]) -> float | None:
    return sum(valores) / len(valores) if valores else None


def _percentuais_dos_alunos(db: Session, simulado: Simulado, turma_id: int | None = None) -> list[float]:
    """Percentual de acerto (0-100) de cada aluno corrigido do simulado (da turma, se informada)."""
    gabarito = gabarito_dentro_do_total(simulado, simulado_repository.obter_gabarito(db, simulado.id))
    total = total_questoes(simulado, gabarito)
    if total <= 0:
        return []

    respostas_por_aluno: dict[int, dict[int, str | None]] = {}
    for r in simulado_repository.listar_respostas(db, simulado.id):
        respostas_por_aluno.setdefault(r.aluno_id, {})[r.questao_id] = r.resposta_marcada

    percentuais = []
    for aluno, _turma in simulado_repository.listar_alunos_do_simulado(db, simulado.id, turma_id):
        respostas = respostas_por_aluno.get(aluno.id)
        if respostas is None:
            continue
        percentuais.append(contar_acertos(gabarito, respostas) / total * 100)
    return percentuais


def _buscar_simulado(db: Session, simulado_id: int, turma_id: int | None) -> Simulado:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    if turma_id is not None and turma_id not in {t.id for t in simulado.turmas}:
        raise TurmaNaoVinculada(turma_id)
    return simulado


def resumo_simulado(db: Session, simulado_id: int, turma_id: int | None = None) -> dict:
    simulado = _buscar_simulado(db, simulado_id, turma_id)
    percentuais = _percentuais_dos_alunos(db, simulado, turma_id)
    media = _media(percentuais)

    # Anterior = o simulado mais recente antes deste (da mesma turma) que já tenha correções.
    anterior, media_anterior = None, None
    for candidato in simulado_repository.listar_simulados_anteriores(db, simulado, turma_id):
        media_anterior = _media(_percentuais_dos_alunos(db, candidato, turma_id))
        if media_anterior is not None:
            anterior = {
                "simulado_id": candidato.id,
                "titulo": candidato.titulo,
                "media_percentual": _arredondar(media_anterior),
            }
            break

    variacao = media - media_anterior if media is not None and anterior is not None else None
    return {
        "simulado_id": simulado.id,
        "turma_id": turma_id,
        "corrigidos": len(percentuais),
        "media_percentual": _arredondar(media),
        "anterior": anterior,
        "variacao_pp": _arredondar(variacao),
    }


def historico_mensal(
    db: Session,
    turma_id: int | None = None,
    meses: int = 6,
) -> dict:
    """Agrega os percentuais dos alunos corrigidos por mês (`YYYY-MM` de `data_aplicacao`).

    Apenas simulados que tenham pelo menos 1 prova corrigida (na turma filtrada, se houver)
    entram na agregação. Retorna até os últimos `meses` meses com dados, em ordem cronológica.
    """
    por_mes: dict[str, dict[str, list[float] | int]] = {}
    for simulado in simulado_repository.listar_simulado(db, turma_id):
        percentuais = _percentuais_dos_alunos(db, simulado, turma_id)
        if not percentuais:
            continue
        chave_mes = simulado.data_aplicacao.strftime("%Y-%m")
        item = por_mes.setdefault(chave_mes, {"percentuais": [], "simulados": 0})
        item["percentuais"].extend(percentuais)
        item["simulados"] += 1

    chaves_ordenadas = sorted(por_mes.keys())
    if meses and meses > 0:
        chaves_ordenadas = chaves_ordenadas[-meses:]

    pontos = []
    for mes in chaves_ordenadas:
        item = por_mes[mes]
        percentuais = item["percentuais"]
        pontos.append({
            "mes": mes,
            "media_percentual": _arredondar(_media(percentuais)),
            "simulados": item["simulados"],
            "corrigidos": len(percentuais),
        })

    return {"turma_id": turma_id, "pontos": pontos}


def questoes_erro_simulado(
    db: Session,
    simulado_id: int,
    turma_id: int | None = None,
    limite: int | None = None,
) -> dict:
    """Calcula o índice de erro por questão de um simulado.

    Ignora questões anuladas e questões acima de `total_questoes`.
    Ordena por percentual de erro decrescente (comparação exata `erros/total`),
    desempatando por `total` decrescente e `num_questao` crescente.
    """
    simulado = _buscar_simulado(db, simulado_id, turma_id)
    gabarito = [
        g for g in gabarito_dentro_do_total(simulado, simulado_repository.obter_gabarito(db, simulado.id))
        if not g.anulada
    ]

    respostas_por_aluno: dict[int, dict[int, str | None]] = {}
    for r in simulado_repository.listar_respostas(db, simulado.id):
        respostas_por_aluno.setdefault(r.aluno_id, {})[r.questao_id] = r.resposta_marcada

    alunos_corrigidos = [
        respostas_por_aluno[aluno.id]
        for aluno, _turma in simulado_repository.listar_alunos_do_simulado(db, simulado.id, turma_id)
        if aluno.id in respostas_por_aluno
    ]
    total_corrigidos = len(alunos_corrigidos)
    if total_corrigidos == 0 or not gabarito:
        return {
            "simulado_id": simulado.id,
            "turma_id": turma_id,
            "corrigidos": total_corrigidos,
            "questoes": [],
        }

    questoes = []
    for g in gabarito:
        erros = sum(1 for resp in alunos_corrigidos if not questao_correta(g, resp.get(g.id)))
        pct = int((Decimal(erros * 100) / Decimal(total_corrigidos)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        questoes.append({
            "questao": g.num_questao,
            "erros": erros,
            "total": total_corrigidos,
            "pct": pct,
        })

    questoes.sort(key=lambda item: (-item["erros"] / item["total"], -item["total"], item["questao"]))
    if limite is not None and limite > 0:
        questoes = questoes[:limite]

    return {
        "simulado_id": simulado.id,
        "turma_id": turma_id,
        "corrigidos": total_corrigidos,
        "questoes": questoes,
    }




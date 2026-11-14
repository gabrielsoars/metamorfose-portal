"""Regras de correção compartilhadas entre a correção individual e as estatísticas.

O acerto não é persistido: ele é sempre derivado do gabarito atual, de forma que
editar o gabarito recalcula notas, médias e índices de erro.
"""
from ..models.simulado import Simulado, Gabarito


def total_questoes(simulado: Simulado, gabarito: list[Gabarito]) -> int:
    return simulado.total_questoes or len(gabarito)


def gabarito_dentro_do_total(simulado: Simulado, gabarito: list[Gabarito]) -> list[Gabarito]:
    """Ignora itens de gabarito acima do total de questões (sobras de quando o total foi reduzido)."""
    if not simulado.total_questoes:
        return gabarito
    return [g for g in gabarito if g.num_questao <= simulado.total_questoes]


def questao_correta(questao: Gabarito, resposta: str | None) -> bool:
    """Questão anulada conta como acerto para todos; em branco ou sem resposta conta como erro."""
    if questao.anulada:
        return True
    return resposta is not None and resposta == questao.alt_correta


def contar_acertos(gabarito: list[Gabarito], respostas: dict[int, str | None]) -> int:
    """Acerto derivado do gabarito atual. `respostas` mapeia gabarito.id -> alternativa."""
    return sum(1 for g in gabarito if questao_correta(g, respostas.get(g.id)))


"""Popula o banco com turmas, simulados e correções de demonstração para o dashboard do professor.

Uso (de dentro de `monolito/`, ou no contêiner):
    docker compose exec monolito python -m scripts.seed_dashboard            # recria os dados demo
    docker compose exec monolito python -m scripts.seed_dashboard --limpar   # só apaga os dados demo

Tudo que o script cria tem o prefixo "[Demo]" no nome; rodar de novo apaga e recria só esses dados.
Os sorteios usam uma semente fixa, então os números são sempre os mesmos.
"""
import argparse
import random
from datetime import date

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import aluno as _aluno, simulado as _simulado, turma as _turma, usuario as _usuario  # noqa: F401  (registra as tabelas)
from app.models.aluno import Aluno
from app.models.simulado import Gabarito, RespostaAluno, Simulado
from app.models.turma import Turma
from app.repositories import simulado_repository

PREFIXO = "[Demo]"
SEMENTE = 42
TOTAL_QUESTOES = 20
ALTERNATIVAS = "ABCDE"

NOMES = [
    "Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha", "Eduarda Melo", "Felipe Nunes",
    "Gabriela Reis", "Henrique Alves", "Isabela Castro", "João Pedro Silva", "Larissa Gomes",
    "Mateus Barros", "Natália Freitas", "Otávio Pires", "Paula Mendes", "Rafael Cardoso",
    "Sofia Ribeiro", "Thiago Moreira", "Valentina Costa", "Yuri Teixeira", "Beatriz Lopes",
    "Caio Martins", "Daniela Azevedo", "Enzo Carvalho",
]

TURMAS = [
    # nome, turno, quantidade de alunos, ajuste de habilidade da turma
    (f"{PREFIXO} 3º Ano A", "Manhã", 12, 0.05),
    (f"{PREFIXO} 3º Ano B", "Noite", 12, -0.05),
]

SIMULADOS = [
    # título, data, índices das turmas, progresso (soma à chance de acerto), fração de alunos corrigidos
    ("Diagnóstico", date(2026, 6, 15), [0, 1], 0.00, 1.0),
    ("1º Simulado ENEM", date(2026, 7, 20), [0, 1], 0.04, 1.0),
    ("2º Simulado ENEM", date(2026, 8, 24), [0, 1], 0.02, 1.0),
    ("Simulado Extra - Turma A", date(2026, 9, 14), [0], 0.08, 1.0),
    ("3º Simulado ENEM", date(2026, 9, 28), [0, 1], 0.09, 1.0),
    ("4º Simulado ENEM", date(2026, 10, 26), [0, 1], 0.12, 1.0),
    ("5º Simulado ENEM", date(2026, 11, 5), [0, 1], 0.16, 0.75),  # correção ainda em andamento
]


def limpar(db) -> None:
    for simulado in db.query(Simulado).filter(Simulado.titulo.startswith(PREFIXO)).all():
        simulado_repository.excluir_simulado(db, simulado)

    turmas = db.query(Turma).filter(Turma.nome.startswith(PREFIXO)).all()
    ids_alunos = [a.id for a in db.query(Aluno).filter(Aluno.turma_id.in_([t.id for t in turmas])).all()]
    if ids_alunos:
        db.query(RespostaAluno).filter(RespostaAluno.aluno_id.in_(ids_alunos)).delete(synchronize_session=False)
        db.query(Aluno).filter(Aluno.id.in_(ids_alunos)).delete(synchronize_session=False)
    for turma in turmas:
        db.delete(turma)  # remove também os vínculos simulado_turma
    db.commit()


def popular(db, rng: random.Random) -> None:
    turmas, alunos_por_turma = [], []
    nomes = iter(NOMES)
    for nome, turno, quantidade, ajuste in TURMAS:
        turma = Turma(nome=nome, ano=2026, turno=turno)
        db.add(turma)
        db.flush()
        alunos = []
        for _ in range(quantidade):
            aluno = Aluno(nome=next(nomes), turma_id=turma.id)
            db.add(aluno)
            alunos.append((aluno, rng.uniform(0.35, 0.75) + ajuste))  # habilidade individual
        turmas.append(turma)
        alunos_por_turma.append(alunos)
    db.flush()

    for i, (titulo, data, idx_turmas, progresso, fracao_corrigida) in enumerate(SIMULADOS):
        simulado = Simulado(
            titulo=f"{PREFIXO} {titulo}",
            data_aplicacao=data,
            total_questoes=TOTAL_QUESTOES,
            turmas=[turmas[t] for t in idx_turmas],
        )
        db.add(simulado)
        db.flush()

        # Algumas questões bem difíceis para o card "Questões mais erradas" ter destaque.
        gabarito = []
        for num in range(1, TOTAL_QUESTOES + 1):
            questao = Gabarito(
                simulado_id=simulado.id,
                num_questao=num,
                alt_correta=rng.choice(ALTERNATIVAS),
                anulada=(i == 2 and num == 13),  # uma questão anulada no 2º simulado
            )
            db.add(questao)
            gabarito.append((questao, rng.choice([-0.35, -0.2, 0.0, 0.0, 0.1, 0.15])))
        db.flush()

        for t in idx_turmas:
            alunos = alunos_por_turma[t]
            corrigidos = alunos[: round(len(alunos) * fracao_corrigida)]
            for aluno, habilidade in corrigidos:
                for questao, facilidade in gabarito:
                    chance = min(0.97, max(0.05, habilidade + progresso + facilidade))
                    if rng.random() < 0.03:
                        marcada = None  # em branco
                    elif rng.random() < chance:
                        marcada = questao.alt_correta
                    else:
                        marcada = rng.choice([a for a in ALTERNATIVAS if a != questao.alt_correta])
                    db.add(RespostaAluno(aluno_id=aluno.id, questao_id=questao.id, resposta_marcada=marcada))
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limpar", action="store_true", help="só apaga os dados demo, sem recriar")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        limpar(db)
        if args.limpar:
            print("Dados demo apagados.")
            return
        popular(db, random.Random(SEMENTE))
        print(f"Dados demo criados: {len(TURMAS)} turmas e {len(SIMULADOS)} simulados com prefixo '{PREFIXO}'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()


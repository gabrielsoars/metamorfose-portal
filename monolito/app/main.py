from contextlib import asynccontextmanager
from fastapi import FastAPI

from .routers import alunos, turmas
from .db.base import Base
from .db.session import engine

from .models import aluno, turma

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="API do Sistema Acadêmico", lifespan=lifespan)

app.include_router(turmas.router)
app.include_router(alunos.router)


@app.get("/")
def ler_raiz():
    return {"status": "Monolito online!"}
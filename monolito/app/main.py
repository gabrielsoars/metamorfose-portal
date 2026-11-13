from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import alunos, auth, turmas, usuarios, simulados, estatisticas
from .db.base import Base
from .db.session import engine, SessionLocal
from .core.config import get_settings
from .core.dependencias import exigir_admin, obter_usuario_atual
from .services import usuario_service

from .models import aluno, turma, usuario, simulado

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    with SessionLocal() as db:
        usuario_service.garantir_admin_inicial(db, settings.admin_email, settings.admin_nome)
    yield

app = FastAPI(title="API do Sistema Acadêmico", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tudo exige login; a gestão de usuários é só para admin. As rotas de /auth são públicas.
app.include_router(turmas.router, dependencies=[Depends(obter_usuario_atual)])
app.include_router(alunos.router, dependencies=[Depends(obter_usuario_atual)])
app.include_router(usuarios.router, dependencies=[Depends(exigir_admin)])
app.include_router(simulados.router, dependencies=[Depends(obter_usuario_atual)])
app.include_router(estatisticas.router, dependencies=[Depends(obter_usuario_atual)])
app.include_router(auth.router)


@app.get("/")
def ler_raiz():
    return {"status": "Monolito online!"}
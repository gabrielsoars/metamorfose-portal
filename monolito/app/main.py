from fastapi import FastAPI

from .routers import alunos, turmas

app = FastAPI(title="API do Sistema Acadêmico")

app.include_router(turmas.router)
app.include_router(alunos.router)


@app.get("/")
def ler_raiz():
    return {"status": "Monolito online!"}
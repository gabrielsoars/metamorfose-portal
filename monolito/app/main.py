from fastapi import FastAPI
import os

app = FastAPI(title="API do Sistema Acadêmico")

@app.get("/")
def ler_raiz():
    # Apenas para ilustrar como pegaremos os dados do banco no futuro
    db_host = os.getenv("DB_HOST", "localhost")
    return {
        "status": "Monolito online!", 
        "mensagem": "Pronto para receber dados do portal do professor.",
        "conectando_em": db_host
    }
# Sistema de Correção Automatizada - Metamorfose
## Executando a aplicação localmente

1. Clone o repositório para o seu computador:

   ```bash
   git clone [https://github.com/SEU_USUARIO/NOME_DO_REPO.git](https://github.com/SEU_USUARIO/NOME_DO_REPO.git)
   
   cd NOME_DO_REPO
   ```
2. Configure as variáveis de ambiente:
   * Copie o arquivo de exemplo ```.env.example``` e renomeie-o para ```.env```:
      
      ```bash
      cp .env.example .env
      ```
   * Abra o arquivo .env recém-criado e preencha com as senhas e credenciais desejadas.
3. Suba todos os serviços usando o Docker Compose:

   ```bash
   docker compose up -d --build
   ```

## Onde acessar os serviços
Com os contêineres rodando, você pode acessar os seguintes componentes nos respectivos endereços locais:
* Frontend (React): ```http://localhost:5173```
* Monolito API (FastAPI): ```http://localhost:8000/docs```
* Serviço de Scan (OpenCV API): ```http://localhost:8001/docs```
* Banco de Dados (PostgreSQL): ```localhost:5432```

## Como parar a aplicação
Para encerrar os contêineres mantendo os dados salvos:
   ```bash
   docker compose down
   ```

Para encerrar e limpar completamente os dados do banco (resetando o volume):

```bash
docker compose down -v
```

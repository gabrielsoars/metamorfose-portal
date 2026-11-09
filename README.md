# Sistema de Correção Automatizada - Metamorfose
## Executando a aplicação localmente

1. Clone o repositório para o seu computador:

   ```bash
   git clone https://github.com/gabrielsoars/metamorfose-portal.git
   
   cd NOME_DO_REPO
   ```
2. Configure as variáveis de ambiente:
   * Copie o arquivo de exemplo ```.env.example``` e renomeie-o para ```.env```:
      
      ```bash
      cp .env.example .env
      ```
   * Abra o arquivo .env recém-criado e preencha com as senhas e credenciais desejadas.
3. Gere o par de chaves RSA usado na autenticação JWT (a pasta `keys/` não é versionada):

   ```bash
   mkdir -p keys
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/jwt_private.pem
   openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pem
   ```
   Use um par diferente em cada ambiente (desenvolvimento, homologação e produção).
4. Suba todos os serviços usando o Docker Compose:

   ```bash
   docker compose up -d --build
   ```

## Onde acessar os serviços
Com os contêineres rodando, você pode acessar os seguintes componentes nos respectivos endereços locais:
* Frontend (React): ```http://localhost:5173```
* Monolito API (FastAPI): ```http://localhost:8000/docs```
* Serviço de Scan (OpenCV API): ```http://localhost:8001/docs```
* Banco de Dados (PostgreSQL): ```localhost:5432```

## Autenticação

0. Ao subir pela primeira vez, se não existir nenhum admin, o monolito cria o admin definido em `ADMIN_EMAIL`/`ADMIN_NOME` (no `.env`) e envia a ele o código de primeiro acesso. O admin ativa a conta pelo mesmo fluxo do professor (passo 2).
1. O admin cadastra o professor (`POST /usuarios`) e o monolito envia um código de 6 dígitos por e-mail. Sem `SMTP_HOST`, em `APP_ENV=development`, o código aparece no log do monolito.
2. No primeiro acesso o professor define a senha: `POST /auth/ativar` com `email`, `codigo` e `senha`. Para gerar um novo código, use `POST /auth/reenviar-ativacao`.
3. O login (`POST /auth/login`) retorna um JWT assinado com RS256 pela chave privada do monolito.
4. O scan_service valida o token localmente com a chave pública, sem consultar o monolito nem o banco. `POST /processar` e `POST /processar/debug` exigem o header `Authorization: Bearer <token>`. `GET /health` é público.

`JWT_ALGORITHM`, `JWT_ISSUER` e `JWT_AUDIENCE` vêm do `.env` e são os mesmos nos dois serviços.

## Testes

```bash
(cd monolito && pytest)
(cd scan_service && pytest)
```

## Como parar a aplicação
Para encerrar os contêineres mantendo os dados salvos:
   ```bash
   docker compose down
   ```

Para encerrar e limpar completamente os dados do banco (resetando o volume):

```bash
docker compose down -v
```

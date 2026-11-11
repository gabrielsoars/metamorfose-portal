# Backlog do Frontend (versão demo / TCC)

Objetivo: o fluxo abaixo rodar de ponta a ponta numa demo. Nada além disso.

**Fluxo da demo**

1. Admin cadastra um professor (já funciona)
2. Professor cria uma turma e adiciona alunos
3. Professor cria um simulado e cadastra o gabarito oficial
4. Professor envia a foto de um gabarito preenchido e o sistema lê as respostas
5. O sistema mostra a nota

Tamanho: S (≤ meio dia) · M (1–2 dias)

> **Situação em 2026-11-10:** a fase 1 (D-01 a D-08) está concluída, e o fluxo da demo funciona de ponta a ponta com login.
> Depois dela, o projeto seguiu com as tasks P-xx do Igor e a autenticação JWT do Eduardo. As P-xx incluem layout desktop, react-router, boletim e ranking, e edição e exclusão. Essas tasks **não estão neste arquivo**.
> As tasks abertas estão na seção **Fase 2**. A seção **Histórico** descreve o código como ele era na fase 1 e não deve ser usada como referência do código atual.

## Fase 2: tasks abertas

| ID   | Task                                                          | Tam. | Branch                           | Status  |
| ---- | ------------------------------------------------------------- | ---- | -------------------------------- | ------- |
| D-10 | Tirar o botão de notificações do dashboard                    | S    | `feat/d10-remover-notificacoes`  | A fazer |
| D-09 | Aviso de erro no canto da tela, no lugar do `window.alert`    | M    | `feat/d09-aviso-erro`            | A fazer |
| D-11 | Mostrar o professor logado no lugar de "Prof. Pedro" fixo     | S    | `feat/d11-professor-logado`      | A fazer |

As três são independentes e podem ser feitas em qualquer ordem. A D-10 é a mais rápida. A D-10 e a D-11 mexem no mesmo cabeçalho do dashboard: se forem feitas em paralelo, o segundo PR pode ter um conflito pequeno, fácil de resolver.

### Antes de começar: ambiente local

O projeto agora exige autenticação. Para rodar localmente:

1. **Chaves JWT:** gere `keys/jwt_private.pem` e `keys/jwt_public.pem` como mostra o `README.md`. Sem elas, o `docker compose up` falha.
2. **Admin inicial:** no `.env`, defina `ADMIN_EMAIL` e `ADMIN_NOME`.
   - O e-mail **não pode usar domínio reservado**, como `.local`, `.test` ou `.example`. A validação rejeita esses domínios, e o monolito entra em loop de reinício sem subir.
   - Sem SMTP configurado, o código de ativação aparece no log: `docker compose logs monolito | grep "Código de"`.
   - Ative a conta pela tela de ativação ou por `POST /auth/ativar`.
3. **Banco criado antes do PR #13:** o projeto não tem migrations, e o `create_all` cria tabelas novas mas não adiciona colunas a tabelas que já existem. Num banco antigo, criar um simulado dá erro 500, porque falta a coluna `gabarito.anulada`. Há duas saídas:
   - adicionar a coluna, sem perder dados:
     `docker compose exec -T application_db psql -U postgres -d <POSTGRES_DB> -c "ALTER TABLE gabarito ADD COLUMN anulada BOOLEAN NOT NULL DEFAULT false"`
   - ou recriar o banco do zero com `docker compose down -v`, que **apaga todos os dados**.

### Regras para quem executar as tasks da fase 2

- **Mudança mínima.** O projeto é um TCC e só precisa funcionar na demo. Não refatore nem adicione bibliotecas.
- **O código mudou desde a fase 1.**
  - A navegação usa **react-router**: as rotas ficam em `frontend/src/routes/rotas.js`, e as telas usam `useNavigate`.
  - A sessão fica em `frontend/src/routes/sessao.jsx`.
  - Os services continuam usando `requestJson` de `services/api.js`, que já envia o token.
- **O projeto tem testes.** Se a mudança alterar um comportamento que algum teste verifica, atualize esse teste.
- **Ao terminar:** rode `npm test` e `npm run lint` dentro de `frontend/`, e teste a mudança no navegador com a stack rodando.

### D-10 · Tirar o botão de notificações

**Problema:** o cabeçalho do dashboard do professor tem um botão de sino com uma bolinha laranja. Ele não faz nada, porque o sistema não tem notificações. Na demo, isso sugere uma funcionalidade que não existe.

**O que fazer** em `frontend/src/screens/professor/ProfDashboardScreen.jsx`:

1. Remover o `<button aria-label="Notificações">`, junto com o `<span>` da bolinha que fica dentro dele.
2. Remover `Bell` do import do `lucide-react`.
3. Manter o botão "Sair" e conferir que o cabeçalho continua alinhado no celular e no desktop. O botão "Sair" passa a ficar sozinho na `div` com `gap-2`.

Hoje o sino só existe nessa tela. Antes de terminar, confirme com `grep -rn "Bell\|Notifica" frontend/src`.

**Aceite:**

- O dashboard não tem mais o sino, nem no celular nem no desktop.
- O botão "Sair" continua funcionando.
- `npm test` e `npm run lint` passam.

### D-09 · Aviso de erro no canto da tela

**Problema:** os erros aparecem com `window.alert`. É a janela nativa do navegador: bloqueia a tela, não segue o visual do app e exige um clique para fechar. Hoje há **27 chamadas em 13 arquivos**. Para listar: `grep -rn "window.alert" frontend/src --include=*.jsx | grep -v test`.

**Objetivo:** mostrar os erros num aviso pequeno no canto da tela, que some sozinho.

**Abordagem:**

1. **Criar o aviso** em `frontend/src/components/Avisos.jsx`:
   - Uma função `mostrarErro(mensagem)` que pode ser chamada de qualquer lugar, como o `window.alert` é hoje.
   - Um componente `<Avisos />` que exibe os avisos pendentes.
   - A ligação entre os dois deve ser um estado simples **no próprio módulo**: uma lista de avisos mais os componentes inscritos para ouvir mudanças.
   - **Não use Context.** Várias telas são testadas isoladamente, sem providers (ex.: `SimuladoEditarScreen.test.jsx`), e um hook que exige provider quebraria esses testes.
2. **Montar `<Avisos />` uma única vez** no `App.jsx`, dentro do `SessaoProvider` e fora das `<Routes>`, para que ele apareça em todas as telas, inclusive no login.
3. **Visual:**
   - Posição `fixed`.
   - No desktop (`md:`), no canto inferior direito.
   - No celular, embaixo e centralizado, **acima da barra de navegação inferior** (o `BottomNav` do `AppShell.jsx`).
   - Cartão branco com borda ou ícone vermelho (ex.: `AlertCircle` do `lucide-react`), com o texto do erro e um botão de fechar (`aria-label="Fechar aviso"`).
   - Some sozinho depois de cerca de 5 segundos.
   - Vários avisos empilham, no máximo 3. Quando chega um quarto, o mais antigo sai.
   - O `z-index` precisa ficar acima de todas as camadas atuais: `AppShell` usa `z-30`, o `Sheet` do `ui.jsx` usa `z-40` e o `ConfirmDialog` usa `z-50`. Use, por exemplo, `z-[60]`.
4. **Trocar todas as chamadas** de `window.alert(...)` por `mostrarErro(...)`, mantendo a mesma mensagem. Isso inclui as mensagens de validação, como "Preencha o título...", e o `components/ImagePicker.jsx`.
5. **Acessibilidade:**
   - Use `role="status"` no aviso, **não** `role="alert"`.
   - Motivo: as telas de autenticação já mostram erros inline com `role="alert"` (`screens/auth/FormCodigoSenha.jsx`), e `routes/Autenticacao.test.jsx` procura por `findByRole('alert')`. Dois elementos com esse papel quebrariam esse teste.
6. **Testes:**
   - Atualizar os testes que fazem `vi.spyOn(window, 'alert')`. Para listar: `grep -rln "window, 'alert'" frontend/src`. Em vez de verificar o `alert`, eles passam a verificar que o texto do erro aparece na tela.
   - Testes que renderizam uma tela isolada precisam renderizar `<Avisos />` junto.
   - Criar um teste curto para o `Avisos` cobrindo três casos: o aviso aparece, fecha no X e some sozinho (com `vi.useFakeTimers()`).

**Fora do escopo:**

- Avisos de sucesso.
- O `ConfirmDialog`: as confirmações, como "Excluir?", continuam como estão.
- Os erros inline que já existem nas telas de login e ativação.

**Aceite:**

- `grep -rn "window.alert" frontend/src --include=*.jsx | grep -v test` não encontra nada.
- Com o monolito parado (`docker compose stop monolito`), abrir a lista de simulados mostra o aviso no canto. Ele some sozinho e também fecha no X.
- O aviso aparece por cima de modais abertos, como a edição de aluno.
- `npm test` e `npm run lint` passam.

### D-11 · Mostrar o professor logado

**Problema:** o nome, o e-mail e a disciplina do professor estão fixos no código. Qualquer professor que entra vê "Olá, Prof. Pedro". Na demo, isso aparece logo na primeira tela.

**Onde está fixo** (para conferir: `grep -rn "Pedro\|>P<" frontend/src --include=*.jsx | grep -v test`):

| Arquivo | O que está fixo |
| --- | --- |
| `screens/professor/ProfDashboardScreen.jsx` | Título "Olá, Prof. Pedro" e a inicial "P" no avatar |
| `screens/professor/ProfPerfilScreen.jsx` | "Prof. Pedro", "pedro@unesp.br" e "Professor • Matemática" |
| `screens/professor/TurmasScreen.jsx` | Inicial "P" no avatar do cabeçalho |
| `screens/simulados/SimuladosListaScreen.jsx` | Inicial "P" no avatar do cabeçalho |

**De onde vem o usuário:** a sessão guarda o usuário logado (`{ id, nome, email, materia, tipo }`), que vem de `GET /auth/me` no login.

- Use `useSessao()` de `routes/sessao.jsx`.
- Algumas telas são testadas sem o `SessaoProvider`, e nesse caso `useSessao()` retorna `null`. Para essas telas não quebrarem, leia o usuário com fallback para o storage:
  `const usuario = useSessao()?.sessao?.usuario ?? lerSessao()?.usuario;` (`lerSessao` vem de `services/sessao.js`).

**O que fazer:**

1. **Dashboard:** "Olá, Prof. {primeiro nome}". O primeiro nome é `usuario.nome.split(' ')[0]`. O avatar mostra a primeira letra do nome, em maiúscula.
2. **Perfil:** "Prof. {nome completo}", `usuario.email`, e "Professor • {usuario.materia}". Se não houver matéria, mostre só "Professor".
3. **Avatares de turmas e simulados:** a mesma inicial do nome.
4. **Sem usuário na sessão** (não deveria acontecer, porque as rotas são privadas): use "Professor" como nome e "P" como inicial, em vez de quebrar a tela.
5. Para não repetir a lógica nas 4 telas, crie um helper pequeno, por exemplo `useUsuarioLogado()` em `routes/sessao.jsx`, que devolve `{ nome, primeiroNome, inicial, email, materia }`.

**Testes:**

- O usuário de teste `PROFESSOR` em `src/test/sessao.js` se chama "Pedro". Por isso os testes que procuram "Olá, Prof. Pedro" devem continuar passando, se a sessão de teste for esse usuário.
- Rode a suíte inteira e ajuste o que quebrar. Atenção aos testes de login em `routes/Autenticacao.test.jsx`: neles, o usuário vem do mock de `/auth/me`, e o nome desse mock é o que vai aparecer na tela.
- Adicione um teste com um professor de outro nome (ex.: "Maria Souza") que verifique "Olá, Prof. Maria" e a inicial "M".

**Fora do escopo:** editar o perfil, foto de perfil, e o cabeçalho das telas de admin.

**Aceite:**

- Logado como `professor@metamorfose.com` ("Professor Demo"), o dashboard mostra "Olá, Prof. Professor" e o perfil mostra o nome, o e-mail e a matéria desse usuário.
- `grep -rn "Pedro" frontend/src --include=*.jsx | grep -v test` não encontra nada.
- `npm test` e `npm run lint` passam.

---

## Histórico: Fase 1 (concluída)

> Tudo abaixo descreve o código **como ele era em 28/10/2026**: navegação sem router, nota não salva e login só visual. Mantido só como registro.

### Tasks

| ID   | Task                                                                | Tam. | Branch                          | Status                   |
| ---- | ------------------------------------------------------------------- | ---- | ------------------------------- | ------------------------ |
| D-01 | Subir a stack (`docker compose up`) e rodar `npm test`              | S    | — (não gerou código)            | ✅ Feita em 2026-10-28    |
| D-08 | Manter a tela atual ao dar refresh (hoje volta para o login)        | S    | `feat/d08-refresh-mantem-tela`  | ✅ Mergeada (PR #8), depois substituída pelo react-router (P-14) |
| D-02 | Registrar router e modelo de simulados no `monolito/app/main.py`    | S    | `fix/d02-registrar-simulados`   | ✅ Mergeada (PR #9)       |
| D-03 | Cadastro de turma salvando na API                                   | S    | `feat/d03-cadastro-turma`       | ✅ Mergeada (PR #10)      |
| D-04 | `simuladosService.js` + lista e criação de simulado integradas      | M    | `feat/d04-simulados`            | ✅ Mergeada (PR #11)      |
| D-05 | Cadastro do gabarito oficial (`PUT /simulados/{id}/gabarito`)       | M    | `feat/d05-gabarito-oficial`     | ✅ Mergeada (PR #15)      |
| D-06 | Escaneamento: enviar imagem ao `scan_service` e exibir as respostas | M    | `feat/d06-escaneamento`         | ✅ Mergeada (PR #16)      |
| D-07 | Calcular e mostrar a nota (respostas lidas × gabarito oficial)      | S    | `feat/d07-nota`                 | ✅ Mergeada (PR #17)      |

Ordem: D-01 → D-08 → D-02 → D-03 → D-04 → D-05 → D-06 → D-07 (a tabela já está nessa ordem).

**Branches:** uma por task, todas criadas a partir da `main`. As tasks dependem umas das outras (ex.: D-04 usa o mecanismo da D-08 e precisa da D-02), então, antes de começar uma task, atualize a branch dela com a `main` (`git merge main`) depois que as tasks anteriores forem mergeadas.

### Decisões assumidas (corrija se não servir)

- **Foto:** upload de arquivo de imagem, sem câmera. É mais simples e basta para demonstrar.
- **Nota:** calculada no frontend e **não salva**. Salvar exigiria criar um modelo e endpoints de resultado no backend.
- **Chamada ao scan:** o frontend chama `http://localhost:8001/processar` direto (o CORS do scan já é `*`), com a URL configurável por `VITE_SCAN_URL`.
- **Login:** continua só visual (os botões já levam às telas). Sem autenticação real.
- **Fallbacks:** ficam como estão. Cuidado: se a API falhar, a tela mostra dados falsos e parece que funcionou. Ao testar, confira se o registro foi para o banco.

---

### Regras para quem executar as tasks

Valem para todas as tasks abaixo.

- **Mudança mínima.** O projeto é um TCC e só precisa rodar na demo. Não refatore, não troque o visual, não adicione bibliotecas, não crie abstrações "para o futuro".
- **Siga o padrão existente.** Services ficam em `frontend/src/services/` e usam `requestJson` de `api.js` (exceto o upload de imagem, ver D-06). Telas ficam em `frontend/src/screens/`. Componentes visuais vêm de `components/ui.jsx`.
- **Não mexa nos `FALLBACK_*`** de `data/constants.js` nem na lógica de fallback das telas já integradas.
- **Erros:** use `window.alert(error.message || '...')`, como as telas de admin e de alunos já fazem.
- **Ao terminar:** rode `npm test` dentro de `frontend/` e confirme que continua passando. Teste o fluxo da task no navegador com a stack rodando.
- **Não faça o que está em "Fora do escopo"**, mesmo que pareça fácil.

### Como a navegação funciona hoje

Isso afeta várias tasks, então leia antes de começar.

- Não há router. `frontend/src/App.jsx` guarda a tela atual em `const [screen, setScreen] = useState('login')` e escolhe o componente com um `switch`.
- As telas navegam chamando `go(nomeDaTela, payload)`.
- `go` só guarda o payload de duas telas: `admin-gestao` (vira `selectedProfessor`) e `turma-detalhes` (vira `selectedTurma`). Em qualquer outra navegação as duas seleções voltam a `null`.
- Não existe estado para o simulado ou o aluno selecionado. As tasks D-04 e D-06 precisam criar esses estados.
- O `App` carrega `usuarios` e `turmas` uma vez (`loadData`) e repassa às telas. `onRefresh` recarrega os dois.

Mapa das telas de simulado:

- `simulados-lista` → clique no card → `simulado-painel`; botão "+" → `simulado-criar`
- `simulado-criar` → "Abrir Câmera e Continuar" → `simulado-gabarito` (é a tela do **gabarito oficial**, apesar do texto do botão)
- `simulado-painel` → clique em um aluno → `escaneamento`
- `escaneamento` → "Confirmar e Salvar" → `simulado-gabarito` (navegação errada, corrigida em D-07)
- `simulado-gabarito` → "Salvar Gabarito Oficial" → `simulado-painel`

---

### Descrição das tasks

#### D-01 · Subir a stack e rodar os testes

**Objetivo:** saber o que já funciona antes de alterar qualquer código. Esta task **só verifica e reporta**, não corrige nada.

**Passos:**

1. Na raiz do repositório, criar o `.env` a partir do exemplo, se ainda não existir: `cp .env.example .env`. Preencher `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` com valores locais quaisquer (ex.: `postgres`, `postgres`, `metamorfose`).
2. Subir tudo: `docker compose up -d --build`.
3. Conferir se cada serviço responde:
   - Frontend: `http://localhost:5173`
   - Monolito: `http://localhost:8000/docs`
   - Scan: `http://localhost:8001/health`
4. Em `frontend/`: `npm install`, `npm test` e `npm run lint`.
5. Em `monolito/`, se houver ambiente Python disponível: `pytest`.

**Aceite:** um relatório curto dizendo o que subiu, o que passou e o que falhou (com a mensagem de erro). Se algo falhar, reportar ao usuário antes de seguir para as outras tasks.

**Resultado (2026-10-28, `main` em `35ca9fe`):** ✅ nada bloqueia as próximas tasks.

| Verificação | Resultado |
| --- | --- |
| `npm test` (frontend) | 3/3 passaram |
| `npm run lint` | Sem erros, 10 warnings (variáveis não usadas, exports no `App.jsx`, `error = error` em `api.js`). Não precisam ser corrigidos. |
| `pytest` (monolito, rodado com `docker compose exec -T monolito pytest -q`) | 36/36 passaram |
| Frontend `:5173`, monolito `:8000` (`/`, `/docs`, `/usuarios`, `/turmas`), scan `:8001/health` | Todos 200 |
| `GET /simulados` | 404, como esperado: é o problema da D-02 |

Observações:

- Na primeira subida, o monolito falha ao conectar no Postgres porque o banco ainda não está pronto. O `restart: always` reinicia o contêiner e ele sobe normal. Só gera um erro no log.
- Os testes do frontend imprimem avisos `act(...)`. Não fazem nenhum teste falhar.
- O banco começa vazio: `/usuarios` e `/turmas` retornam `[]`.

---

#### D-08 · Manter a tela atual ao dar refresh

**Problema:** `App.jsx` começa sempre com `useState('login')`. Qualquer F5 descarta a navegação e volta ao login, o que atrapalha o desenvolvimento e a demo.

**Objetivo:** dar F5 em qualquer tela e continuar nela.

**Abordagem (só em `frontend/src/App.jsx`):**

1. Guardar no `sessionStorage`, numa única chave (ex.: `metamorfose:nav`), um objeto com a tela atual e os ids dos itens selecionados: `{ screen, professorId, turmaId }`.
2. Gravar esse objeto toda vez que a tela ou a seleção mudar (um `useEffect` resolve).
3. Na inicialização, ler o objeto e usar `screen` como valor inicial do estado. Se não houver nada salvo, começar em `login`.
4. Restaurar os objetos selecionados pelo id **depois** que `loadData` terminar: procurar o `professorId` em `usuarios` e o `turmaId` em `turmas`.
5. Se o id salvo não for encontrado, mandar o usuário para a tela "pai": `turma-detalhes` → `prof-turmas`, `admin-gestao` → `admin-home`.
6. Ao ir para `login` (logout), limpar a chave do `sessionStorage`.
7. Envolver toda leitura e escrita do `sessionStorage` em `try/catch`. Se der erro, o app segue funcionando como hoje.

**Cuidados:**

- Use `sessionStorage`, não `localStorage`. Assim cada aba tem a sua navegação e fechar a aba volta ao login.
- Deixe o objeto salvo fácil de estender. A D-04 vai acrescentar `simuladoId` e a D-06 vai acrescentar `alunoId`.
- O `sessionStorage` do jsdom persiste entre os testes do Vitest. Se algum teste do `App.test.jsx` quebrar por começar numa tela diferente de `login`, limpe o `sessionStorage` no `beforeEach` do teste.

**Fora do escopo:** react-router, URLs por tela, breadcrumb visual, botão voltar do navegador.

**Aceite:**

- F5 em qualquer tela mantém o usuário nela.
- F5 em `turma-detalhes` mostra a mesma turma e os alunos dela.
- F5 em `admin-gestao` mostra o mesmo professor.
- Sair (ir para `login`) e dar F5 continua no login.

---

#### D-02 · Registrar simulados no backend

> Task de **backend**, mas bloqueia D-04 a D-07.

**Problema:** o PR #6 criou modelo, schemas, serviço e router de simulados, mas não registrou nada em `monolito/app/main.py`. Resultado: `/simulados` responde 404 e as tabelas `simulado`, `simulado_turma` e `gabarito` não são criadas.

**O que fazer em `monolito/app/main.py`:**

1. Incluir `simulados` no import de routers: `from .routers import alunos, turmas, usuarios, simulados`.
2. Incluir `simulado` no import de models: `from .models import aluno, turma, usuario, simulado`. Isso é necessário para o `Base.metadata.create_all` criar as tabelas.
3. Adicionar `app.include_router(simulados.router)` junto dos outros `include_router`.

Não mexa em mais nada do backend.

**Aceite:**

- Reiniciar o contêiner (`docker compose restart monolito`, porque o uvicorn roda sem `--reload`).
- Em `http://localhost:8000/docs` aparece a seção "simulados".
- `POST /simulados` com `{"titulo": "Teste", "data_aplicacao": "2026-11-10", "total_questoes": 5, "turmas_ids": []}` retorna 201.
- `GET /simulados` lista o simulado criado.

---

#### D-03 · Cadastro de turma salvando na API

**Problema:** `frontend/src/screens/professor/TurmaCadastroScreen.jsx` só tem um input sem estado. O botão "Salvar Turma" apenas navega, sem chamar a API. O backend já tem `POST /turmas` e exige `nome` (texto), `ano` (inteiro) e `turno` (texto).

**O que fazer:**

1. Em `frontend/src/services/turmasService.js`, adicionar `criarTurma(turma)`, que faz `POST /turmas` com `requestJson`, no mesmo formato de `criarAluno` e `criarUsuario`.
2. Em `TurmaCadastroScreen`:
   - Receber `onRefresh` nas props. O `App.jsx` já repassa essa prop.
   - Tornar o campo de nome controlado (`useState`).
   - Adicionar o campo **Ano** (número, padrão `2026`).
   - Adicionar o campo **Turno** (select com `Manhã`, `Tarde`, `Noite`).
   - Usar o mesmo estilo visual dos inputs que já existem na tela.
3. Ao salvar:
   - Se o nome estiver vazio, não chamar a API.
   - Chamar `criarTurma({ nome, ano: Number(ano), turno })`.
   - Chamar `onRefresh` para atualizar a lista de turmas.
   - Navegar para `go('turma-detalhes', normalizeTurma(criada))`, para o professor já adicionar os alunos. O texto da própria tela promete isso.
   - Em caso de erro, `window.alert`.
4. Enquanto salva, evitar duplo clique (estado `saving`, como em `AdminCadastroScreen`).

**Fora do escopo:** edição de turma, importação CSV (o texto da tela menciona CSV, pode ficar como está).

**Aceite:**

- Criar uma turma leva à tela de detalhes dela.
- Lá dá para adicionar alunos.
- Ao voltar, a turma aparece na lista.
- `GET /turmas` no backend mostra a turma com nome, ano e turno.

---

#### D-04 · Simulados: service, lista e criação

**Dependência:** D-02.

**Contrato da API** (veja `monolito/app/schemas/simulado.py`):

- `GET /simulados` → lista de simulados.
- `GET /simulados/{id}` → um simulado.
- `POST /simulados` com `{ titulo, data_aplicacao: "YYYY-MM-DD", total_questoes, turmas_ids: [ids] }` → 201 com o simulado criado.
- Formato do simulado retornado: `{ id, titulo, data_aplicacao, total_questoes, turmas: [{ id, nome, ano, turno }], gabarito: [{ id, simulado_id, num_questao, alt_correta }] }`.
- `POST` com `turmas_ids` inexistentes retorna 404.

**O que fazer:**

1. **Service:** criar `frontend/src/services/simuladosService.js` no padrão dos outros services, com:
   - `listarSimulados()`
   - `obterSimulado(id)`
   - `criarSimulado(simulado)`
   - `obterGabarito(id)`
   - `salvarGabarito(id, itens)`

   As duas últimas são usadas na D-05.

2. **Estado no `App.jsx`:**
   - Criar o estado `selectedSimulado`.
   - Ajustar `go` para guardar o payload quando a tela de destino for de simulado: `simulado-painel`, `simulado-gabarito` ou `escaneamento`.
   - Navegar **entre** essas telas sem payload deve manter o simulado selecionado.
   - Sair delas (ex.: ir para `simulados-lista` ou `prof-dashboard`) limpa a seleção.
   - Passar `simulado={selectedSimulado}` para `SimuladoPainelScreen`, `GabaritoScreen` e `EscaneamentoScreen`.
   - Passar `turmas` para `SimuladoCriarScreen`.
   - Estender o mecanismo da D-08 com `simuladoId`. No refresh, buscar o simulado com `obterSimulado(simuladoId)`. Se falhar, voltar para `simulados-lista`.

3. **Lista** (`frontend/src/screens/simulados/SimuladosListaScreen.jsx`):
   - Remover a constante `simuladosList` fixa e carregar com `listarSimulados()` ao montar a tela.
   - Mostrar `titulo`, a data e as turmas (`turmas[].nome`).
   - Para exibir a data, formatar a string `YYYY-MM-DD` dividindo-a (ex.: `05/05/2026`). **Não** use `new Date('2026-05-05')`: ela é interpretada como UTC e aparece um dia antes no fuso do Brasil.
   - Remover o campo `highlight` (ou deixar sempre `false`).
   - Clique no card: `go('simulado-painel', simulado)`.
   - Lista vazia: mostrar um texto simples ("Nenhum simulado cadastrado").
   - Manter a busca por título funcionando.

4. **Criação** (`frontend/src/screens/simulados/SimuladoCriarScreen.jsx`):
   - Tornar título e data controlados.
   - Adicionar o campo **Número de questões** (inteiro, padrão `10`). Ele não existe na tela hoje.
   - Trocar `turmaOptions` fixo pelas `turmas` recebidas por prop (já normalizadas: `id`, `name`, `alunos`).
   - Selecionar turmas por `id`.
   - Ao clicar no botão:
     - Validar título, data e número de questões.
     - Chamar `criarSimulado({ titulo, data_aplicacao, total_questoes: Number(...), turmas_ids })`.
     - Navegar para `go('simulado-gabarito', criado)`.
     - Erro: `window.alert`.
   - O input `type="date"` já entrega a data como `YYYY-MM-DD`, que é o formato que a API espera.

**Fora do escopo:** editar ou excluir simulado, filtro (botão de filtros pode ficar sem ação).

**Aceite:**

- Criar um simulado com uma turma leva à tela de gabarito.
- Voltar para a lista mostra o simulado com a data certa e o nome da turma.
- F5 numa tela de simulado mantém o mesmo simulado.

---

#### D-05 · Cadastro do gabarito oficial

**Dependência:** D-04.

**Tela:** `frontend/src/screens/simulados/GabaritoScreen.jsx`. Ela já é a tela do gabarito oficial (botão "Salvar Gabarito Oficial"), mas tem 4 questões fixas e um total "40 questões" fixo.

**Contrato da API:**

- `GET /simulados/{id}/gabarito` → `[{ id, simulado_id, num_questao, alt_correta }]`.
- `PUT /simulados/{id}/gabarito` com `[{ num_questao, alt_correta }]`. Atualiza as questões enviadas e insere as novas, e devolve o gabarito completo. **Não apaga** questões que ficaram de fora da lista: se uma questão já salva for desmarcada na tela, ela continua no banco. Para a demo isso não importa.
- Regras do backend:
  - `alt_correta` precisa ser A, B, C, D ou E.
  - Lista vazia, número de questão repetido ou maior que `total_questoes` retorna 400 com mensagem em `detail`.

**O que fazer:**

1. Receber `simulado` por prop.
   - Se for `null`, mostrar só um aviso e um botão para `simulados-lista`.
2. Gerar uma linha por questão, de `1` até `simulado.total_questoes`.
3. Pré-preencher as respostas com o gabarito já salvo. Usar `obterGabarito(simulado.id)` ao montar, para não depender de dados antigos no objeto `simulado`.
4. **Remover a opção "N" (anular)** e o contador de anuladas. O backend não aceita valor diferente de A–E.
5. Trocar o texto fixo "40 questões" por `simulado.total_questoes`.
6. Trocar o subtítulo do header ("Leitura Concluída") e o texto do aviso, que falam em câmera, por algo como "Marque a alternativa correta de cada questão".
7. Ao salvar:
   - Montar a lista só com as questões marcadas e chamar `salvarGabarito`.
   - Se nenhuma questão estiver marcada, `window.alert` sem chamar a API.
   - Em sucesso, `go('simulado-painel')` (o simulado continua selecionado, ver D-04).
   - Erro: `window.alert` com o `detail` da API.

**Aceite:**

- Marcar as alternativas e salvar persiste no banco (`GET /simulados/{id}/gabarito`).
- Reabrir a tela mostra as alternativas salvas.
- Simulado com 10 questões mostra exatamente 10 linhas.

---

#### D-06 · Escaneamento com o `scan_service`

**Dependência:** D-04 (simulado selecionado). Usa os alunos cadastrados na D-03.

**Contrato do scan** (veja `scan_service/app/main.py`):

- `POST http://localhost:8001/processar`, `multipart/form-data`, com o arquivo no campo **`arquivo`**.
- Extensões aceitas: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tiff`, `.webp`. Outras retornam 400.
- Sucesso (200): `{ sucesso, total_questoes, questoes: [{ questao, resposta, confianca, status }], sem_resposta: [n], multipla_marcacao: [n], avisos: [texto] }`.
  - `resposta` é a letra lida, ou `null` se nada foi marcado.
  - `status` é `ok`, `sem_resposta` ou `multipla_marcacao`.
- Nenhuma bolha detectada: 422 com `detail` explicando.
- Parâmetros opcionais na query: `num_alternativas` (padrão 5) e `limiar_marcado` (padrão 0.35). Não é preciso enviar.

**O que fazer:**

1. **Service:** criar `frontend/src/services/scanService.js` com `processarGabarito(arquivo)`.
   - URL base: `import.meta.env.VITE_SCAN_URL || 'http://localhost:8001'`.
   - **Não use `requestJson`**: ele força `Content-Type: application/json` em toda requisição que não é GET, o que quebra o upload. Use `fetch` direto com um `FormData` e **não** defina `Content-Type` (o navegador define o boundary).
   - Em resposta não-ok, lançar `Error` com o `detail` da resposta, como o `requestJson` faz.
2. **Painel** (`frontend/src/screens/simulados/SimuladoPainelScreen.jsx`). O mínimo para chegar no escaneamento com dados reais:
   - Receber `simulado` por prop e mostrar `simulado.titulo` e os nomes das turmas no header, no lugar dos textos fixos.
   - Trocar a lista fixa `alunos` pelos alunos das turmas do simulado, usando `listarAlunosDaTurma(turma.id)` para cada turma e `normalizeAluno`.
   - Como nada é salvo, todos aparecem como "não corrigido". O progresso fica 0%.
   - Clique no aluno: `go('escaneamento', aluno)`.
   - Adicionar um botão discreto "Editar gabarito oficial" que vai para `simulado-gabarito`.
3. **Estado no `App.jsx`:**
   - Criar `selectedAluno`, preenchido quando a tela de destino é `escaneamento`.
   - Passar `aluno={selectedAluno}` para `EscaneamentoScreen`. O `simulado` continua selecionado (D-04).
   - Estender o mecanismo da D-08 com `alunoId`. Se o aluno não puder ser restaurado no refresh, voltar para `simulado-painel`.
4. **Escaneamento** (`frontend/src/screens/simulados/EscaneamentoScreen.jsx`):
   - Mostrar `aluno.name` no header, no lugar de "Bruno Costa Santos".
   - Trocar o desenho estático do gabarito por:
     - um `<input type="file" accept="image/*">` (pode ficar escondido atrás do botão "Refazer Foto"/"Enviar foto");
     - um preview da imagem escolhida (`URL.createObjectURL`).
   - Ao escolher a imagem:
     - Chamar `processarGabarito`, mostrando "Processando..." enquanto espera.
     - Preencher `answers` com o resultado, indexado pelo número da questão.
   - Renderizar uma linha por questão, de `1` até `simulado.total_questoes`, no lugar das 3 questões fixas.
   - Destacar em vermelho (o estilo `alert` que já existe) as questões com `sem_resposta` ou `multipla_marcacao`. O texto do aviso deve refletir o status.
   - Se o scan detectar um número de questões diferente de `simulado.total_questoes`, mostrar o aviso no banner amarelo. Questões não lidas ficam em branco.
   - O professor continua podendo corrigir cada resposta manualmente (os radios já existem).
   - Erro do scan (ex.: 422): `window.alert` com a mensagem e permitir enviar outra foto.

**Fora do escopo:** câmera, salvar as respostas do aluno, status "corrigido" no painel.

**Aceite:**

- Enviar a foto de um gabarito preenchido mostra as alternativas lidas, com as questões problemáticas destacadas.
- Enviar uma imagem sem gabarito mostra a mensagem de erro do scan.

---

#### D-07 · Calcular e mostrar a nota

**Dependência:** D-05 e D-06.

**Problema:** em `EscaneamentoScreen`, a nota é a constante `score = 35` e o total "40" está fixo no JSX. O botão "Confirmar e Salvar" navega para `simulado-gabarito`, que é a tela do gabarito oficial: navegação errada.

**O que fazer (em `EscaneamentoScreen`):**

1. Ao montar, carregar o gabarito oficial com `obterGabarito(simulado.id)` e transformá-lo num mapa `num_questao → alt_correta`.
2. Calcular a nota a partir das respostas **atuais** da tela, depois da revisão manual. Recalcular sempre que o professor alterar uma resposta.
   - Acertos = quantidade de questões em que a resposta é igual à `alt_correta`.
   - Total = quantidade de questões que têm gabarito oficial.
   - Questões sem gabarito oficial não contam.
3. Exibir `acertos / total`.
   - Se o simulado não tiver gabarito oficial, mostrar "Cadastre o gabarito oficial" no lugar da nota.
4. Trocar o texto do botão para "Concluir" e fazê-lo navegar para `go('simulado-painel')`. Nada é salvo (decisão assumida).

**Aceite:**

- Com o gabarito oficial salvo, a nota mostrada bate com a contagem manual.
- Alterar uma resposta atualiza a nota na hora.
- "Concluir" volta ao painel do mesmo simulado.

---

### Fora do escopo, opcional

Breadcrumb visual e react-router (o D-08 cobre só o refresh), login e ativação reais, sessão e rotas protegidas, importação CSV, edição de turma e de simulado, contagem de alunos por turma, campo matrícula, dashboard com dados reais, perfil, toast e estados de erro bonitos, câmera, salvar resultado do aluno, testes novos, CI, acessibilidade.

### Problemas conhecidos que **não** vamos resolver

- Turmas aparecem com "0 alunos" (o backend não devolve a contagem).
- A matrícula exibida é o `id` do aluno.
- O dashboard do professor segue com dados fixos.
- O painel do simulado mostra todos os alunos como "não corrigidos", porque a nota não é salva.

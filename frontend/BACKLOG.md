# Backlog do Frontend (versão demo / TCC)

Objetivo: o fluxo abaixo rodar de ponta a ponta numa demo. Nada além disso.

**Fluxo da demo**

1. Admin cadastra um professor (já funciona)
2. Professor cria uma turma e adiciona alunos
3. Professor cria um simulado e cadastra o gabarito oficial
4. Professor envia a foto de um gabarito preenchido e o sistema lê as respostas
5. O sistema mostra a nota

Tamanho: S (≤ meio dia) · M (1–2 dias)

## Tasks

| ID   | Task                                                                | Tam. | Branch                          |
| ---- | ------------------------------------------------------------------- | ---- | ------------------------------- |
| D-01 | Subir a stack (`docker compose up`) e rodar `npm test`              | S    | `chore/d01-baseline`            |
| D-08 | Manter a tela atual ao dar refresh (hoje volta para o login)        | S    | `feat/d08-refresh-mantem-tela`  |
| D-02 | Registrar router e modelo de simulados no `monolito/app/main.py`    | S    | `fix/d02-registrar-simulados`   |
| D-03 | Cadastro de turma salvando na API                                   | S    | `feat/d03-cadastro-turma`       |
| D-04 | `simuladosService.js` + lista e criação de simulado integradas      | M    | `feat/d04-simulados`            |
| D-05 | Cadastro do gabarito oficial (`PUT /simulados/{id}/gabarito`)       | M    | `feat/d05-gabarito-oficial`     |
| D-06 | Escaneamento: enviar imagem ao `scan_service` e exibir as respostas | M    | `feat/d06-escaneamento`         |
| D-07 | Calcular e mostrar a nota (respostas lidas × gabarito oficial)      | S    | `feat/d07-nota`                 |

Ordem: D-01 → D-08 → D-02 → D-03 → D-04 → D-05 → D-06 → D-07 (a tabela já está nessa ordem).

**Branches:** uma por task, todas criadas a partir da `main`. As tasks dependem umas das outras (ex.: D-04 usa o mecanismo da D-08 e precisa da D-02), então, antes de começar uma task, atualize a branch dela com a `main` (`git merge main`) depois que as tasks anteriores forem mergeadas.

## Decisões assumidas (corrija se não servir)

- **Foto:** upload de arquivo de imagem, sem câmera. É mais simples e basta para demonstrar.
- **Nota:** calculada no frontend e **não salva**. Salvar exigiria criar um modelo e endpoints de resultado no backend.
- **Chamada ao scan:** o frontend chama `http://localhost:8001/processar` direto (o CORS do scan já é `*`), com a URL configurável por `VITE_SCAN_URL`.
- **Login:** continua só visual (os botões já levam às telas). Sem autenticação real.
- **Fallbacks:** ficam como estão. Cuidado: se a API falhar, a tela mostra dados falsos e parece que funcionou. Ao testar, confira se o registro foi para o banco.

---

## Regras para quem executar as tasks

Valem para todas as tasks abaixo.

- **Mudança mínima.** O projeto é um TCC e só precisa rodar na demo. Não refatore, não troque o visual, não adicione bibliotecas, não crie abstrações "para o futuro".
- **Siga o padrão existente.** Services ficam em `frontend/src/services/` e usam `requestJson` de `api.js` (exceto o upload de imagem, ver D-06). Telas ficam em `frontend/src/screens/`. Componentes visuais vêm de `components/ui.jsx`.
- **Não mexa nos `FALLBACK_*`** de `data/constants.js` nem na lógica de fallback das telas já integradas.
- **Erros:** use `window.alert(error.message || '...')`, como as telas de admin e de alunos já fazem.
- **Ao terminar:** rode `npm test` dentro de `frontend/` e confirme que continua passando. Teste o fluxo da task no navegador com a stack rodando.
- **Não faça o que está em "Fora do escopo"**, mesmo que pareça fácil.

## Como a navegação funciona hoje

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

## Descrição das tasks

### D-01 · Subir a stack e rodar os testes

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

---

### D-08 · Manter a tela atual ao dar refresh

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

### D-02 · Registrar simulados no backend

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

### D-03 · Cadastro de turma salvando na API

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

### D-04 · Simulados: service, lista e criação

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

### D-05 · Cadastro do gabarito oficial

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

### D-06 · Escaneamento com o `scan_service`

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

### D-07 · Calcular e mostrar a nota

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

## Fora do escopo, opcional

Breadcrumb visual e react-router (o D-08 cobre só o refresh), login e ativação reais, sessão e rotas protegidas, importação CSV, edição de turma e de simulado, contagem de alunos por turma, campo matrícula, dashboard com dados reais, perfil, toast e estados de erro bonitos, câmera, salvar resultado do aluno, testes novos, CI, acessibilidade.

## Problemas conhecidos que **não** vamos resolver

- Turmas aparecem com "0 alunos" (o backend não devolve a contagem).
- A matrícula exibida é o `id` do aluno.
- O dashboard do professor segue com dados fixos.
- O painel do simulado mostra todos os alunos como "não corrigidos", porque a nota não é salva.

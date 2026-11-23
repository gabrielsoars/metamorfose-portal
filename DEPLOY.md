# Deploy — Metamorfose em produção (uma VPS)

Tudo em um lugar: Postgres, monolito, scan_service, frontend e Caddy (TLS) na mesma máquina,
orquestrados por `docker-compose.prod.yml`. Custo de referência: Hetzner CX23
(2 vCPU / 4 GB / 40 GB) por **€ 5,99/mês** com IPv4 incluso.

## Pré-requisitos

- Conta na Hetzner com cartão/PayPal e sua **chave SSH pública** em mãos
  (`cat ~/.ssh/id_ed25519.pub`; se não tiver: `ssh-keygen -t ed25519`).
- Um domínio (opcional, mas recomendado): `seudominio.com.br` no Registro.br (R$ 40/ano).
- Nada mais. Docker é instalado pelo script.

## 1. Criar o servidor (~2 min)

1. <https://console.hetzner.com> → **New Project** → **Add Server**.
2. **Location**: Nuremberg ou Helsinki (não há datacenter no Brasil).
3. **Image**: Ubuntu 24.04.
4. **Type**: *Cost-Optimized* → **CX23** (2 vCPU, 4 GB, 40 GB).
5. **SSH keys**: selecione/adicione sua chave pública. **Não** use senha de root.
6. Crie e anote o **IP público**.

Teste: `ssh root@IP`.

## 2. Apontar o DNS (~5 min de propagação)

No painel do domínio (Registro.br, Cloudflare, etc.), crie três registros **A** para o IP do servidor:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `app` | IP do servidor |
| A | `api` | IP do servidor |
| A | `scan` | IP do servidor |

Sem domínio? Dá para usar `sslip.io`: se o IP é `1.2.3.4`, o domínio base vira
`1-2-3-4.sslip.io` e o app fica em `https://app.1-2-3-4.sslip.io`.

> O Caddy só emite o certificado depois que o DNS resolve. Se subir antes, é só esperar e
> reiniciar: `docker compose --env-file .env.prod -f docker-compose.prod.yml restart caddy`.

## 3. Subir a aplicação (~5 min de build)

```bash
ssh root@IP
apt-get update && apt-get install -y git
git clone <url-do-repo> metamorfose && cd metamorfose
bash setup.sh
```

O `setup.sh` pergunta o domínio base, o e-mail do admin e (opcional) o SMTP, gera a senha do
banco e o par de chaves JWT, e sobe tudo.

Para atualizar depois de um `git pull`, rode `bash setup.sh` de novo (ele reaproveita o
`.env.prod` e as chaves).

## 4. Primeiro acesso

Se você **não** configurou SMTP, o código de ativação do admin vai para o log:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs monolito | grep "Código"
```

Depois: abra `https://app.seudominio.com.br`, ative a conta do admin com esse código e siga o
fluxo normal (admin cadastra professor → professor ativa a conta).

## 5. Backup (faça depois de cada sessão de correção)

```bash
bash scripts/backup.sh
# gera backups/metamorfose-AAAAMMDD-HHMM.sql.gz
```

Copie o arquivo para fora do servidor (`scp root@IP:~/metamorfose/backups/*.sql.gz .`).
O banco inteiro tem poucos MB — esse arquivo é o backup completo.

Restaurar:

```bash
gunzip -c backups/arquivo.sql.gz | \
  docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec -T application_db psql -U metamorfose -d metamorfose
```

## 6. Operação

```bash
COMPOSE="docker compose --env-file .env.prod -f docker-compose.prod.yml"
$COMPOSE ps                  # status e healthchecks
$COMPOSE logs -f --tail=100  # logs de todos
$COMPOSE logs -f scan_service
$COMPOSE restart monolito
$COMPOSE down                # para tudo (dados ficam nos volumes)
```

## 7. Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Caddy em loop de erro de certificado | DNS ainda não aponta para o IP | `dig +short app.seudominio.com.br` e reinicie o Caddy |
| Tela branca / "Failed to fetch" | CORS ou `VITE_API_URL` errado | confira `CORS_ORIGINS` no `.env.prod`; as `VITE_*` são embutidas no build, então exige `up -d --build` |
| 502 no `api.` | monolito não subiu (banco ou chave) | `$COMPOSE logs monolito` |
| Código de ativação não chega | SMTP ausente/bloqueado | leia o log ou configure SMTP (porta 587; a Hetzner bloqueia só a 25) |
| Scan muito lento | fotos grandes | o frontend já redimensiona; verifique o tamanho do upload |
| Servidor sem memória | build do frontend + serviços | use `--build` sem outros processos rodando; 4 GB é folgado no dia a dia |

## 8. Segurança mínima já aplicada

- Só 80/443 são publicados; Postgres, monolito e scan ficam na rede interna do Docker.
- Chaves JWT e senhas ficam em `.env.prod`/`keys/`, ambos fora do Git (`.gitignore`).
- Containers com `restart: always`, healthchecks e logs rotacionados (10 MB × 3).
- TLS automático e renovação pelo Caddy.

Pendências conhecidas que este deploy **não** resolve: `/docs` público, rate limit em memória,
sem Alembic e sem backup automático. Ver `PENDENCIAS.md`.

---

# Apêndice — Magalu Cloud (cobrança em reais)

A mesma stack roda sem alteração. Muda só a criação da máquina.

**Preços de referência** (tabela oficial, impostos inclusos, região br-se1, out/2026):

| Tipo | Config | R$/mês |
| --- | --- | --- |
| `BV2-4-40` | 2 vCPU, 4 GB, 40 GB | **102,99** |
| `BV2-4-20` | 2 vCPU, 4 GB, 20 GB | 92,99 |
| `BV2-2-40` | 2 vCPU, 2 GB, 40 GB | 79,99 |

Cobrança por segundo; o valor mensal é referência de 730 h. A conta nova ganha **R$ 100 de
crédito** ao ser ativada (cobre ~1 mês do `BV2-4-40`).

## 1. Criar a instância

1. <https://console.magalu.cloud> → login com **ID Magalu** (CPF; não precisa de CNPJ).
2. Ative a conta pessoal para liberar os R$ 100 de crédito.
3. **Virtual Machines → Criar instância**:
   - **Região**: `br-se1` (Sudeste);
   - **Imagem**: `cloud-ubuntu-24.04 LTS`;
   - **Tipo**: `BV2-4-40` (ou `BV2-4-20` para economizar);
   - **IPv4 público**: marcar (sem ele a VM só tem IPv6 e o app fica inacessível);
   - **Chave SSH**: inserir a sua pública;
   - **Nome**: `metamorfose`.
4. Anote o **IPv4 público**. O usuário padrão da imagem Ubuntu é `ubuntu` (não `root`).

## 2. Grupo de segurança

Toda instância nasce com o grupo padrão. Em **Network → Grupos de segurança**, edite o grupo
associado e adicione:

| Direção | Protocolo | Porta | Origem |
| --- | --- | --- | --- |
| Ingress | TCP | 22 | seu IP (ou 0.0.0.0/0) |
| Ingress | TCP | 80 | 0.0.0.0/0 |
| Ingress | TCP | 443 | 0.0.0.0/0 |
| Egress | TCP | qualquer | 0.0.0.0/0 |

> Sem regra de **egress** para `0.0.0.0/0` a instância **não sobe**.

## 3. Deploy (igual ao resto do guia)

```bash
ssh ubuntu@IP
sudo -i
apt-get update && apt-get install -y git
git clone <url-do-repo> metamorfose && cd metamorfose
bash setup.sh
```

Depois siga da seção **4. Primeiro acesso** em diante.

## 4. Pontos de atenção

- **IPv4 público é um recurso separado**: ao excluir a VM ele **não é excluído junto** e pode
  continuar gerando cobrança. Libere em **Network → IPs públicos** ao desmontar.
- Para pausar entre sessões sem cobrar máquina, o caminho seguro é **snapshot + excluir** e
  recriar a partir do snapshot (o disco do snapshot tem custo por GiB/mês).
- Tráfego de saída aparece como **R$ 0,00** na tabela atual — confira antes de assumir.

---

# Apêndice B — HostGator VPS NVMe (Oracle Cloud no Brasil)

Plano **VPS NVMe** (não confundir com o antigo "VPS SSD" com cPanel): infraestrutura Oracle
Cloud no Brasil, KVM, acesso root, IP dedicado e Docker liberado.

| Plano | Config | Promo (3 anos) | Sem fidelidade |
| --- | --- | --- | --- |
| NVMe 2 | 1 vCPU, 2 GB DDR5, 50 GB NVMe | **R$ 20,99/mês** (R$ 755,64 à vista) | R$ 54,98/mês |
| NVMe 4 | 2 vCPU, 4 GB DDR5, 100 GB NVMe | **R$ 30,39/mês** (R$ 1.094,11) | R$ 96,65/mês |
| NVMe 8 | 4 vCPU, 8 GB DDR5, 200 GB NVMe | R$ 45,49/mês (R$ 1.637,77) | — |

Pagamento em reais, Pix/boleto ou cartão em até 12x, com nota fiscal brasileira. Transferência
ilimitada e 1 IP dedicado.

## 1. Contratar

1. <https://www.hostgator.com.br/servidor-vps> → escolha **VPS NVMe 4** (recomendado) ou NVMe 2.
2. **Sistema operacional**: Ubuntu limpo, **sem cPanel/WHM** (painel de controle atrapalha o Docker).
3. Guarde o IP e a senha de root enviados por e-mail (ou cadastre sua chave SSH no painel).

## 2. Deploy

```bash
ssh root@IP
apt-get update && apt-get install -y git
git clone <url-do-repo> metamorfose && cd metamorfose
bash setup.sh
```

Daqui em diante é igual ao guia principal (DNS, primeiro acesso, backup).

## 3. Pontos de atenção

- **O preço baixo exige 3 anos de contrato pago à vista/parcelado.** No mensal sem fidelidade o
  NVMe 2 custa R$ 54,98 e o NVMe 4, R$ 96,65.
- Na renovação, o valor volta para a tabela cheia.
- 1 vCPU / 2 GB (NVMe 2) roda a stack (pico ~1,2 GB), mas o build das imagens fica lento e o
  scan concorrente sofre; 2 vCPU / 4 GB é o ponto confortável.
- Faça o `setup.sh` e o primeiro build antes de anunciar qualquer prazo.

# Olivia - Gerenciador de Transações Financeiras

Aplicação Node.js para buscar transações bancárias via Pluggy, tratar parcelas, deduplicar lançamentos e atualizar dados no Google Sheets. A geração de CSV é opcional.

## Funcionalidades

- Integração com múltiplos bancos/itens configurados no `config.js`
- Filtro de categorias (`excludeCategories`)
- Definição automática da data inicial quando `startDate` não é informada
- Criação de lançamentos de parcelas futuras para cartão de crédito
- Deduplicação de transações
- Atualização de aba no Google Sheets como comportamento padrão da aplicação
- Exportação para CSV opcional
- API REST com Swagger para disparo e acompanhamento de execuções

## Requisitos

- Node.js 14+
- npm
- Credenciais da Pluggy
- (Opcional) credenciais de conta de serviço Google para atualizar planilha

## Instalação

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Preencha o `.env` (veja a tabela completa em [Variáveis de ambiente](#variáveis-de-ambiente)):

```env
PLUGGY_CLIENT_ID=seu_client_id
PLUGGY_CLIENT_SECRET=seu_client_secret
```

4. Crie e ajuste o arquivo de configuração dos bancos:

```bash
cp config.example.js config.js
```

No `config.js`, informe os `itemId`s da Pluggy e opções padrão (`startDate`, `excludeCategories`).

## Uso

### CLI

```bash
npm run start:cli
```

Comportamento do CLI:
- aplica precedência `payload > .env > config.js > defaults`
- permite geração de CSV
- no CLI (sem payload), usa `.env` e `config.js` conforme a precedência

### API REST

```bash
npm start
```

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/swagger.json`
- Iniciar execução: `POST /v1/executions/transactions`
- Detalhes da execução: `GET /v1/executions/transactions/:executionId`
- Status da execução: `GET /v1/executions/transactions/:executionId/status`
- Listar execuções: `GET /v1/executions/transactions`

## Docker

Build local da imagem:

```bash
docker build -t olivia:latest .
```

Executar container:

```bash
docker run --rm -p 3000:3000 --env-file .env olivia:latest
```

## CI/CD no GitHub Actions (ECR)

Foi adicionado o workflow `.github/workflows/ecr.yml` para build e push da imagem no Amazon ECR a cada `push`.

Pré-requisitos no repositório GitHub:

- Nenhum secret obrigatório para o deploy padrão no ECR (a role está fixa no workflow)

Destino ECR fixo no workflow:

- Conta: `683684736241`
- Região: `us-east-1`
- Repositório: `olivia-api`
- Role IAM (OIDC): `arn:aws:iam::683684736241:role/GitHubActionsECRPushRole-olivia-api`

Comportamento dos tags:

- Sempre publica `${GITHUB_SHA}`
- Publica `latest` apenas quando o push for na branch `main`

## Payload da API

- `banks`: array de IDs de bancos (item IDs da Pluggy)
- `options`: opções de busca (`startDate`, `excludeCategories`)
- `sheet`: configura atualização de planilha (`enabled`, `spreadsheetId`, `tabName`)
- `artifacts`: controla artefatos de saída (`csvEnabled`)

Exemplo:

```json
{
  "banks": ["item-id-1", "item-id-2"],
  "options": {
    "startDate": "2026-02-01",
    "excludeCategories": ["Credit card payment"]
  },
  "sheet": {
    "enabled": true,
    "spreadsheetId": "1abc123",
    "tabName": "Homologação"
  },
  "artifacts": {
    "csvEnabled": true
  }
}
```

## Regras padrão importantes

### Comportamento padrão da aplicação

Ordem de precedência dos parâmetros:

1. payload da API
2. variáveis de ambiente (`.env`)
3. `config.js`
4. defaults internos do código

Aplicação por grupo:

- `banks`: `payload.banks` > `BANKS` > `config.js`
- `options.startDate`: `payload.options.startDate` > `OPTIONS_START_DATE` > `config.js`
- `options.excludeCategories`: `payload.options.excludeCategories` > `OPTIONS_EXCLUDE_CATEGORIES` > `config.js`
- `sheet.enabled`: `payload.sheet.enabled` > `SHEET_ENABLED` > default `true`
- `sheet.spreadsheetId`: `payload.sheet.spreadsheetId` > `SHEET_SPREADSHEET_ID` > `GOOGLE_SPREADSHEET_ID`
- `sheet.tabName`: `payload.sheet.tabName` > `SHEET_TAB_NAME` > default `Homologação`
- `artifacts.csvEnabled`: `payload.artifacts.csvEnabled` > `ARTIFACTS_CSV_ENABLED` > default `false`

## Variáveis de ambiente

| Variável | Obrigatória para preencher? | Exemplo de valor | Descrição |
| --- | --- | --- | --- |
| `PLUGGY_CLIENT_ID` | Sim | `pk_live_abc123` | Client ID da Pluggy usado para autenticar chamadas da API de transações. |
| `PLUGGY_CLIENT_SECRET` | Sim | `sk_live_def456` | Client Secret da Pluggy usado junto com o `PLUGGY_CLIENT_ID`. |
| `BANKS` | Não | `item-id-1,item-id-2` | Lista CSV de item IDs da Pluggy usada quando `payload.banks` não é enviado. |
| `OPTIONS_START_DATE` | Não | `2026-02-01` | Data inicial para busca de transações (`YYYY-MM-DD`). Aceita vazio ou `null` para detecção automática. |
| `OPTIONS_EXCLUDE_CATEGORIES` | Não | `Same person transfer,Credit card payment` | Lista CSV de categorias a excluir da coleta. |
| `SHEET_ENABLED` | Não | `true` | Habilita/desabilita atualização de planilha (`true/false`, também aceita `1/0`, `yes/no`). |
| `SHEET_SPREADSHEET_ID` | Não | `1AbCdEfGhIjKlMnOp` | ID da planilha usado como prioridade para escrita no Google Sheets. |
| `GOOGLE_SPREADSHEET_ID` | Não | `1ZyXwVuTsRqPoNmLk` | ID de planilha fallback quando `SHEET_SPREADSHEET_ID` não estiver definido. |
| `SHEET_TAB_NAME` | Não | `Homologação` | Nome da aba de destino no Google Sheets. |
| `ARTIFACTS_CSV_ENABLED` | Não | `false` | Habilita geração de CSV de saída (`true/false`). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Não | `/app/keys/service-account.json` | Caminho para JSON da Service Account. Necessário quando houver escrita no Google Sheets. |
| `PORT` | Não | `3000` | Porta HTTP da API REST (default: `3000`). |
| `AWS_REGION` | Não | `us-east-1` | Região AWS usada no utilitário de upload para S3 (default: `us-east-1`). |

Observações:
- Para executar a aplicação com Pluggy, apenas `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` são obrigatórias.
- Para atualizar Google Sheets, é necessário informar um ID de planilha (`SHEET_SPREADSHEET_ID` ou `GOOGLE_SPREADSHEET_ID`) e credenciais válidas em `GOOGLE_APPLICATION_CREDENTIALS`.

## Saídas geradas

Dependendo das opções da execução:

- CSV principal: `output/transactions_<timestamp>.csv`
- CSV de removidas na deduplicação: `output/transactions_removed_<timestamp>.csv`

## Estrutura do projeto

```text
olivia/
├── src/
│   ├── jobs/           # Pipeline de execução
│   ├── services/       # Serviços (Pluggy, Google Sheets)
│   ├── swagger/        # OpenAPI/Swagger
│   ├── utils/          # Utilitários (CSV, formatação, etc.)
│   ├── constants.js
│   ├── index.js        # Entrada CLI
│   └── server.js       # Entrada API REST
├── config.js
├── config.example.js
├── .env
├── .env.example
└── output/
```

## Google Sheets (padrão)

Para atualizar planilha automaticamente (comportamento padrão):

1. Crie uma Service Account no Google Cloud.
2. Baixe a chave JSON.
3. Compartilhe a planilha com o e-mail da Service Account (permissão de edição).
4. Configure `GOOGLE_APPLICATION_CREDENTIALS` e `GOOGLE_SPREADSHEET_ID` no `.env`.
5. Execute via API (com ou sem payload) conforme a precedência desejada.

## Segurança

- Não versione `.env`
- Não versione `config.js` com dados sensíveis
- Proteja credenciais da Pluggy e do Google

## Licença

MIT.

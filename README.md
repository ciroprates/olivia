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

3. Preencha o `.env`:

```env
PLUGGY_CLIENT_ID=seu_client_id
PLUGGY_CLIENT_SECRET=seu_client_secret

# Opcional (Google Sheets)
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service-account.json
GOOGLE_SPREADSHEET_ID=seu_spreadsheet_id
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
- usa os bancos e opções padrão do `config.js`
- permite geração de CSV
- para seguir o comportamento padrão da aplicação (atualizar planilha), prefira a execução via API com payload vazio

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

Todos os campos são opcionais:

- `banks`: array de IDs de bancos (item IDs do `config.js`)
- `options`: sobrescreve opções (`startDate`, `excludeCategories`)
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

Quando o endpoint `POST /v1/executions/transactions` recebe `{}` (ou sem body), a aplicação aplica o comportamento padrão:

- `sheet.enabled = true` (atualiza planilha)
- `artifacts.csvEnabled = false` (não gera CSV)

Ou seja: atualização da planilha por padrão, com CSV opcional.

### Quando personalizar via payload

- Você pode habilitar CSV explicitamente com `artifacts.csvEnabled = true`
- Você pode controlar planilha via `sheet.enabled`

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
5. Execute via API com payload vazio para usar o padrão de atualização de planilha.

## Segurança

- Não versione `.env`
- Não versione `config.js` com dados sensíveis
- Proteja credenciais da Pluggy e do Google

## Licença

MIT.

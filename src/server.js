require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { runTransactionExecution } = require('./jobs/transactionExecutionJob');

const PORT = Number(process.env.PORT || 3000);
const executionStore = new Map();

function nowIso() {
  return new Date().toISOString();
}

function buildExecutionResponse(execution) {
  return {
    executionId: execution.executionId,
    status: execution.status,
    step: execution.step,
    progress: execution.progress,
    createdAt: execution.createdAt,
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    metrics: execution.metrics,
    artifacts: execution.artifacts,
    error: execution.error,
    request: execution.request
  };
}

function buildStatusResponse(execution) {
  return {
    executionId: execution.executionId,
    status: execution.status,
    step: execution.step,
    progress: execution.progress,
    finishedAt: execution.finishedAt
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function notFound(res) {
  return sendJson(res, 404, {
    message: 'Recurso não encontrado'
  });
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error('Body excede limite de 1MB'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('JSON inválido no corpo da requisição'));
      }
    });

    req.on('error', reject);
  });
}

function validateStartPayload(body) {
  if (body.banks !== undefined && !Array.isArray(body.banks)) {
    return 'Campo "banks" deve ser um array de IDs';
  }

  if (body.options !== undefined && (typeof body.options !== 'object' || body.options === null || Array.isArray(body.options))) {
    return 'Campo "options" deve ser um objeto';
  }

  if (body.sheet !== undefined && (typeof body.sheet !== 'object' || body.sheet === null || Array.isArray(body.sheet))) {
    return 'Campo "sheet" deve ser um objeto';
  }

  if (body.artifacts !== undefined && (typeof body.artifacts !== 'object' || body.artifacts === null || Array.isArray(body.artifacts))) {
    return 'Campo "artifacts" deve ser um objeto';
  }

  if (body.artifacts && body.artifacts.csvEnabled !== undefined && typeof body.artifacts.csvEnabled !== 'boolean') {
    return 'Campo "artifacts.csvEnabled" deve ser boolean';
  }

  return null;
}

function isEmptyPayload(body) {
  return body && typeof body === 'object' && Object.keys(body).length === 0;
}

function normalizeStartPayload(body) {
  if (isEmptyPayload(body)) {
    return {
      sheet: { enabled: true },
      artifacts: { csvEnabled: false }
    };
  }

  return body;
}

function createExecution(requestPayload) {
  const executionId = randomUUID();
  const execution = {
    executionId,
    status: 'QUEUED',
    step: 'QUEUED',
    progress: 0,
    createdAt: nowIso(),
    startedAt: null,
    finishedAt: null,
    metrics: {
      transactionsFetched: 0,
      installmentsCreated: 0,
      duplicatesRemoved: 0
    },
    artifacts: {
      csvPath: null,
      removedCsvPath: null
    },
    error: null,
    request: requestPayload
  };

  executionStore.set(executionId, execution);
  return execution;
}

async function startExecution(execution) {
  execution.status = 'RUNNING';
  execution.step = 'STARTED';
  execution.progress = 1;
  execution.startedAt = nowIso();

  try {
    const result = await runTransactionExecution(execution.request, ({ step, progress }) => {
      execution.step = step;
      execution.progress = progress;
    });

    execution.status = 'COMPLETED';
    execution.step = 'DONE';
    execution.progress = 100;
    execution.finishedAt = nowIso();
    execution.metrics = result.metrics;
    execution.artifacts = result.artifacts;
  } catch (error) {
    execution.status = 'FAILED';
    execution.step = 'ERROR';
    execution.finishedAt = nowIso();
    execution.error = {
      code: 'EXECUTION_FAILED',
      message: error.message
    };
  }
}

function getOpenApiSpec() {
  const specPath = path.join(__dirname, 'swagger', 'openapi.json');
  const raw = fs.readFileSync(specPath, 'utf8');
  const spec = JSON.parse(raw);
  return spec;
}

function getSwaggerHtml() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Olivia API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui'
      });
    </script>
  </body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', timestamp: nowIso() });
  }

  if (req.method === 'GET' && pathname === '/swagger.json') {
    const spec = getOpenApiSpec();
    spec.servers = [{ url: `http://${req.headers.host}` }];
    return sendJson(res, 200, spec);
  }

  if (req.method === 'GET' && (pathname === '/docs' || pathname === '/docs/')) {
    const html = getSwaggerHtml();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/executions/transactions') {
    try {
      const body = await getBody(req);
      const validationError = validateStartPayload(body);

      if (validationError) {
        return sendJson(res, 400, { message: validationError });
      }

      const execution = createExecution(normalizeStartPayload(body));
      setImmediate(() => {
        startExecution(execution);
      });

      return sendJson(res, 202, {
        executionId: execution.executionId,
        status: execution.status,
        createdAt: execution.createdAt,
        links: {
          self: `/v1/executions/transactions/${execution.executionId}`,
          status: `/v1/executions/transactions/${execution.executionId}/status`
        }
      });
    } catch (error) {
      return sendJson(res, 400, { message: error.message });
    }
  }

  if (req.method === 'GET' && pathname === '/v1/executions/transactions') {
    const executions = Array.from(executionStore.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(buildExecutionResponse);

    return sendJson(res, 200, {
      total: executions.length,
      items: executions
    });
  }

  const statusMatch = pathname.match(/^\/v1\/executions\/transactions\/([^/]+)\/status$/);
  if (req.method === 'GET' && statusMatch) {
    const executionId = statusMatch[1];
    const execution = executionStore.get(executionId);

    if (!execution) {
      return sendJson(res, 404, {
        message: 'Execução não encontrada',
        executionId
      });
    }

    return sendJson(res, 200, buildStatusResponse(execution));
  }

  const executionMatch = pathname.match(/^\/v1\/executions\/transactions\/([^/]+)$/);
  if (req.method === 'GET' && executionMatch) {
    const executionId = executionMatch[1];
    const execution = executionStore.get(executionId);

    if (!execution) {
      return sendJson(res, 404, {
        message: 'Execução não encontrada',
        executionId
      });
    }

    return sendJson(res, 200, buildExecutionResponse(execution));
  }

  return notFound(res);
});

server.listen(PORT, () => {
  console.log(`API executando em http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/docs`);
});

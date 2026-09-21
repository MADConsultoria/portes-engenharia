const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const QUESTIONS = [
  'Qual é o seu objetivo com uma operação imobiliária?',
  'Em quanto tempo você pretende iniciar a operação?',
  'Qual é o seu perfil profissional?',
  'Qual é a sua renda mensal comprovável?',
  'Qual foi a sua movimentação financeira recorrente nos últimos meses?',
  'Você possui outras fontes de renda recorrentes?',
  'Qual é a sua faixa de idade?',
  'Pretende estruturar a operação junto com outra pessoa?',
  'Qual é a sua situação em relação ao terreno?',
  'Qual é o tamanho aproximado da operação pretendida?',
];

const root = path.resolve(__dirname);
const basePath = '/viabilidade-estrategica';
const port = Number(process.env.PORT || 8000);
const rateLimit = new Map();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function isRateLimited(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const recent = (rateLimit.get(ip) || []).filter((time) => now - time < 10 * 60 * 1000);
  recent.push(now);
  rateLimit.set(ip, recent);
  return recent.length > 5;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > 32 * 1024) {
        tooLarge = true;
        body = '';
      }
    });
    req.on('end', () => {
      if (tooLarge) return reject(new Error('PAYLOAD_TOO_LARGE'));
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validateLead(data) {
  const nome = typeof data.nome === 'string' ? data.nome.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const fone = typeof data.fone === 'string' ? data.fone.trim() : '';
  const answers = Array.isArray(data.answers) ? data.answers.map((answer) => String(answer).trim()) : [];

  if (data.website) return { bot: true };
  if (nome.length < 2 || nome.length > 120) return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (fone.length < 8 || fone.length > 30) return null;
  if (answers.length !== QUESTIONS.length || answers.some((answer) => !answer || answer.length > 180)) return null;

  return { nome, email, fone, answers };
}

function buildTaskDescription(lead, req) {
  const answers = QUESTIONS.map((question, index) =>
    `### ${index + 1}. ${question}\n${lead.answers[index]}`
  ).join('\n\n');
  const referer = String(req.headers.referer || 'Nao informado').slice(0, 500);

  return [
    '## Contato',
    `- **Nome:** ${lead.nome}`,
    `- **E-mail:** ${lead.email}`,
    `- **WhatsApp:** ${lead.fone}`,
    '',
    '## Respostas da analise',
    answers,
    '',
    '## Origem',
    `- **Pagina:** ${referer}`,
    `- **Recebido em:** ${new Date().toISOString()}`,
  ].join('\n');
}

function classifyClickUpError(detail) {
  const message = detail.toLowerCase();
  if (message.includes('list')) return 'LIST_ID';
  if (message.includes('token') || message.includes('auth') || message.includes('oauth')) return 'AUTH';
  if (message.includes('required')) return 'REQUIRED_FIELD';
  if (message.includes('markdown') || message.includes('description') || message.includes('payload')) return 'PAYLOAD';
  if (message.includes('name')) return 'TASK_NAME';
  return '';
}

async function createClickUpTask(lead, req) {
  const token = String(process.env.CLICKUP_API_TOKEN || '').trim();
  const listId = String(process.env.CLICKUP_LIST_ID || '').trim();
  const apiBase = process.env.CLICKUP_API_BASE_URL || 'https://api.clickup.com/api/v2';

  if (!token || !listId) throw new Error('CLICKUP_NOT_CONFIGURED');

  const response = await fetch(`${apiBase}/list/${encodeURIComponent(listId)}/task`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Lead LP | ${lead.nome}`,
      markdown_content: buildTaskDescription(lead, req),
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error(`ClickUp API error ${response.status}: ${detail}`);
    const error = new Error('CLICKUP_REQUEST_FAILED');
    error.diagnostic = `CLICKUP_${response.status}`;
    const category = classifyClickUpError(detail);
    try {
      const parsed = JSON.parse(detail);
      if (parsed.ECODE) error.diagnostic += `_${String(parsed.ECODE).replace(/[^A-Z0-9_-]/gi, '')}`;
    } catch {
      // The HTTP status is enough when ClickUp does not return JSON.
    }
    if (category) error.diagnostic += `_${category}`;
    throw error;
  }
}

async function handleLead(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    return res.end();
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return sendJson(res, 415, { ok: false, error: 'Formato de envio invalido.' });
  }
  if (isRateLimited(req)) {
    return sendJson(res, 429, { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' });
  }

  try {
    const lead = validateLead(await readJson(req));
    if (lead && lead.bot) return sendJson(res, 200, { ok: true });
    if (!lead) return sendJson(res, 400, { ok: false, error: 'Confira os dados informados.' });

    await createClickUpTask(lead, req);
    return sendJson(res, 201, { ok: true });
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') {
      return sendJson(res, 413, { ok: false, error: 'Dados enviados excedem o limite.' });
    }
    if (error.message === 'INVALID_JSON') {
      return sendJson(res, 400, { ok: false, error: 'Dados de envio invalidos.' });
    }
    if (error.message === 'CLICKUP_NOT_CONFIGURED') {
      console.error('Set CLICKUP_API_TOKEN and CLICKUP_LIST_ID before receiving leads.');
      return sendJson(res, 503, {
        ok: false,
        error: 'Integracao temporariamente indisponivel.',
        diagnostic: 'CLICKUP_NOT_CONFIGURED',
      });
    }
    if (error.message === 'CLICKUP_REQUEST_FAILED') {
      return sendJson(res, 424, {
        ok: false,
        error: 'O ClickUp recusou o cadastro.',
        diagnostic: error.diagnostic || 'CLICKUP_REQUEST_FAILED',
      });
    }
    console.error('Lead submission failed:', error);
    return sendJson(res, 424, {
      ok: false,
      error: 'Nao foi possivel registrar seus dados agora.',
      diagnostic: 'CLICKUP_CONNECTION_FAILED',
    });
  }
}

const server = http.createServer(async (req, res) => {
  let reqPath;
  try {
    reqPath = decodeURIComponent(url.parse(req.url).pathname);
  } catch {
    return sendJson(res, 400, { ok: false, error: 'URL invalida.' });
  }

  if (reqPath === basePath || reqPath === `${basePath}/`) {
    reqPath = '/index.html';
  } else if (reqPath.startsWith(`${basePath}/`)) {
    reqPath = reqPath.slice(basePath.length);
  } else if (reqPath === '/') {
    reqPath = '/index.html';
  }

  if (reqPath === '/api/leads') return handleLead(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  if (reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = path.resolve(root, `.${reqPath}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`Not found: ${reqPath}`);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

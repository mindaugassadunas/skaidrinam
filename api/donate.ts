import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = new Set([
  'https://skaidrinam.lt',
  'https://www.skaidrinam.lt',
  'https://skaidrinam.webflow.io',
]);

function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const projectId = process.env.PAYSERA_PROJECT_ID;
    const signPassword = process.env.PAYSERA_SIGN_PASSWORD;

    if (!projectId || !signPassword) {
      sendJson(res, 500, { error: 'Server misconfigured' });
      return;
    }

    const raw = await readBody(req);
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON' });
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      sendJson(res, 400, { error: 'Invalid JSON' });
      return;
    }

    const amount = (parsed as { amount?: unknown }).amount;
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount < 100 ||
      amount > 1000000
    ) {
      sendJson(res, 400, { error: 'Invalid amount' });
      return;
    }

    const params: Record<string, string> = {
      projectid: projectId,
      orderid: `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      accepturl: 'https://skaidrinam.lt/aciu',
      cancelurl: 'https://skaidrinam.lt/parama',
      callbackurl: 'https://skaidrinam.vercel.app/api/callback',
      amount: String(amount),
      currency: 'EUR',
      country: 'LT',
      version: '1.6',
      test: '0',
    };

    const data = Buffer.from(new URLSearchParams(params).toString())
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const sign = crypto
      .createHash('md5')
      .update(data + signPassword)
      .digest('hex');

    sendJson(res, 200, { url: `https://www.paysera.com/pay/?data=${data}&sign=${sign}` });
  } catch (err) {
    console.error('donate_handler_error', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal error' });
    }
  }
}

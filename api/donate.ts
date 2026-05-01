import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

const ALLOWED_ORIGIN = 'https://skaidrinam.lt';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const projectId = process.env.PAYSERA_PROJECT_ID;
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD;

  if (!projectId || !signPassword) {
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const amount = (body as { amount?: unknown }).amount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 100 || amount > 1000000) {
    res.status(400).json({ error: 'Invalid amount' });
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

  res.status(200).json({ url: `https://www.paysera.com/pay/?data=${data}&sign=${sign}` });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

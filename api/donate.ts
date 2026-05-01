import crypto from 'node:crypto';

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = 'https://skaidrinam.lt';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const projectId = process.env.PAYSERA_PROJECT_ID;
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD;

  if (!projectId || !signPassword) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500, headers: corsHeaders });
  }

  let amount: unknown;
  try {
    ({ amount } = await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 100 || amount > 1000000) {
    return Response.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders });
  }

  const params: Record<string, string> = {
    projectid: projectId,
    orderid: `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    accepturl: 'https://skaidrinam.lt/aciu',
    cancelurl: 'https://skaidrinam.lt/parama',
    callbackurl: 'https://paysera-donate-skaidrinam.vercel.app/api/callback',
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

  return Response.json(
    { url: `https://www.paysera.com/pay/?data=${data}&sign=${sign}` },
    { headers: corsHeaders }
  );
}

import crypto from 'node:crypto';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD;
  const projectId = process.env.PAYSERA_PROJECT_ID;

  if (!signPassword || !projectId) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const url = new URL(req.url);
  const data = url.searchParams.get('data');
  const ss1 = url.searchParams.get('ss1');

  if (!data || !ss1) {
    return new Response('Missing parameters', { status: 400 });
  }

  const expectedSs1 = crypto
    .createHash('md5')
    .update(data + signPassword)
    .digest('hex');

  if (expectedSs1 !== ss1) {
    return new Response('Invalid signature', { status: 400 });
  }

  const decoded = Buffer.from(
    data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf-8');

  const payload = Object.fromEntries(new URLSearchParams(decoded));

  if (payload.projectid !== projectId) {
    return new Response('Invalid project', { status: 400 });
  }

  if (payload.status !== '1') {
    return new Response('OK', { status: 200 });
  }

  console.log('paysera_payment_confirmed', {
    orderid: payload.orderid,
    amount: payload.amount,
    currency: payload.currency,
    payamount: payload.payamount,
    paycurrency: payload.paycurrency,
    payer_email: payload.p_email,
    payment: payload.payment,
    requestid: payload.requestid,
  });

  return new Response('OK', { status: 200 });
}

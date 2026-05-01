import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD;
  const projectId = process.env.PAYSERA_PROJECT_ID;

  if (!signPassword || !projectId) {
    res.status(500).send('Server misconfigured');
    return;
  }

  const data = typeof req.query.data === 'string' ? req.query.data : null;
  const ss1 = typeof req.query.ss1 === 'string' ? req.query.ss1 : null;

  if (!data || !ss1) {
    res.status(400).send('Missing parameters');
    return;
  }

  const expectedSs1 = crypto
    .createHash('md5')
    .update(data + signPassword)
    .digest('hex');

  if (expectedSs1 !== ss1) {
    res.status(400).send('Invalid signature');
    return;
  }

  const decoded = Buffer.from(
    data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf-8');

  const payload = Object.fromEntries(new URLSearchParams(decoded));

  if (payload.projectid !== projectId) {
    res.status(400).send('Invalid project');
    return;
  }

  if (payload.status === '1') {
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
  }

  res.status(200).send('OK');
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const signPassword = process.env.PAYSERA_SIGN_PASSWORD;
    const projectId = process.env.PAYSERA_PROJECT_ID;

    if (!signPassword || !projectId) {
      res.statusCode = 500;
      res.end('Server misconfigured');
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const data = url.searchParams.get('data');
    const ss1 = url.searchParams.get('ss1');

    if (!data || !ss1) {
      res.statusCode = 400;
      res.end('Missing parameters');
      return;
    }

    const expectedSs1 = crypto
      .createHash('md5')
      .update(data + signPassword)
      .digest('hex');

    if (expectedSs1 !== ss1) {
      res.statusCode = 400;
      res.end('Invalid signature');
      return;
    }

    const decoded = Buffer.from(
      data.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf-8');

    const payload = Object.fromEntries(new URLSearchParams(decoded));

    if (payload.projectid !== projectId) {
      res.statusCode = 400;
      res.end('Invalid project');
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

    res.statusCode = 200;
    res.end('OK');
  } catch (err) {
    console.error('callback_handler_error', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal error');
    }
  }
}

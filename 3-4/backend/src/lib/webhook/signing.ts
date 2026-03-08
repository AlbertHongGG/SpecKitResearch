import crypto from 'node:crypto';

export type SignatureResult = {
  timestamp: number;
  signature: string;
  headerValue: string;
};

export function signRawBody(secret: string, rawBody: Buffer, timestampSec?: number): SignatureResult {
  const timestamp = timestampSec ?? Math.floor(Date.now() / 1000);
  const message = Buffer.concat([Buffer.from(String(timestamp) + '.'), rawBody]);
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const headerValue = `t=${timestamp},v1=${digest}`;
  return { timestamp, signature: digest, headerValue };
}

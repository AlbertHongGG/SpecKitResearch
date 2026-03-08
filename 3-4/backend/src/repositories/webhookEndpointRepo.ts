import { getPrisma } from '../lib/db.js';
import { decryptSecret, encryptSecret, generateSigningSecret, maskSecret } from '../lib/webhook/secrets.js';

export async function listWebhookEndpointsByUser(userId: string) {
  const prisma = getPrisma();
  const items = await prisma.webhookEndpoint.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return items.map((e) => {
    const current = decryptSecret(e.currentSecretCiphertext);
    return {
      id: e.id,
      url: e.url,
      grace_sec: e.graceSec,
      last_rotated_at: e.lastRotatedAt?.toISOString() ?? null,
      previous_valid_until: e.previousValidUntil?.toISOString() ?? null,
      secret_masked: maskSecret(current),
    };
  });
}

export async function createEndpointIfMissing(input: {
  userId: string;
  url: string;
  graceSec: number;
}): Promise<
  | { created: false; endpointId: string }
  | { created: true; endpointId: string; signingSecretCurrent: string }
> {
  const prisma = getPrisma();

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { userId: input.userId, url: input.url },
  });
  if (existing) return { created: false, endpointId: existing.id };

  const secret = generateSigningSecret();
  const created = await prisma.webhookEndpoint.create({
    data: {
      userId: input.userId,
      url: input.url,
      currentSecretCiphertext: encryptSecret(secret),
      graceSec: input.graceSec,
    },
  });

  return { created: true, endpointId: created.id, signingSecretCurrent: secret };
}

export async function getEndpointForUser(endpointId: string, userId: string) {
  const prisma = getPrisma();
  return prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, userId },
  });
}

export async function rotateEndpointSecret(endpointId: string, userId: string) {
  const prisma = getPrisma();
  const endpoint = await getEndpointForUser(endpointId, userId);
  if (!endpoint) return null;

  const now = new Date();
  const newSecret = generateSigningSecret();
  const previous = endpoint.currentSecretCiphertext;

  const updated = await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      previousSecretCiphertext: previous,
      currentSecretCiphertext: encryptSecret(newSecret),
      previousValidUntil: new Date(now.getTime() + endpoint.graceSec * 1000),
      lastRotatedAt: now,
    },
  });

  const currentMasked = maskSecret(newSecret);

  return {
    signingSecretCurrent: newSecret,
    endpoint: {
      id: updated.id,
      url: updated.url,
      grace_sec: updated.graceSec,
      last_rotated_at: updated.lastRotatedAt?.toISOString() ?? null,
      previous_valid_until: updated.previousValidUntil?.toISOString() ?? null,
      secret_masked: currentMasked,
    },
  };
}

export async function getSigningSecretForEndpoint(endpointId: string): Promise<string | null> {
  const prisma = getPrisma();
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) return null;
  return decryptSecret(endpoint.currentSecretCiphertext);
}

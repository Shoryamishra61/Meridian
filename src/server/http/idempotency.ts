import { createHash } from 'crypto';

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export function readIdempotencyKey(request: Request): string | null {
  const key = request.headers.get('idempotency-key');
  if (!key) return null;
  const normalized = key.trim();
  return normalized.length >= 12 && normalized.length <= 128 ? normalized : null;
}

export function buildIdempotencyFingerprint(options: {
  actorId: string;
  operation: string;
  body: unknown;
}) {
  return {
    actorId: options.actorId,
    operation: options.operation,
    requestHash: hashRequestBody(options.body),
  };
}

const buckets = new Map<string, { count: number; resetsAt: number }>();

export function checkInMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, resetsAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false as const, remaining: 0, resetsAt: current.resetsAt };
  }

  current.count += 1;
  return { ok: true as const, remaining: limit - current.count, resetsAt: current.resetsAt };
}

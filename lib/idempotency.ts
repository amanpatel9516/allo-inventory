import { redis } from './redis';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function withIdempotency<T>(
  key: string | null | undefined,
  handler: () => Promise<{ status: number; body: T }>
): Promise<{ status: number; body: T; fromCache: boolean }> {
  if (!key) return { ...(await handler()), fromCache: false };
  
  const redisKey = `idempotency:${key}`;
  const cached = await redis.get(redisKey);
  
  if (cached) {
    try {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { ...parsed, fromCache: true };
    } catch (e) {
      console.error('Failed to parse cached response', e);
      // Fall through to normal handler if cache is corrupted
    }
  }
  
  const result = await handler();
  
  // Only cache successful responses (2xx)
  if (result.status >= 200 && result.status < 300) {
    await redis.set(redisKey, JSON.stringify(result), { px: IDEMPOTENCY_TTL_MS });
  }
  
  return { ...result, fromCache: false };
}

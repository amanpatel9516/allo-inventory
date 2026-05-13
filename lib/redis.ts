import { Redis } from '@upstash/redis';

// Create a mock redis if no URL is provided, to allow local development
// without requiring an Upstash account immediately.
const createRedisClient = () => {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    return new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    });
  }
  
  console.warn('⚠️ REDIS_URL or REDIS_TOKEN is missing. Using a mock Redis client for development.');
  
  // Mock Redis for local dev if keys are not present
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) || null,
    set: async (key: string, value: string, opts?: { px?: number }) => {
      store.set(key, value);
      if (opts?.px) {
        setTimeout(() => store.delete(key), opts.px);
      }
      return 'OK';
    },
  } as unknown as Redis;
};

export const redis = createRedisClient();

import Redis from 'ioredis';

// In-Memory Fallback Cache for local dev without active Redis
class InMemoryRedis {
  private store: Map<string, { value: string; expiry: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(
    key: string,
    value: string,
    mode?: 'EX',
    seconds?: number,
    flag?: 'NX'
  ): Promise<'OK' | null> {
    if (flag === 'NX') {
      const existing = this.store.get(key);
      // Treat an expired entry as absent, same as real Redis.
      if (existing && Date.now() <= existing.expiry) {
        return null;
      }
    }
    const expiry = seconds ? Date.now() + seconds * 1000 : Infinity;
    // Map.set is synchronous, so within this single Node process there is
    // no window between the NX existence check above and this write for
    // another request to interleave - this mirrors real Redis's atomicity
    // for the in-memory dev fallback.
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    // Basic regex conversion from wildcard: slot_hold:* -> slot_hold:.*
    const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    const keys: string[] = [];

    const now = Date.now();
    this.store.forEach((item, key) => {
      if (now > item.expiry) {
        this.store.delete(key);
      } else if (regex.test(key)) {
        keys.push(key);
      }
    });
    return keys;
  }
}

// Global scope initialization to prevent multiple client creations on hot-reloading
declare global {
  var redisGlobal: Redis | InMemoryRedis | undefined;
}

let redis: Redis | InMemoryRedis;

if (process.env.REDIS_URL) {
  if (!globalThis.redisGlobal) {
    globalThis.redisGlobal = new Redis(process.env.REDIS_URL);
  }
  redis = globalThis.redisGlobal;
  console.log('Redis connected to external server.');
} else {
  if (!globalThis.redisGlobal) {
    console.log('REDIS_URL environment variable is missing. Initializing in-memory cache fallback.');
    globalThis.redisGlobal = new InMemoryRedis();
  }
  redis = globalThis.redisGlobal;
}

export { redis };
export default redis;
export type RedisClient = Redis | InMemoryRedis;

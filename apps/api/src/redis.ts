import { Redis } from '@upstash/redis';
import { log } from './logger';

let redisClient: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    log.success('⚡ Upstash Redis client initialized');
  } else {
    log.warn('⚠️ UPSTASH_REDIS_REST_URL/TOKEN not found in environment. Redis cache disabled.');
  }
} catch (err) {
  log.error(`❌ Failed to initialize Redis: ${err}`);
}

export const redis = redisClient;

export const CACHE_KEYS = {
  ALL_JADWAL: 'jadwal:all_2026_ganjil_v2',
};

// Cache TTL
const DEFAULT_TTL_SECONDS = 86400 * 7; // 7 hari di Redis
const L1_TTL_MS = 1000 * 60 * 60 * 24; // 24 jam di memori RAM lokal server

// L1 In-Process Memory Cache (Kecepatan: ~0.001 ms)
let l1CacheData: unknown = null;
let l1CacheExpiresAt = 0;

// Mutex / Single-Flight Promise Coalescing:
// Jika banyak request datang serentak saat L1 kosong, HANYA 1 request yang menyentuh Redis.
let pendingRedisFetch: Promise<{ data: any; source: 'l2-redis' } | null> | null = null;

export async function getCachedAllJadwal<T>(): Promise<{ data: T; source: 'l1-memory' | 'l2-redis' } | null> {
  // 1. Cek L1 Memory Cache (Kecepatan: ~0.001 ms)
  if (l1CacheData && Date.now() < l1CacheExpiresAt) {
    return {
      data: l1CacheData as T,
      source: 'l1-memory',
    };
  }

  // 2. Cek L2 Redis Upstash dengan Proteksi Single-Flight Mutex & Kompresi Gzip
  if (!redis) return null;

  if (pendingRedisFetch) {
    return pendingRedisFetch as Promise<{ data: T; source: 'l2-redis' } | null>;
  }

  pendingRedisFetch = (async () => {
    try {
      const raw = await redis.get<string | T>(CACHE_KEYS.ALL_JADWAL);
      if (!raw) return null;

      let data: T;
      if (typeof raw === 'string' && raw.startsWith('gz:')) {
        // Dekompresi payload Gzip Base64 (~173 KB -> 3.72 MB dalam ~25ms)
        const b64 = raw.slice(3);
        const decompressed = Bun.gunzipSync(Buffer.from(b64, 'base64'));
        data = JSON.parse(Buffer.from(decompressed).toString('utf-8')) as T;
      } else {
        data = raw as T;
      }

      // Simpan ke L1 RAM agar request berikutnya super instan (< 0.01 ms)
      l1CacheData = data;
      l1CacheExpiresAt = Date.now() + L1_TTL_MS;
      return {
        data,
        source: 'l2-redis' as const,
      };
    } catch (err) {
      log.warn(`⚠️ Redis GET error: ${err}`);
      return null;
    } finally {
      pendingRedisFetch = null;
    }
  })();

  return pendingRedisFetch;
}

export async function setCachedAllJadwal<T>(data: T, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  // 1. Simpan ke L1 RAM lokal terlebih dahulu (instan 0.001 ms)
  l1CacheData = data;
  l1CacheExpiresAt = Date.now() + L1_TTL_MS;

  // 2. Simpan ke L2 Redis secara terkompresi Gzip Bun (reduksi 95.4%, 173 KB vs 3.72 MB)
  if (!redis) return;
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const compressed = Bun.gzipSync(Buffer.from(jsonStr));
    const payload = 'gz:' + Buffer.from(compressed).toString('base64');
    await redis.set(CACHE_KEYS.ALL_JADWAL, payload, { ex: ttlSeconds });
  } catch (err) {
    log.warn(`⚠️ Redis SET error: ${err}`);
  }
}

export async function invalidateAllJadwalCache(): Promise<void> {
  // Bersihkan L1
  l1CacheData = null;
  l1CacheExpiresAt = 0;

  // Bersihkan L2
  if (!redis) return;
  try {
    await redis.del(CACHE_KEYS.ALL_JADWAL);
    log.info(`🧹 L1 RAM & L2 Redis cache ${CACHE_KEYS.ALL_JADWAL} cleared`);
  } catch (err) {
    log.warn(`⚠️ Redis DEL error: ${err}`);
  }
}

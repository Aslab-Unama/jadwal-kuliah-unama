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
  ALL_JADWAL: 'jadwal:all_v1',
};

// Cache TTL
const DEFAULT_TTL_SECONDS = 86400; // 24 jam di Redis
const L1_TTL_MS = 1000 * 60 * 60; // 1 jam di memori RAM lokal server

// L1 In-Process Memory Cache
let l1CacheData: unknown = null;
let l1CacheExpiresAt = 0;

// Mutex / Single-Flight Promise Coalescing:
// Jika 500 request datang serentak saat L1 kosong, HANYA 1 request yang menyentuh Redis.
// Request sisanya menunggu Promise yang sama selesai, sehingga Upstash Redis tidak pernah kebanjiran (anti-stampede).
let pendingRedisFetch: Promise<{ data: any; source: 'l2-redis' } | null> | null = null;

export async function getCachedAllJadwal<T>(): Promise<{ data: T; source: 'l1-memory' | 'l2-redis' } | null> {
  // 1. Cek L1 Memory Cache (Kecepatan: ~0.01 ms)
  if (l1CacheData && Date.now() < l1CacheExpiresAt) {
    return {
      data: l1CacheData as T,
      source: 'l1-memory',
    };
  }

  // 2. Cek L2 Redis Upstash dengan Proteksi Single-Flight Mutex
  if (!redis) return null;

  if (pendingRedisFetch) {
    return pendingRedisFetch as Promise<{ data: T; source: 'l2-redis' } | null>;
  }

  pendingRedisFetch = (async () => {
    try {
      const data = await redis.get<T>(CACHE_KEYS.ALL_JADWAL);
      if (data) {
        // Simpan ke L1 agar request berikutnya super instan
        l1CacheData = data;
        l1CacheExpiresAt = Date.now() + L1_TTL_MS;
        return {
          data,
          source: 'l2-redis' as const,
        };
      }
      return null;
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
  // Simpan ke L1
  l1CacheData = data;
  l1CacheExpiresAt = Date.now() + L1_TTL_MS;

  // Simpan ke L2 Redis
  if (!redis) return;
  try {
    await redis.set(CACHE_KEYS.ALL_JADWAL, data, { ex: ttlSeconds });
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
    log.info('🧹 L1 RAM & L2 Redis cache jadwal:all_v1 cleared');
  } catch (err) {
    log.warn(`⚠️ Redis DEL error: ${err}`);
  }
}

/**
 * In-Memory Sliding-Window IP Rate Limiter for ElysiaJS
 *
 * Mengamankan server dan Upstash Redis dari serangan DDoS, flooding, dan bot abuse
 * tanpa membebani external database/Redis untuk rate-limiting counter.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  /** Jendela waktu dalam milidetik (misal: 60000 = 1 menit) */
  windowMs: number;
  /** Jumlah maksimal request yang diizinkan dalam jendela waktu */
  maxRequests: number;
  /** Pesan error ketika limit tercapai */
  message?: string;
  /** Daftar IP yang dibebaskan (misal: localhost, internal server) */
  whitelist?: string[];
}

export class InMemoryRateLimiter {
  private hits = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private whitelist: Set<string>;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message || 'Terlalu banyak permintaan (Rate limit exceeded). Silakan tunggu sebentar.';
    this.whitelist = new Set(options.whitelist || ['127.0.0.1', '::1', 'localhost']);

    // Pembersihan otomatis setiap 2 menit agar memori RAM tidak membengkak
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  /**
   * Periksa apakah IP melebihi batas request
   */
  public check(ip: string): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
    totalInWindow: number;
  } {
    if (this.whitelist.has(ip)) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetMs: 0,
        totalInWindow: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.hits.get(ip);
    if (!record) {
      record = { timestamps: [] };
      this.hits.set(ip, record);
    }

    // Buang timestamp yang sudah lewat dari window saat ini
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0] || now;
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        totalInWindow: record.timestamps.length,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
      totalInWindow: record.timestamps.length,
    };
  }

  private cleanup(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [ip, record] of this.hits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.hits.delete(ip);
      }
    }
  }

  public getMessage(): string {
    return this.message;
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db, jadwalLab, mataKuliah, logNotifikasiPerubahan, asistenLab, absensiAslab, eq, ilike, and, or, desc, asc, sql } from '@jadwal/db';
import { httpLogger, log } from './logger';
import { getCachedAllJadwal, setCachedAllJadwal, invalidateAllJadwalCache } from './redis';
import { InMemoryRateLimiter } from './rate-limiter';
import { triggerSyncToday, triggerSyncFull, triggerStatusChangeSync, getCronStatus, startCronScheduler } from './cron';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Global API Limiter: 120 request per menit per IP
const apiRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many requests',
});

// Auth Route Limiter: 15 request per menit per IP (mencegah brute force secret code)
const authRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many requests',
});

// Single-Flight Mutex untuk /api/jadwal?all=true (mencegah thundering herd pada database Supabase)
let pendingAllDbFetch: Promise<any[]> | null = null;

export const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    })
  )
  .use(httpLogger)
  .onBeforeHandle(({ request, set }) => {
    // Ekstraksi Client IP dari Reverse Proxy / Cloudflare / Direct Connection
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    const clientIp = (cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1')) || 'unknown';

    const url = new URL(request.url);

    // Rate limit khusus endpoint auth (anti brute-force)
    if (url.pathname.startsWith('/api/auth/login')) {
      const authLimit = authRateLimiter.check(clientIp);
      if (!authLimit.allowed) {
        set.status = 429;
        set.headers['Retry-After'] = Math.ceil(authLimit.resetMs / 1000).toString();
        return {
          success: false,
          error: 'RateLimitExceeded',
          message: authRateLimiter.getMessage(),
          retryAfterSeconds: Math.ceil(authLimit.resetMs / 1000),
        };
      }
    }

    // Rate limit umum untuk semua route API (120 req / menit)
    // Kecualikan /api/time (probe waktu) dan /api/cron agar tidak pernah terblokir
    if (
      url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/api/time') &&
      !url.pathname.startsWith('/api/cron')
    ) {
      const check = apiRateLimiter.check(clientIp);
      set.headers['X-RateLimit-Limit'] = '120';
      set.headers['X-RateLimit-Remaining'] = check.remaining.toString();
      set.headers['X-RateLimit-Reset'] = Math.ceil(check.resetMs / 1000).toString();

      if (!check.allowed) {
        set.status = 429;
        set.headers['Retry-After'] = Math.ceil(check.resetMs / 1000).toString();
        return {
          success: false,
          error: 'RateLimitExceeded',
          message: apiRateLimiter.getMessage(),
          retryAfterSeconds: Math.ceil(check.resetMs / 1000),
        };
      }
    }
  })
  .get('/', () => ({
    success: true,
    message: 'Jadwal Kuliah UNAMA API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))
  .group('/api', (api) =>
    api
      .get('/time', () => {
        const now = new Date();
        return {
          success: true,
          timestamp: now.getTime(),
          iso: now.toISOString(),
          timezone: 'Asia/Jakarta',
        };
      })
      .get(
        '/jadwal',
        async ({ query }) => {
          const conditions = [];

          if (query.search) {
            const s = `%${query.search.trim()}%`;
            conditions.push(
              or(
                ilike(jadwalLab.mataKuliah, s),
                ilike(jadwalLab.dosen, s),
                ilike(jadwalLab.kodeKelas, s),
                ilike(jadwalLab.ruangan, s)
              )
            );
          }

          if (query.hari) {
            conditions.push(eq(jadwalLab.hari, query.hari));
          }
          if (query.tanggal) {
            conditions.push(eq(jadwalLab.tanggal, query.tanggal));
          }
          if (query.kampus) {
            conditions.push(eq(jadwalLab.kampus, query.kampus));
          }
          if (query.kodeKelas) {
            conditions.push(ilike(jadwalLab.kodeKelas, `%${query.kodeKelas}%`));
          }
          if (query.status) {
            conditions.push(eq(jadwalLab.status, query.status));
          }
          if (query.dosen) {
            conditions.push(ilike(jadwalLab.dosen, `%${query.dosen}%`));
          }
          if (query.mataKuliah) {
            conditions.push(ilike(jadwalLab.mataKuliah, `%${query.mataKuliah}%`));
          }
          const roomFilter = query.ruangan || query.ruangLabor;
          if (roomFilter) {
            conditions.push(ilike(jadwalLab.ruangan, `%${roomFilter}%`));
          }

          // Periksa apakah ada filter kriteria dari user sebelum kondisi dasar waktu ditambahkan
          const hasUserFilters = conditions.length > 0;

          // Perkuliahan dimulai minimal pukul 08:00 WIB (jadwal sebelum jam 08:00 diabaikan)
          conditions.push(sql`${jadwalLab.waktuMulai} >= '08:00'`);

          const isAll = query.all === 'true' || query.all === '1';
          const isFresh = query.fresh === 'true' || query.fresh === '1';
          const whereClause = and(...conditions);

          if (isAll) {
            // Jika tombol Perbarui diklik (fresh=true), bersihkan cache Redis & L1 terlebih dahulu
            if (isFresh) {
              await invalidateAllJadwalCache();
            }

            // 1. Cek Multi-Layer Cache (L1 Memory / L2 Redis) jika refresh browser biasa (bukan fresh)
            if (!hasUserFilters && !isFresh) {
              const cached = await getCachedAllJadwal<any[]>();
              if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
                return {
                  success: true,
                  source: cached.source,
                  pagination: {
                    total: cached.data.length,
                    limit: cached.data.length,
                    offset: 0,
                    hasMore: false,
                  },
                  data: cached.data,
                };
              }
            }

            // 2. Cache MISS / Fresh: Query Supabase PostgreSQL dengan Single-Flight Mutex (Anti-Thundering Herd)
            let items: any[];
            if (!hasUserFilters) {
              if (!pendingAllDbFetch) {
                pendingAllDbFetch = (async () => {
                  try {
                    return await db
                      .select({
                        id: jadwalLab.id,
                        hari: jadwalLab.hari,
                        tanggal: jadwalLab.tanggal,
                        waktuMulai: jadwalLab.waktuMulai,
                        dosen: jadwalLab.dosen,
                        kodeKelas: jadwalLab.kodeKelas,
                        mataKuliah: jadwalLab.mataKuliah,
                        kampus: jadwalLab.kampus,
                        ruangan: jadwalLab.ruangan,
                        status: jadwalLab.status,
                        sks: jadwalLab.sks,
                        waktuSelesai: jadwalLab.waktuSelesai,
                      })
                      .from(jadwalLab)
                      .where(whereClause)
                      .orderBy(asc(jadwalLab.waktuMulai), asc(jadwalLab.id));
                  } finally {
                    pendingAllDbFetch = null;
                  }
                })();
              }
              items = await pendingAllDbFetch;
            } else {
              items = await db
                .select({
                  id: jadwalLab.id,
                  hari: jadwalLab.hari,
                  tanggal: jadwalLab.tanggal,
                  waktuMulai: jadwalLab.waktuMulai,
                  dosen: jadwalLab.dosen,
                  kodeKelas: jadwalLab.kodeKelas,
                  mataKuliah: jadwalLab.mataKuliah,
                  kampus: jadwalLab.kampus,
                  ruangan: jadwalLab.ruangan,
                  status: jadwalLab.status,
                  sks: jadwalLab.sks,
                  waktuSelesai: jadwalLab.waktuSelesai,
                })
                .from(jadwalLab)
                .where(whereClause)
                .orderBy(asc(jadwalLab.waktuMulai), asc(jadwalLab.id));
            }

            // 3. Simpan ke Redis & L1 di BACKGROUND (TIDAK MEMBLOKIR response HTTP ke client!)
            if (!hasUserFilters && items.length > 0) {
              setCachedAllJadwal(items).catch((err) =>
                log.warn(`⚠️ Background cache write error: ${err}`)
              );
            }

            return {
              success: true,
              source: 'database',
              pagination: {
                total: items.length,
                limit: items.length,
                offset: 0,
                hasMore: false,
              },
              data: items,
            };
          }

          const limit = Math.min(query.limit ?? 50, 500);
          const offset = query.offset ?? 0;

          const [items, totalResult] = await Promise.all([
            db
              .select()
              .from(jadwalLab)
              .where(whereClause)
              .orderBy(asc(jadwalLab.waktuMulai), asc(jadwalLab.id))
              .limit(limit)
              .offset(offset),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(jadwalLab)
              .where(whereClause),
          ]);

          const total = totalResult[0]?.count ?? 0;

          return {
            success: true,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + items.length < total,
            },
            data: items,
          };
        },
        {
          query: t.Object({
            all: t.Optional(t.String()),
            fresh: t.Optional(t.String()),
            search: t.Optional(t.String()),
            hari: t.Optional(t.String()),
            tanggal: t.Optional(t.String()),
            dosen: t.Optional(t.String()),
            kampus: t.Optional(t.String()),
            kodeKelas: t.Optional(t.String()),
            mataKuliah: t.Optional(t.String()),
            ruangan: t.Optional(t.String()),
            ruangLabor: t.Optional(t.String()),
            status: t.Optional(t.String()),
            limit: t.Optional(t.Numeric({ default: 50, minimum: 1, maximum: 500 })),
            offset: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
          }),
        }
      )
      .get(
        '/jadwal/summary',
        async ({ query }) => {
          const conditions = [];

          if (query.search && query.search.trim() !== '') {
            const s = `%${query.search.trim()}%`;
            conditions.push(
              or(
                ilike(jadwalLab.mataKuliah, s),
                ilike(jadwalLab.dosen, s),
                ilike(jadwalLab.kodeKelas, s),
                ilike(jadwalLab.ruangan, s)
              )
            );
          }

          if (query.hari && query.hari !== 'Semua') {
            conditions.push(eq(jadwalLab.hari, query.hari));
          }

          if (query.tanggal && query.tanggal !== 'Semua' && query.tanggal.trim() !== '') {
            conditions.push(ilike(jadwalLab.tanggal, `%${query.tanggal.trim()}%`));
          }

          if (query.kampus && query.kampus !== 'Semua') {
            conditions.push(eq(jadwalLab.kampus, query.kampus));
          }

          const roomFilter = query.ruangan || query.ruangLabor;
          if (roomFilter && roomFilter !== 'Semua') {
            conditions.push(ilike(jadwalLab.ruangan, `%${roomFilter}%`));
          }

          // Perkuliahan dimulai minimal pukul 08:00 WIB (jadwal sebelum jam 08:00 diabaikan)
          conditions.push(sql`${jadwalLab.waktuMulai} >= '08:00'`);

          const whereClause = and(...conditions);

          const [totalCount, campuses, rooms, statusCounts] = await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(jadwalLab)
              .where(whereClause),
            db
              .selectDistinct({ kampus: jadwalLab.kampus })
              .from(jadwalLab)
              .where(sql`${jadwalLab.kampus} IS NOT NULL AND ${jadwalLab.kampus} != ''`),
            db
              .selectDistinct({ ruangan: jadwalLab.ruangan })
              .from(jadwalLab)
              .where(sql`${jadwalLab.ruangan} IS NOT NULL AND ${jadwalLab.ruangan} != ''`),
            db
              .select({
                status: jadwalLab.status,
                count: sql<number>`count(*)::int`,
              })
              .from(jadwalLab)
              .where(whereClause)
              .groupBy(jadwalLab.status),
          ]);

          const roomNames = rooms.map((r) => r.ruangan);

          let totalTatapMuka = 0;
          let totalOnline = 0;
          let totalCancel = 0;

          for (const item of statusCounts) {
            const s = item.status?.toLowerCase() || '';
            if (s.includes('tm') || s.includes('tatap muka')) {
              totalTatapMuka += item.count;
            } else if (s.includes('ol') || s.includes('online')) {
              totalOnline += item.count;
            } else if (s.includes('cancel') || s.includes('batal')) {
              totalCancel += item.count;
            }
          }

          return {
            success: true,
            data: {
              totalJadwal: totalCount[0]?.count ?? 0,
              totalTatapMuka,
              totalOnline,
              totalCancel,
              kampusList: campuses.map((c) => c.kampus),
              ruanganList: roomNames,
              ruangLaborList: roomNames,
            },
          };
        },
        {
          query: t.Object({
            tanggal: t.Optional(t.String()),
            hari: t.Optional(t.String()),
            kampus: t.Optional(t.String()),
            ruangan: t.Optional(t.String()),
            ruangLabor: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
        }
      )
      .get(
        '/jadwal/:id',
        async ({ params: { id }, set }) => {
          const [item] = await db
            .select()
            .from(jadwalLab)
            .where(eq(jadwalLab.id, id))
            .limit(1);

          if (!item) {
            set.status = 404;
            return {
              success: false,
              message: `Jadwal dengan ID ${id} tidak ditemukan`,
            };
          }

          return {
            success: true,
            data: item,
          };
        },
        {
          params: t.Object({
            id: t.Numeric(),
          }),
        }
      )
      .get(
        '/jadwal/validate-class/:code',
        async ({ params: { code }, set }) => {
          const raw = code.trim().toUpperCase();
          const [classPart, courseCodePart] = raw.split(':');
          const normalizedClass = classPart.trim();
          const normalizedCourse = courseCodePart ? courseCodePart.trim() : null;

          // 1. Validasi keberadaan kelas
          const [foundClass] = await db
            .select({
              kodeKelas: jadwalLab.kodeKelas,
              mataKuliah: jadwalLab.mataKuliah,
              dosen: jadwalLab.dosen,
            })
            .from(jadwalLab)
            .where(ilike(jadwalLab.kodeKelas, normalizedClass))
            .limit(1);

          if (!foundClass) {
            set.status = 404;
            return {
              success: false,
              valid: false,
              message: `Kelas "${normalizedClass}" tidak ditemukan di database jadwal`,
            };
          }

          // 2. Jika menyertakan kode mata kuliah, validasi kode MK tersebut
          if (normalizedCourse) {
            const [foundMk] = await db
              .select({
                kodeMk: mataKuliah.kodeMk,
                mataKuliah: mataKuliah.mataKuliah,
              })
              .from(mataKuliah)
              .where(ilike(mataKuliah.kodeMk, normalizedCourse))
              .limit(1);

            if (!foundMk) {
              set.status = 404;
              return {
                success: false,
                valid: false,
                message: `Kode mata kuliah "${normalizedCourse}" tidak ditemukan di database`,
              };
            }

            return {
              success: true,
              valid: true,
              data: {
                kodeKelas: normalizedClass,
                kodeMk: foundMk.kodeMk,
                mataKuliah: foundMk.mataKuliah,
              },
            };
          }

          return {
            success: true,
            valid: true,
            data: foundClass,
          };
        },
        {
          params: t.Object({
            code: t.String(),
          }),
        }
      )
      .get(
        '/jadwal/today/:code',
        async ({ params: { code }, query }) => {
          const normalized = code.trim().toUpperCase();
          const todayFormatted = (query?.tanggal as string) || new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(new Date());
          const altDate = todayFormatted.startsWith('0')
            ? todayFormatted.substring(1)
            : `0${todayFormatted}`;

          const items = await db
            .select()
            .from(jadwalLab)
            .where(
              and(
                ilike(jadwalLab.kodeKelas, normalized),
                or(
                  eq(jadwalLab.tanggal, todayFormatted),
                  eq(jadwalLab.tanggal, altDate)
                )
              )
            )
            .orderBy(asc(jadwalLab.waktuMulai), asc(jadwalLab.id));

          return {
            success: true,
            kodeKelas: normalized,
            tanggal: todayFormatted,
            total: items.length,
            data: items,
          };
        },
        {
          params: t.Object({
            code: t.String(),
          }),
          query: t.Optional(
            t.Object({
              tanggal: t.Optional(t.String()),
            })
          ),
        }
      )
      .post(
        '/auth/login',
        async ({ body, set }) => {
          const expectedSecret =
            process.env.ASLAB_SECRET_CODE || process.env.ADMIN_PASSWORD
          const { secretCode } = body;

          if (!secretCode || secretCode !== expectedSecret) {
            set.status = 401;
            return {
              success: false,
              message: 'Secret code tidak valid. Akses ditolak.',
            };
          }

          const timestamp = Date.now();
          const token = Buffer.from(`aslab:${timestamp}`).toString('base64');

          return {
            success: true,
            message: 'Login berhasil sebagai Asisten Laboratorium',
            data: {
              token,
              role: 'aslab',
              authenticatedAt: new Date().toISOString(),
            },
          };
        },
        {
          body: t.Object({
            secretCode: t.String(),
          }),
        }
      )
      .get('/auth/verify', async ({ headers, set }) => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          set.status = 401;
          return {
            success: false,
            message: 'Sesi tidak ditemukan atau kadaluarsa',
          };
        }

        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          if (!decoded.startsWith('aslab:')) {
            set.status = 401;
            return {
              success: false,
              message: 'Sesi tidak valid',
            };
          }

          return {
            success: true,
            authenticated: true,
            role: 'aslab',
          };
        } catch {
          set.status = 401;
          return {
            success: false,
            message: 'Sesi tidak valid',
          };
        }
      })
      .post('/cache/clear', async () => {
        await invalidateAllJadwalCache();
        return {
          success: true,
          message: 'Cache Redis jadwal berhasil dibersihkan',
        };
      })
      .group('/aslab', (aslabGroup) =>
        aslabGroup
          .get('/asisten', async () => {
            const list = await db
              .select()
              .from(asistenLab)
              .where(eq(asistenLab.isActive, true))
              .orderBy(asc(asistenLab.ruangan), asc(asistenLab.nama));

            return {
              success: true,
              data: list,
            };
          })
          .get(
            '/absensi',
            async ({ query }) => {
              const conditions = [];
              if (query?.tanggal) {
                conditions.push(eq(absensiAslab.tanggal, query.tanggal));
              }
              const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

              const items = await db
                .select()
                .from(absensiAslab)
                .where(whereClause)
                .orderBy(desc(absensiAslab.id));

              return {
                success: true,
                total: items.length,
                data: items,
              };
            },
            {
              query: t.Optional(
                t.Object({
                  tanggal: t.Optional(t.String()),
                })
              ),
            }
          )
          .post(
            '/absen',
            async ({ body, set }) => {
              const {
                jadwalId,
                tanggal,
                jamMasuk,
                waktuMulai,
                waktuSelesai,
                ruangan,
                kampus,
                kodeKelas,
                mataKuliah,
                dosen,
                statusPerkuliahan,
                namaAsisten,
              } = body;

              // 1. Validasi hari ini (hanya jadwal hari ini yang boleh diabsen)
              const todayWibStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
              let parsedTanggalIso = body.tanggalIso;
              if (!parsedTanggalIso) {
                const months: Record<string, string> = {
                  januari: '01', februari: '02', maret: '03', april: '04',
                  mei: '05', juni: '06', juli: '07', agustus: '08',
                  september: '09', oktober: '10', november: '11', desember: '12'
                };
                const parts = tanggal.trim().split(' ');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = months[parts[1].toLowerCase()] || '01';
                  const year = parts[2];
                  parsedTanggalIso = `${year}-${month}-${day}`;
                }
              }

              if (parsedTanggalIso && parsedTanggalIso !== todayWibStr) {
                set.status = 400;
                return {
                  success: false,
                  message: 'Belum bisa absen. Absensi hanya dapat dilakukan untuk perkuliahan hari ini.',
                };
              }

              // 2. Validasi fingerprint unik untuk anti duplikasi
              const fingerprint = `${tanggal.trim()}_${kodeKelas.trim()}_${ruangan.trim()}_${waktuMulai.trim()}`;

              const existing = await db
                .select()
                .from(absensiAslab)
                .where(eq(absensiAslab.fingerprint, fingerprint))
                .limit(1);

              if (existing.length > 0) {
                set.status = 409;
                return {
                  success: false,
                  alreadySubmitted: true,
                  message: `Jadwal ini sudah diabsen sebelumnya oleh ${existing[0].namaAsisten}.`,
                  data: existing[0],
                };
              }

              // 2. Format tanggal ISO (YYYY-MM-DD) untuk Google Form
              let tanggalIso = body.tanggalIso;
              if (!tanggalIso) {
                const months: Record<string, string> = {
                  januari: '01', februari: '02', maret: '03', april: '04',
                  mei: '05', juni: '06', juli: '07', agustus: '08',
                  september: '09', oktober: '10', november: '11', desember: '12'
                };
                const parts = tanggal.trim().split(' ');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = months[parts[1].toLowerCase()] || '01';
                  const year = parts[2];
                  tanggalIso = `${year}-${month}-${day}`;
                } else {
                  tanggalIso = new Date().toISOString().slice(0, 10);
                }
              }

              // 3. Normalisasi nomor lab untuk dropdown Google Form (misal: '1.9 Kobar')
              let nomorLab = body.nomorLab;
              if (!nomorLab) {
                const labMatch = ruangan.match(/(\d+\.\d+)/);
                const num = labMatch ? labMatch[1] : '';
                const isKobar = kampus.toLowerCase().includes('kobar');
                const isThehok = kampus.toLowerCase().includes('thehok');
                if (num && isKobar) nomorLab = `${num} Kobar`;
                else if (num && isThehok) nomorLab = `${num} Thehok`;
                else if (ruangan.toLowerCase().includes('cisco')) nomorLab = '4.3 Thehok';
                else if (ruangan.toLowerCase().includes('pasca') || ruangan.toLowerCase().includes('s2')) nomorLab = 'Lab S2';
                else nomorLab = ruangan;
              }

              // 4. Kirim data langsung ke Google Form endpoint formResponse
              const GOOGLE_FORM_RESPONSE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdSoyuDSrcccQN4brn_dAt3O_aoWeGVf5Qe9Z6miy6JhqBf6A/formResponse';

              const dateParts = tanggalIso.split('-');
              const year = dateParts[0] || '2026';
              const month = dateParts[1] || '10';
              const day = dateParts[2] || '01';

              const formParams = new URLSearchParams({
                'entry.146029558': dosen,
                'entry.404112387': mataKuliah,
                'entry.380055525': kodeKelas,
                'entry.1558064062': statusPerkuliahan,
                'entry.1210016936': tanggalIso,
                'entry.1210016936_year': year,
                'entry.1210016936_month': month,
                'entry.1210016936_day': day,
                'entry.1292956818': jamMasuk,
                'entry.1658465425': namaAsisten,
                'entry.1487398951': nomorLab,
                'fvv': '1',
                'pageHistory': '0',
              });

              let gformStatus = 'SUCCESS';
              try {
                const res = await fetch(GOOGLE_FORM_RESPONSE_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  },
                  body: formParams.toString(),
                });

                const resText = await res.text();
                const isSuccess =
                  res.status === 200 ||
                  res.status === 302 ||
                  resText.includes('freebirdFormviewerViewResponseConfirmationMessage') ||
                  resText.includes('Tanggapan Anda telah dicatat') ||
                  resText.includes('response has been recorded');

                if (!isSuccess) {
                  gformStatus = 'FAILED';
                }
              } catch (fetchErr) {
                log.error(`Gagal mengirim ke Google Form: ${fetchErr}`);
                gformStatus = 'FAILED';
              }

              // 5. Simpan catatan ke database absensi_aslab
              const [saved] = await db
                .insert(absensiAslab)
                .values({
                  jadwalId: jadwalId || null,
                  tanggal,
                  tanggalIso,
                  jamMasuk,
                  waktuMulai,
                  waktuSelesai: waktuSelesai || null,
                  ruangan,
                  kampus,
                  nomorLab,
                  kodeKelas,
                  mataKuliah,
                  dosen,
                  statusPerkuliahan,
                  namaAsisten,
                  statusGform: gformStatus,
                  fingerprint,
                })
                .returning();

              return {
                success: true,
                message: gformStatus === 'SUCCESS'
                  ? 'Absensi berhasil dikirim ke Google Form dan tersimpan di database!'
                  : 'Absensi tersimpan di database, tetapi respon Google Form terkendala.',
                data: saved,
              };
            },
            {
              body: t.Object({
                jadwalId: t.Optional(t.Numeric()),
                tanggal: t.String(),
                tanggalIso: t.Optional(t.String()),
                jamMasuk: t.String(),
                waktuMulai: t.String(),
                waktuSelesai: t.Optional(t.String()),
                ruangan: t.String(),
                kampus: t.String(),
                nomorLab: t.Optional(t.String()),
                kodeKelas: t.String(),
                mataKuliah: t.String(),
                dosen: t.String(),
                statusPerkuliahan: t.String(),
                namaAsisten: t.String(),
              }),
            }
          )
      )
      .group('/notifications', (notifGroup) =>
        notifGroup
          .get(
            '/pending',
            async ({ query }) => {
              const limit = Math.min(query?.limit ? parseInt(query.limit, 10) : 50, 100);
              const items = await db
                .select()
                .from(logNotifikasiPerubahan)
                .where(eq(logNotifikasiPerubahan.statusKirim, 'PENDING'))
                .orderBy(desc(logNotifikasiPerubahan.idLog))
                .limit(limit);

              return {
                success: true,
                total: items.length,
                data: items,
              };
            },
            {
              query: t.Object({
                limit: t.Optional(t.String()),
              }),
            }
          )
          .post(
            '/:id/ack',
            async ({ params: { id }, body, set }) => {
              const status = (body as any)?.status || 'SENT';
              const [updated] = await db
                .update(logNotifikasiPerubahan)
                .set({
                  statusKirim: status,
                  sentAt: new Date(),
                })
                .where(eq(logNotifikasiPerubahan.idLog, id))
                .returning();

              if (!updated) {
                set.status = 404;
                return {
                  success: false,
                  message: `Notifikasi dengan ID ${id} tidak ditemukan`,
                };
              }

              return {
                success: true,
                message: `Notifikasi ID ${id} berhasil di-update menjadi ${status}`,
                data: updated,
              };
            },
            {
              params: t.Object({
                id: t.Numeric(),
              }),
              body: t.Optional(
                t.Object({
                  status: t.Optional(t.String()),
                })
              ),
            }
          )
      )
      .group('/cron', (cronGroup) =>
        cronGroup
          // Otorisasi wajib menggunakan CRON_SECRET
          .onBeforeHandle(({ request, set }) => {
            const secret = process.env.CRON_SECRET;
            if (!secret) {
              set.status = 500;
              return {
                success: false,
                error: 'ConfigurationError',
                message: 'CRON_SECRET belum disetel di environment variable server.',
              };
            }

            const url = new URL(request.url);
            const queryKey = url.searchParams.get('key');
            const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
            const xCronKey = request.headers.get('x-cron-key');

            if (queryKey !== secret && authHeader !== secret && xCronKey !== secret) {
              set.status = 401;
              return {
                success: false,
                error: 'Unauthorized',
                message: 'Kunci otorisasi cron (CRON_SECRET) tidak valid atau tidak disediakan.',
              };
            }
          })
          .get('/status', () => {
            return {
              success: true,
              data: getCronStatus(),
            };
          })
          .get('/sync-status', async () => {
            return await triggerStatusChangeSync('api_endpoint_get');
          })
          .post('/sync-status', async () => {
            return await triggerStatusChangeSync('api_endpoint_post');
          })
          .get('/sync-today', async () => {
            return await triggerSyncToday('api_endpoint_get');
          })
          .post('/sync-today', async () => {
            return await triggerSyncToday('api_endpoint_post');
          })
          .get('/sync-full', async ({ query }) => {
            const cleanDb = query?.clean === 'true';
            return await triggerSyncFull('api_endpoint_get', cleanDb);
          })
          .post('/sync-full', async ({ body }) => {
            const cleanDb = (body as any)?.clean === true;
            return await triggerSyncFull('api_endpoint_post', cleanDb);
          })
      )
  )
  .listen({
    port: PORT,
    hostname: HOST,
  });

log.success(`🚀 ElysiaJS server is running at http://${app.server?.hostname}:${app.server?.port}`);

// Jalankan background scheduler di dalam proses API Render
startCronScheduler();

export type App = typeof app;


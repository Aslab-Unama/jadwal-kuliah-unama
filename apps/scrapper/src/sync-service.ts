import { scrapeLabSchedulePage, getTodayDateWIB } from './scraper';
import { syncScheduleToDatabase, syncStatusChangesToDatabase } from './sync';
import { db, jadwalLab } from '@jadwal/db';

export interface ScrapeSyncOptions {
  isToday?: boolean;
  customDate?: string;
  ruang?: 'labor' | 'teori' | 'all' | '';
  cleanDb?: boolean;
  pageLimit?: number;
  onProgress?: (message: string) => void;
}

export interface ScrapeSyncResult {
  success: boolean;
  totalSynced: number;
  totalPages: number;
  totalClasses: number;
  durationSeconds: number;
  dateFilter: string;
  ruangFilter: string;
  error?: string;
}

export async function clearRedisCache(logFn: (msg: string) => void = console.log) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const endpoint = `${url.replace(/\/$/, '')}/del/jadwal:all_2026_ganjil`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        logFn('⚡ Upstash Redis cache (jadwal:all_2026_ganjil) berhasil dibersihkan via REST API!');
      }
    } catch (e: any) {
      console.warn('⚠️ Gagal membersihkan Upstash Redis via REST API:', e?.message);
    }
  }

  try {
    const apiPort = process.env.PORT || 3001;
    await fetch(`http://localhost:${apiPort}/api/cache/clear`, { method: 'POST' });
    logFn('⚡ Cache Redis jadwal berhasil dibersihkan via local API endpoint!');
  } catch {
    // Abaikan jika server API belum menyala
  }
}

export async function runScrapeSync(options: ScrapeSyncOptions = {}): Promise<ScrapeSyncResult> {
  const startTime = performance.now();
  const log = options.onProgress || console.log;

  const ruangFilter = options.ruang === 'labor' ? 'labor' : options.ruang === 'teori' ? 'teori' : '';
  const tanggalFilter = options.isToday ? getTodayDateWIB() : (options.customDate || '');

  const dateDescription = tanggalFilter
    ? `${tanggalFilter}${options.isToday ? ' (Hari Ini - WIB)' : ''}`
    : 'Semua Tanggal';

  const ruangDescription = ruangFilter === 'labor' ? 'Khusus Lab' : ruangFilter === 'teori' ? 'Khusus Teori' : 'Semua Kelas (Teori & Lab)';

  log(`🚀 Memulai BAAK UNAMA Schedule Scraper...`);
  log(`📌 Konfigurasi Scraping: Ruang: ${ruangDescription}, Tanggal: ${dateDescription}`);

  try {
    // 0. Sebelum sync umum menimpa data, sinkronkan status Cancel & Online terlebih dahulu
    // agar perubahan status (TM -> Cancel / Online) tercatat ke log_notifikasi_perubahan
    try {
      log('🔍 [Pre-Sync] Mendeteksi perubahan status terkini sebelum sync utama...');
      await runStatusChangeSync(log);
    } catch (statusPreSyncErr: any) {
      log(`⚠️ [Pre-Sync] Gagal menjalankan pre-status sync: ${statusPreSyncErr?.message || statusPreSyncErr}`);
    }

    if (options.cleanDb) {
      log('🗑️  Menghapus seluruh data jadwal lama dari database Supabase...');
      await db.delete(jadwalLab);
      log('✅ Data lama berhasil dikosongkan!');
    }

    // Ambil halaman pertama untuk mengetahui total halaman
    log('⏳ Memeriksa total halaman...');
    const firstPage = await scrapeLabSchedulePage(1, ruangFilter, tanggalFilter);
    const maxPages = options.pageLimit ? Math.min(options.pageLimit, firstPage.totalPages) : firstPage.totalPages;

    log(`📌 Terdeteksi total ${firstPage.totalPages} halaman (~${firstPage.totalClasses} kelas).`);

    if (firstPage.totalClasses === 0) {
      log('ℹ️ Tidak ada data jadwal yang perlu disinkronkan untuk kriteria ini.');
      await clearRedisCache(log);
      const durationSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      return {
        success: true,
        totalSynced: 0,
        totalPages: 0,
        totalClasses: 0,
        durationSeconds,
        dateFilter: tanggalFilter,
        ruangFilter,
      };
    }

    let totalSynced = 0;
    const BATCH_SIZE = 3;

    for (let i = 1; i <= maxPages; i += BATCH_SIZE) {
      const pageBatch: number[] = [];
      for (let p = i; p < i + BATCH_SIZE && p <= maxPages; p++) {
        pageBatch.push(p);
      }

      const results = await Promise.all(
        pageBatch.map(async (page) => {
          try {
            const pageData = page === 1 ? firstPage : await scrapeLabSchedulePage(page, ruangFilter, tanggalFilter);
            return { page, items: pageData.items, error: null };
          } catch (err: any) {
            return { page, items: [], error: err };
          }
        })
      );

      for (const res of results) {
        if (res.error) {
          console.error(`❌ Error di halaman ${res.page}:`, res.error);
        } else {
          const count = await syncScheduleToDatabase(res.items);
          totalSynced += count;
          log(`✅ Halaman ${res.page}/${maxPages}: sync ${count} baris.`);
        }
      }

      if (i + BATCH_SIZE <= maxPages) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    await clearRedisCache(log);

    const durationSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
    log(`🎉 Selesai! Total ${totalSynced} data jadwal berhasil disinkronkan (${durationSeconds}s).`);

    return {
      success: true,
      totalSynced,
      totalPages: maxPages,
      totalClasses: firstPage.totalClasses,
      durationSeconds,
      dateFilter: tanggalFilter,
      ruangFilter,
    };
  } catch (err: any) {
    const durationSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
    log(`❌ Error saat sync: ${err?.message || err}`);
    return {
      success: false,
      totalSynced: 0,
      totalPages: 0,
      totalClasses: 0,
      durationSeconds,
      dateFilter: tanggalFilter,
      ruangFilter,
      error: err?.message || String(err),
    };
  }
}

export interface StatusChangeSyncResult {
  success: boolean;
  totalCancelFound: number;
  totalOnlineFound: number;
  totalChangesDetected: number;
  updatedKelas: string[];
  durationSeconds: number;
  error?: string;
}

/**
 * Menjalankan sinkronisasi khusus kelas Cancel & Online (Targeted Status Sync)
 * Hanya mengambil ~2 halaman, waktu eksekusi < 1 detik.
 * Mencocokkan dengan data lokal untuk mendeteksi perubahan dari Tatap Muka ke Online/Cancel.
 */
export async function runStatusChangeSync(
  logFn: (msg: string) => void = console.log
): Promise<StatusChangeSyncResult> {
  const startTime = performance.now();
  logFn('🔍 [StatusSync] Memulai sinkronisasi perubahan status (Cancel & Online)...');

  try {
    // 1. Scrape kelas berstatus Cancel (1-2 halaman)
    const cancelPage = await scrapeLabSchedulePage(1, '', '', 'cancel');
    const cancelItems = [...cancelPage.items];
    if (cancelPage.totalPages > 1) {
      for (let p = 2; p <= cancelPage.totalPages; p++) {
        const nextP = await scrapeLabSchedulePage(p, '', '', 'cancel');
        cancelItems.push(...nextP.items);
      }
    }

    // 2. Scrape kelas berstatus Online (1-2 halaman)
    const onlinePage = await scrapeLabSchedulePage(1, '', '', 'online');
    const onlineItems = [...onlinePage.items];
    if (onlinePage.totalPages > 1) {
      for (let p = 2; p <= onlinePage.totalPages; p++) {
        const nextP = await scrapeLabSchedulePage(p, '', '', 'online');
        onlineItems.push(...nextP.items);
      }
    }

    const allItems = [...cancelItems, ...onlineItems];
    logFn(
      `📋 [StatusSync] Ditemukan ${cancelItems.length} kelas Cancel & ${onlineItems.length} kelas Online.`
    );

    // 3. Cocokkan dengan database dan catat perubahan jika sebelumnya Tatap Muka
    const summary = await syncStatusChangesToDatabase(allItems);

    if (summary.totalChangesDetected > 0) {
      logFn(
        `⚡ [StatusSync] Terdeteksi ${summary.totalChangesDetected} perubahan status baru: ${summary.updatedKelas.join(
          ', '
        )}`
      );
      await clearRedisCache(logFn);
    } else {
      logFn('ℹ️ [StatusSync] Tidak ada perubahan status baru yang terdeteksi.');
    }

    const durationSeconds = parseFloat(
      ((performance.now() - startTime) / 1000).toFixed(2)
    );
    return {
      success: true,
      totalCancelFound: cancelItems.length,
      totalOnlineFound: onlineItems.length,
      totalChangesDetected: summary.totalChangesDetected,
      updatedKelas: summary.updatedKelas,
      durationSeconds,
    };
  } catch (err: any) {
    const durationSeconds = parseFloat(
      ((performance.now() - startTime) / 1000).toFixed(2)
    );
    logFn(`❌ [StatusSync] Gagal: ${err?.message || err}`);
    return {
      success: false,
      totalCancelFound: 0,
      totalOnlineFound: 0,
      totalChangesDetected: 0,
      updatedKelas: [],
      durationSeconds,
      error: err?.message || String(err),
    };
  }
}


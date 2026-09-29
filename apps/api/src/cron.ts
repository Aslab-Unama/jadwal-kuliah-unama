import { runScrapeSync, type ScrapeSyncResult } from '@jadwal/scrapper';
import { invalidateAllJadwalCache } from './redis';
import { log } from './logger';

interface SyncHistoryEntry {
  timestamp: string;
  source: string;
  type: 'today' | 'full';
  success: boolean;
  totalSynced: number;
  durationSeconds: number;
  error?: string;
}

let isSyncing = false;
let lastSyncTime: string | null = null;
let lastSyncResult: ScrapeSyncResult | null = null;
const syncHistory: SyncHistoryEntry[] = [];

function recordHistory(entry: SyncHistoryEntry) {
  syncHistory.unshift(entry);
  if (syncHistory.length > 20) {
    syncHistory.pop();
  }
}

/**
 * Menjalankan sinkronisasi jadwal hari ini
 */
export async function triggerSyncToday(source = 'manual') {
  if (isSyncing) {
    log.warn(`⚠️ [Cron] Permintaan sync (${source}) diabaikan karena proses sync lain sedang berjalan.`);
    return {
      success: false,
      running: true,
      message: 'Proses sinkronisasi sedang berjalan. Silakan tunggu hingga selesai.',
      lastSyncTime,
    };
  }

  isSyncing = true;
  log.info(`🚀 [Cron] Memulai sinkronisasi jadwal HARI INI (Sumber: ${source})...`);

  try {
    const result = await runScrapeSync({
      isToday: true,
      ruang: 'all',
      onProgress: (msg) => log.info(`[ScraperToday] ${msg}`),
    });

    lastSyncTime = new Date().toISOString();
    lastSyncResult = result;

    recordHistory({
      timestamp: lastSyncTime,
      source,
      type: 'today',
      success: result.success,
      totalSynced: result.totalSynced,
      durationSeconds: result.durationSeconds,
      error: result.error,
    });

    if (result.success) {
      await invalidateAllJadwalCache();
      log.success(`✅ [Cron] Sync hari ini selesai! ${result.totalSynced} baris disinkronkan (${result.durationSeconds}s).`);
    } else {
      log.error(`❌ [Cron] Sync hari ini gagal: ${result.error}`);
    }

    return {
      success: result.success,
      running: false,
      result,
      timestamp: lastSyncTime,
    };
  } catch (err: any) {
    log.error(`❌ [Cron] Error tak terduga saat sync hari ini: ${err?.message || err}`);
    return {
      success: false,
      running: false,
      error: err?.message || String(err),
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Menjalankan sinkronisasi penuh seluruh semester
 */
export async function triggerSyncFull(source = 'manual', cleanDb = false) {
  if (isSyncing) {
    log.warn(`⚠️ [Cron] Permintaan full sync (${source}) diabaikan karena proses sync lain sedang berjalan.`);
    return {
      success: false,
      running: true,
      message: 'Proses sinkronisasi sedang berjalan. Silakan tunggu hingga selesai.',
      lastSyncTime,
    };
  }

  isSyncing = true;
  log.info(`🚀 [Cron] Memulai sinkronisasi PENUH seluruh semester (Sumber: ${source}, CleanDB: ${cleanDb})...`);

  try {
    const result = await runScrapeSync({
      isToday: false,
      ruang: 'all',
      cleanDb,
      onProgress: (msg) => log.info(`[ScraperFull] ${msg}`),
    });

    lastSyncTime = new Date().toISOString();
    lastSyncResult = result;

    recordHistory({
      timestamp: lastSyncTime,
      source,
      type: 'full',
      success: result.success,
      totalSynced: result.totalSynced,
      durationSeconds: result.durationSeconds,
      error: result.error,
    });

    if (result.success) {
      await invalidateAllJadwalCache();
      log.success(`✅ [Cron] Full sync selesai! ${result.totalSynced} baris disinkronkan (${result.durationSeconds}s).`);
    } else {
      log.error(`❌ [Cron] Full sync gagal: ${result.error}`);
    }

    return {
      success: result.success,
      running: false,
      result,
      timestamp: lastSyncTime,
    };
  } catch (err: any) {
    log.error(`❌ [Cron] Error tak terduga saat full sync: ${err?.message || err}`);
    return {
      success: false,
      running: false,
      error: err?.message || String(err),
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Mendapatkan status cron dan history terakhir
 */
export function getCronStatus() {
  return {
    isSyncing,
    lastSyncTime,
    lastSyncResult,
    recentHistory: syncHistory.slice(0, 10),
  };
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastMidnightRunDate = '';

/**
 * Menjalankan background cron scheduler di dalam process API
 * - Sinkronisasi jadwal hari ini: setiap 10 menit
 * - Sinkronisasi penuh: setiap pukul 00:00 WIB (tengah malam)
 */
export function startCronScheduler() {
  if (process.env.DISABLE_INTERNAL_CRON === 'true') {
    log.info('⏸️  Internal cron scheduler dinonaktifkan via DISABLE_INTERNAL_CRON=true');
    return;
  }

  if (schedulerTimer) {
    return;
  }

  log.info('⏰ Memulai internal cron scheduler (Sync Hari Ini tiap 10 menit & Full Sync tengah malam WIB)...');

  // Jalankan sync pertama kali saat server baru menyala setelah jeda 10 detik
  setTimeout(() => {
    triggerSyncToday('startup_init').catch((e) => log.error(`Startup sync error: ${e}`));
  }, 10_000);

  // Interval setiap 1 menit untuk mengecek jadwal
  let minuteCounter = 0;

  schedulerTimer = setInterval(async () => {
    minuteCounter++;

    const nowWib = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    // Format: "YYYY-MM-DD, HH:mm"
    const [datePart, timePart] = nowWib.split(', ');
    const hour = timePart ? parseInt(timePart.split(':')[0], 10) : -1;
    const minute = timePart ? parseInt(timePart.split(':')[1], 10) : -1;

    // 1. Cek Full Sync Tengah Malam WIB (Pukul 00:00 - 00:05 WIB)
    if (hour === 0 && minute <= 5 && lastMidnightRunDate !== datePart) {
      lastMidnightRunDate = datePart;
      log.info(`🌙 Waktu menunjukkan tengah malam WIB (${nowWib}). Menjalankan Full Sync Harian...`);
      await triggerSyncFull('midnight_scheduler');
      return;
    }

    // 2. Cek Sync Hari Ini Setiap 10 Menit
    if (minuteCounter >= 10) {
      minuteCounter = 0;
      log.info(`⏱️  Timer 10 menit tercapai (${nowWib}). Menjalankan Sync Jadwal Hari Ini...`);
      await triggerSyncToday('interval_10m_scheduler');
    }
  }, 60_000);
}

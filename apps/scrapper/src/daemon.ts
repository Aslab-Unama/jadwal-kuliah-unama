import { runScrapeSync, runStatusChangeSync } from './sync-service';

function getWibTime(): { dateStr: string; hour: number; minute: number; fullDisplay: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.format(new Date()).split(', ');
  const dateStr = parts[0];
  const timeStr = parts[1] || '00:00:00';
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));

  return {
    dateStr,
    hour: h ?? -1,
    minute: m ?? -1,
    fullDisplay: `${dateStr} ${timeStr} WIB`,
  };
}

function log(msg: string) {
  console.log(msg);
}

async function startDaemon() {
  console.log('='.repeat(70));
  console.log('🚀 UNAMA Jadwal Scraper Daemon (Lab Worker)');
  console.log('📌 Berjalan di jaringan internal Lab UNAMA');
  console.log('⏱️  Interval: Status Sync (5m), Sync Hari Ini (10m), Full Sync (00:00 WIB)');
  console.log('='.repeat(70) + '\n');

  let isSyncing = false;
  let lastMidnightRunDate = '';
  let minuteCounter = 0;

  async function performStatusSync(source: string) {
    if (isSyncing) return;
    isSyncing = true;
    try {
      log(`🔍 [StatusSync - ${source}] Mengecek perubahan status kelas (Cancel/Online)...`);
      const res = await runStatusChangeSync((m) => log(`  ${m}`));
      log(`✅ [StatusSync] Selesai dalam ${res.durationSeconds}s. Perubahan terdeteksi: ${res.totalChangesDetected}`);
    } catch (err: any) {
      log(`❌ [StatusSync] Error: ${err?.message || err}`);
    } finally {
      isSyncing = false;
    }
  }

  async function performTodaySync(source: string) {
    if (isSyncing) return;
    isSyncing = true;
    try {
      log(`🚀 [TodaySync - ${source}] Menyinkronkan jadwal hari ini ke Supabase...`);
      const res = await runScrapeSync({
        isToday: true,
        ruang: 'all',
        onProgress: (m) => log(`  ${m}`),
      });
      if (res.success) {
        log(`✅ [TodaySync] Sukses! ${res.totalSynced} jadwal disinkronkan (${res.durationSeconds}s).`);
      } else {
        log(`❌ [TodaySync] Gagal: ${res.error}`);
      }
    } catch (err: any) {
      log(`❌ [TodaySync] Error: ${err?.message || err}`);
    } finally {
      isSyncing = false;
    }
  }

  async function performFullSync(source: string) {
    if (isSyncing) return;
    isSyncing = true;
    try {
      log(`🌙 [FullSync - ${source}] Menjalankan Full Sync seluruh jadwal semester...`);
      const res = await runScrapeSync({
        isToday: false,
        ruang: 'all',
        cleanDb: false,
        onProgress: (m) => log(`  ${m}`),
      });
      if (res.success) {
        log(`✅ [FullSync] Sukses! Total ${res.totalSynced} jadwal ter-update (${res.durationSeconds}s).`);
      } else {
        log(`❌ [FullSync] Gagal: ${res.error}`);
      }
    } catch (err: any) {
      log(`❌ [FullSync] Error: ${err?.message || err}`);
    } finally {
      isSyncing = false;
    }
  }

  // 1. Jalankan sinkronisasi awal saat daemon baru menyala
  log('⚡ Menjalankan sinkronisasi inisial pertama...');
  await performStatusSync('startup');
  await performTodaySync('startup');

  // 2. Loop interval setiap 1 menit
  setInterval(async () => {
    minuteCounter++;
    const { dateStr, hour, minute } = getWibTime();

    // Full Sync tengah malam WIB (Pukul 00:00 - 00:05 WIB)
    if (hour === 0 && minute <= 5 && lastMidnightRunDate !== dateStr) {
      lastMidnightRunDate = dateStr;
      await performFullSync('midnight_scheduler');
      return;
    }

    // Status sync setiap 5 menit
    if (minuteCounter % 5 === 0) {
      await performStatusSync('interval_5m');
    }

    // Today sync setiap 10 menit
    if (minuteCounter >= 10) {
      minuteCounter = 0;
      await performTodaySync('interval_10m');
    }
  }, 60_000);
}

startDaemon().catch((e) => {
  console.error('Fatal Daemon Error:', e);
  process.exit(1);
});
